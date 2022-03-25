package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/netobserv/network-observability-console-plugin/pkg/httpclient"
	"github.com/netobserv/network-observability-console-plugin/pkg/loki"
	"github.com/netobserv/network-observability-console-plugin/pkg/model"
)

const (
	startTimeKey = "startTime"
	endTimeKey   = "endTime"
	timeRangeKey = "timeRange"
	limitKey     = "limit"
	reporterKey  = "reporter"
	filtersKey   = "filters"
)

type errorWithCode struct {
	err  error
	code int
}

// Example of raw filters (url-encoded):
// foo=a,b&bar=c|baz=d
func parseFilters(raw string) ([]map[string]string, error) {
	var parsed []map[string]string
	decoded, err := url.QueryUnescape(raw)
	if err != nil {
		return nil, err
	}
	groups := strings.Split(decoded, "|")
	for _, group := range groups {
		m := make(map[string]string)
		parsed = append(parsed, m)
		filters := strings.Split(group, "&")
		for _, filter := range filters {
			pair := strings.Split(filter, "=")
			if len(pair) == 2 {
				m[pair[0]] = pair[1]
			}
		}
	}
	return parsed, nil
}

func getStartTime(params url.Values) (string, error) {
	start := params.Get(startTimeKey)
	if len(start) == 0 {
		tr := params.Get(timeRangeKey)
		if len(tr) > 0 {
			r, err := strconv.ParseInt(tr, 10, 64)
			if err != nil {
				return "", errors.New("Could not parse time range: " + err.Error())
			}
			start = strconv.FormatInt(time.Now().Unix()-r, 10)
		}
	}
	return start, nil
}

func GetFlows2(cfg loki.Config) func(w http.ResponseWriter, r *http.Request) {
	lokiClient := newLokiClient(&cfg)

	return func(w http.ResponseWriter, r *http.Request) {
		params := r.URL.Query()

		flows, code, err := getFlows(cfg, lokiClient, params)
		if err != nil {
			writeError(w, code, err.Error())
			return
		}

		writeRawJSON(w, http.StatusOK, flows)
	}
}

func getFlows(cfg loki.Config, client httpclient.HTTPClient, params url.Values) ([]byte, int, error) {
	hlog.Debugf("getFlows query params: %s", params)

	start, err := getStartTime(params)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	end := params.Get(endTimeKey)
	limit := params.Get(limitKey)
	reporter := params.Get(reporterKey)
	rawFilters := params.Get(filtersKey)
	filterGroups, err := parseFilters(rawFilters)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	var rawJSON []byte
	if len(filterGroups) > 1 {
		// match any, and multiple filters => run in parallel then aggregate
		res, code, err := fetchParallel(&cfg, client, filterGroups, start, end, limit, reporter)
		if err != nil {
			return nil, code, errors.New("Error while fetching flows from Loki: " + err.Error())
		}
		rawJSON = res
	} else {
		// else, run all at once
		qb := loki.NewFlowQueryBuilder(&cfg, start, end, limit, reporter)
		if len(filterGroups) > 0 {
			err := qb.Filters(filterGroups[0])
			if err != nil {
				return nil, http.StatusBadRequest, err
			}
		}
		query := qb.Build()
		resp, code, err := fetchSingle(query, client)
		if err != nil {
			return nil, code, errors.New("Error while fetching flows from Loki: " + err.Error())
		}
		rawJSON = resp
	}

	hlog.Tracef("GetFlows raw response: %v", rawJSON)
	return rawJSON, http.StatusOK, nil
}

func fetchParallel(cfg *loki.Config, lokiClient httpclient.HTTPClient, groupedFilters []map[string]string, start, end, limit, reporter string) ([]byte, int, error) {
	// Run queries in parallel, then aggregate them
	resChan := make(chan model.QueryResponse, len(groupedFilters))
	errChan := make(chan errorWithCode, len(groupedFilters))
	var wg sync.WaitGroup
	wg.Add(len(groupedFilters))

	for _, group := range groupedFilters {
		go func(filters map[string]string) {
			defer wg.Done()
			qb := loki.NewFlowQueryBuilder(cfg, start, end, limit, reporter)
			err := qb.Filters(filters)
			if err != nil {
				errChan <- errorWithCode{err: err, code: http.StatusBadRequest}
				return
			}
			query := qb.Build()
			resp, code, err := fetchSingle(query, lokiClient)
			if err != nil {
				errChan <- errorWithCode{err: err, code: code}
			} else {
				var qr model.QueryResponse
				err := json.Unmarshal(resp, &qr)
				if err != nil {
					errChan <- errorWithCode{err: err, code: http.StatusInternalServerError}
				} else {
					resChan <- qr
				}
			}
		}(group)
	}

	wg.Wait()
	close(resChan)
	close(errChan)

	for errWithCode := range errChan {
		return nil, errWithCode.code, errWithCode.err
	}

	// Aggregate results
	var aggregated model.QueryResponse
	var aggStreams model.Streams
	for r := range resChan {
		if streams, ok := r.Data.Result.(model.Streams); ok {
			if len(aggStreams) == 0 {
				aggStreams = streams
				aggregated = r
			} else {
				aggStreams = append(aggStreams, streams...)
				aggregated.Data.Result = aggStreams
			}
		} else {
			return nil, http.StatusInternalServerError, fmt.Errorf("loki returned an unexpected type: %T", r.Data.Result)
		}
	}

	// Encode back to json
	encoded, err := json.Marshal(aggregated)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	return encoded, http.StatusOK, nil
}

func fetchSingle(query string, lokiClient httpclient.HTTPClient) ([]byte, int, error) {
	hlog.Debugf("GetFlows query: %s", query)
	resp, code, err := lokiClient.Get(query)
	if err != nil {
		return nil, http.StatusServiceUnavailable, err
	}
	if code != http.StatusOK {
		msg := getLokiError(resp, code)
		return nil, http.StatusBadRequest, errors.New("Loki backend responded: " + msg)
	}
	return resp, http.StatusOK, nil
}
