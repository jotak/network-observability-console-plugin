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
	"github.com/netobserv/network-observability-console-plugin/pkg/model/fields"
	"github.com/netobserv/network-observability-console-plugin/pkg/utils"
)

const (
	startTimeKey     = "startTime"
	endTimeKey       = "endTime"
	timeRangeKey     = "timeRange"
	limitKey         = "limit"
	matchKey         = "match"
	reporterKey      = "reporter"
	filtersKey       = "filters"
	anyMatchValue    = "any"
	exportFormatKey  = "format"
	exportcolumnsKey = "columns"
)

type errorWithCode struct {
	err  error
	code int
}

// Example of raw filters:
// &filters=foo=a,b;bar=c
func parseFilters(raw string) map[string]string {
	parsed := make(map[string]string)
	list := strings.Split(raw, ";")
	for _, filter := range list {
		pair := strings.Split(filter, "=")
		if len(pair) == 2 {
			parsed[pair[0]] = pair[1]
		}
	}
	return parsed
}

// groupFilters creates groups of filters for fetching strategy, that depends on the match all/any param
//	Filters in the same group are fetched in a single query
//	Each group is fetched via its own query
func groupFilters(cfg *loki.Config, filters map[string]string, matchAny bool) ([]map[string]string, error) {
	var groups []map[string]string
	if matchAny {
		// Every filter is a group and will be fetched independently
		for k, v := range filters {
			// Check for grouped K8S Resource fields (kind.namespace.name)
			if fields.IsK8SResourcePath(k) {
				// Although we are in "match any", kind/namespace/name filters have to be in a single group
				//	or two different groups if there's Src+Dst
				pathGroup1, pathGroup2, err := expandK8SResourcePath(k, v)
				if err != nil {
					return nil, err
				}
				groups = append(groups, pathGroup1)
				if pathGroup2 != nil {
					groups = append(groups, pathGroup2)
				}
				continue
			}

			// Check if this is a common filter Src+Dst that must be expanded in two filters
			srcKey, dstKey := fields.ToSrcDst(k)
			if cfg.IsLabel(srcKey) || cfg.IsLabel(dstKey) {
				// Add them as separate filters (note: line filters support standing as a single/common filter)
				groups = append(groups, map[string]string{srcKey: v})
				groups = append(groups, map[string]string{dstKey: v})
			} else {
				groups = append(groups, map[string]string{k: v})
			}
		}
	} else {
		// Match all => most filters are fetched in a single query, except when there's common Src+Dst filters
		group1 := make(map[string]string)
		group2 := make(map[string]string)
		needSrcDstSplit := false
		for k, v := range filters {
			// Check for grouped K8S Resource fields (kind.namespace.name)
			if fields.IsK8SResourcePath(k) {
				pathGroup1, pathGroup2, err := expandK8SResourcePath(k, v)
				if err != nil {
					return nil, err
				}
				if pathGroup2 == nil {
					// Merge pathGroup1 into both group1 (src) and group2 (dst)
					utils.MergeMaps(group1, pathGroup1)
					utils.MergeMaps(group2, pathGroup1)
				} else {
					// Merge first into group1 (src), second into group2 (dst)
					utils.MergeMaps(group1, pathGroup1)
					utils.MergeMaps(group2, pathGroup2)
					needSrcDstSplit = true
				}
				continue
			}
			// Check if this is a common filter Src+Dst that must be expanded in two filters
			srcKey, dstKey := fields.ToSrcDst(k)
			if cfg.IsLabel(srcKey) || cfg.IsLabel(dstKey) {
				// Add them as separate filters (note: line filters support standing as a single/common filter)
				group1[srcKey] = v
				group2[dstKey] = v
				needSrcDstSplit = true
			} else {
				group1[k] = v
				group2[k] = v
			}
		}
		if needSrcDstSplit {
			groups = []map[string]string{group1, group2}
		} else {
			// Simplest case, no split => just return the src filters (it's actually identical to dst filters)
			groups = []map[string]string{group1}
		}
	}
	return groups, nil
}

// Expand K8SResourcePath "Kind.Namespace.ObjectName" into three filters,
// either in a single group or in two groups Src+Dst
func expandK8SResourcePath(key, value string) (map[string]string, map[string]string, error) {
	prefix := fields.GetPrefix(key)
	// Expected value is Kind.Namespace.ObjectName
	parts := strings.Split(value, ".")
	if len(parts) != 3 {
		return nil, nil, fmt.Errorf("invalid resource path: %s=%s", key, value)
	}
	kind := parts[0]
	ns := parts[1]
	name := parts[2]
	if prefix == "" {
		groupSrc := createResourcePathFilter(key, fields.Src, kind, ns, name)
		groupDst := createResourcePathFilter(key, fields.Dst, kind, ns, name)
		return groupSrc, groupDst, nil
	}
	return createResourcePathFilter(key, prefix, kind, ns, name), nil, nil
}

func createResourcePathFilter(key, prefix, kind, ns, name string) map[string]string {
	if strings.Contains(key, "Owner") {
		return map[string]string{
			prefix + fields.OwnerType: exact(kind),
			prefix + fields.Namespace: exact(ns),
			prefix + fields.OwnerName: exact(name),
		}
	}
	return map[string]string{
		prefix + fields.Type:      exact(kind),
		prefix + fields.Namespace: exact(ns),
		prefix + fields.Name:      exact(name),
	}
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

func ExportFlows(cfg loki.Config) func(w http.ResponseWriter, r *http.Request) {
	lokiClient := newLokiClient(&cfg)

	return func(w http.ResponseWriter, r *http.Request) {
		params := r.URL.Query()

		flows, code, err := getFlows(cfg, lokiClient, params)
		if err != nil {
			writeError(w, code, err.Error())
			return
		}

		exportFormat := params.Get(exportFormatKey)
		exportColumns := strings.Split(params.Get(exportcolumnsKey), ",")

		switch exportFormat {
		case exportCSVFormat:
			writeCSV(w, http.StatusOK, flows, exportColumns)
		default:
			writeError(w, http.StatusBadRequest, fmt.Sprintf("export format %q is not valid", exportFormat))
		}
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
	matchAny := params.Get(matchKey) == anyMatchValue
	reporter := params.Get(reporterKey)
	rawFilters := params.Get(filtersKey)
	filters := parseFilters(rawFilters)
	grouped, err := groupFilters(&cfg, filters, matchAny)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	var rawJSON []byte
	if len(grouped) > 1 {
		// match any, and multiple filters => run in parallel then aggregate
		res, code, err := fetchParallel(&cfg, client, grouped, start, end, limit, reporter)
		if err != nil {
			return nil, code, errors.New("Error while fetching flows from Loki: " + err.Error())
		}
		rawJSON = res
	} else {
		// else, run all at once
		qb := loki.NewFlowQueryBuilder(&cfg, start, end, limit, reporter)
		if len(grouped) > 0 {
			err := qb.Filters(grouped[0])
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
