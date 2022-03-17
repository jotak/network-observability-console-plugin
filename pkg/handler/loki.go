package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"

	"github.com/netobserv/network-observability-console-plugin/pkg/httpclient"
	"github.com/netobserv/network-observability-console-plugin/pkg/loki"
	"github.com/netobserv/network-observability-console-plugin/pkg/model"
	"github.com/netobserv/network-observability-console-plugin/pkg/utils"
)

var hlog = logrus.WithField("module", "handler")

const (
	exportCSVFormat = "csv"
	lokiOrgIDHeader = "X-Scope-OrgID"
)

type LokiConfig struct {
	URL      *url.URL
	Timeout  time.Duration
	TenantID string
	Labels   []string
}

func newLokiClient(cfg *LokiConfig) httpclient.HTTPClient {
	var headers map[string][]string
	if cfg.TenantID != "" {
		headers = map[string][]string{
			lokiOrgIDHeader: {cfg.TenantID},
		}
	}
	// TODO: loki with auth
	return httpclient.NewHTTPClient(cfg.Timeout, headers)
}

func GetFlows(cfg LokiConfig, allowExport bool) func(w http.ResponseWriter, r *http.Request) {
	lokiClient := newLokiClient(&cfg)

	// TODO: improve search mecanism:
	// - better way to make difference between labels and values
	// - don't always use regex (port number for example)
	// - manage range (check RANGE_SPLIT_CHAR on front side)
	return func(w http.ResponseWriter, r *http.Request) {
		params := r.URL.Query()
		hlog.Debugf("GetFlows query params: %s", params)

		//allow export only on specific endpoints
		queryBuilder := loki.NewQuery(cfg.URL.String(), cfg.Labels, allowExport)
		if err := queryBuilder.AddParams(params); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, code, err := executeFlowQuery(queryBuilder, lokiClient)
		if err != nil {
			writeError(w, code, "Loki query failed: "+err.Error())
			return
		}

		hlog.Tracef("GetFlows raw response: %s", resp)
		if allowExport {
			switch f := queryBuilder.ExportFormat(); f {
			case exportCSVFormat:
				writeCSV(w, http.StatusOK, resp, queryBuilder.ExportColumns())
			default:
				writeError(w, http.StatusServiceUnavailable,
					fmt.Sprintf("export format %q is not valid", f))
			}
		} else {
			writeRawJSON(w, http.StatusOK, resp)
		}
	}
}

func GetNamespaces(cfg LokiConfig) func(w http.ResponseWriter, r *http.Request) {
	lokiClient := newLokiClient(&cfg)
	return func(w http.ResponseWriter, r *http.Request) {
		// Fetch and merge values for SrcK8S_Namespace and DstK8S_Namespace
		values, code, err := getLabelValues(&cfg, lokiClient, "SrcK8S_Namespace")
		if err != nil {
			writeError(w, code, "Error while fetching label 'SrcK8S_Namespace' values from Loki: "+err.Error())
			return
		}
		vMap := utils.GetMapInterface(values)

		values, code, err = getLabelValues(&cfg, lokiClient, "DstK8S_Namespace")
		if err != nil {
			writeError(w, code, "Error while fetching label 'DstK8S_Namespace' values from Loki: "+err.Error())
			return
		}
		utils.AddToMapInterface(vMap, values)

		// Put merged values back into a response object
		var resp []string
		for v := range vMap {
			resp = append(resp, v)
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func getLabelValues(cfg *LokiConfig, lokiClient httpclient.HTTPClient, label string) ([]string, int, error) {
	baseURL := strings.TrimRight(cfg.URL.String(), "/")
	url := fmt.Sprintf("%s/loki/api/v1/label/%s/values", baseURL, label)
	hlog.Debugf("getLabelValues URL: %s", url)

	resp, code, err := lokiClient.Get(url)
	if err != nil {
		return nil, http.StatusServiceUnavailable, err
	}
	if code != http.StatusOK {
		msg := getLokiError(resp, code)
		return nil, http.StatusBadRequest, errors.New(msg)
	}
	hlog.Tracef("GetFlows raw response: %s", resp)
	var lvr model.LabelValuesResponse
	err = json.Unmarshal(resp, &lvr)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	return lvr.Data, http.StatusOK, nil
}

func getLokiError(resp []byte, code int) string {
	var f map[string]string
	err := json.Unmarshal(resp, &f)
	if err != nil {
		return fmt.Sprintf("Unknown error from Loki - cannot unmarshal (code: %d resp: %s)", code, resp)
	}
	message, ok := f["message"]
	if !ok {
		return fmt.Sprintf("Unknown error from Loki - no message found (code: %d)", code)
	}
	return fmt.Sprintf("Error from Loki (code: %d): %s", code, message)
}

func exact(str string) string {
	return fmt.Sprintf(`"%s"`, str)
}

func GetNames(cfg LokiConfig) func(w http.ResponseWriter, r *http.Request) {
	lokiClient := newLokiClient(&cfg)
	return func(w http.ResponseWriter, r *http.Request) {
		params := mux.Vars(r)
		namespace := params["namespace"]
		kind := params["kind"]
		nameMatch := params["nameMatch"]

		lokiParams := map[string][]string{
			"K8S_Namespace": {exact(namespace)},
		}
		var fieldsToExtract []string
		if utils.IsOwnerKind(kind) {
			lokiParams["K8S_OwnerType"] = []string{exact(kind)}
			if len(nameMatch) > 0 {
				lokiParams["K8S_OwnerName"] = []string{nameMatch}
			}
			fieldsToExtract = []string{"SrcK8S_OwnerName", "DstK8S_OwnerName"}
		} else {
			lokiParams["K8S_Type"] = []string{exact(kind)}
			if len(nameMatch) > 0 {
				lokiParams["K8S_Name"] = []string{nameMatch}
			}
			fieldsToExtract = []string{"SrcK8S_Name", "DstK8S_Name"}
		}

		queryBuilder := loki.NewQuery(cfg.URL.String(), cfg.Labels, false)
		if err := queryBuilder.AddParams(lokiParams); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, code, err := executeFlowQuery(queryBuilder, lokiClient)
		if err != nil {
			writeError(w, code, "Loki query failed: "+err.Error())
			return
		}
		hlog.Tracef("GetNames raw response: %s", resp)

		var qr model.QueryResponse
		err = json.Unmarshal(resp, &qr)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to unmarshal Loki response: "+err.Error())
			return
		}

		streams, ok := qr.Data.Result.(model.Streams)
		if !ok {
			writeError(w, http.StatusInternalServerError, "Loki returned unexpected type: "+string(qr.Data.ResultType))
			return
		}

		values := extractDistinctValues(fieldsToExtract, streams)
		writeJSON(w, http.StatusOK, values)
	}
}

func executeFlowQuery(queryBuilder *loki.Query, lokiClient httpclient.HTTPClient) ([]byte, int, error) {
	queryBuilder, err := queryBuilder.PrepareToSubmit()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	flowsURL, err := queryBuilder.URLQuery()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	hlog.Debugf("GetFlows URL: %s", flowsURL)

	resp, code, err := lokiClient.Get(flowsURL)
	if err != nil {
		return nil, http.StatusServiceUnavailable, err
	}
	if code != http.StatusOK {
		msg := getLokiError(resp, code)
		return nil, http.StatusBadRequest, errors.New("Loki backend responded: " + msg)
	}
	return resp, http.StatusOK, nil
}

func extractDistinctValues(fields []string, streams model.Streams) []string {
	values := map[string]interface{}{}
	for _, field := range fields {
		extractDistinctValuesFromField(field, streams, values)
	}
	var resp []string
	for v := range values {
		resp = append(resp, v)
	}
	return resp
}

func extractDistinctValuesFromField(field string, streams model.Streams, values map[string]interface{}) {
	for _, stream := range streams {
		if v, ok := stream.Labels[field]; ok {
			if len(v) > 0 {
				values[v] = nil
			}
		} else {
			for _, entry := range stream.Entries {
				var line map[string]interface{}
				err := json.Unmarshal([]byte(entry.Line), &line)
				if err != nil {
					hlog.Errorf("Could not unmarshal line: %v. Error was: %v", entry.Line, err.Error())
					continue
				}
				if v, ok := line[field]; ok {
					if str, ok := v.(string); ok && len(str) > 0 {
						values[str] = nil
					}
				}
			}
		}
	}
}
