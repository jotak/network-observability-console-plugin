package handler

import (
	"net/url"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/netobserv/network-observability-console-plugin/pkg/loki"
)

func getConfig() loki.Config {
	lokiURL, _ := url.Parse("/")
	return loki.NewConfig(
		lokiURL,
		time.Second,
		"",
		[]string{"SrcK8S_Namespace", "SrcK8S_OwnerName", "DstK8S_Namespace", "DstK8S_OwnerName", "FlowDirection"},
	)
}

func TestGroupK8SFilters(t *testing.T) {
	config := getConfig()

	// Test match all
	groups, err := groupFilters(&config, map[string]string{
		"SrcK8S_Object": "Pod.default.test",
		"Port":          "8080",
	}, false)
	require.NoError(t, err)

	assert.Len(t, groups, 1)
	assert.Equal(t, map[string]string{
		"SrcK8S_Name":      `"test"`,
		"SrcK8S_Namespace": `"default"`,
		"SrcK8S_Type":      `"Pod"`,
		"Port":             "8080",
	}, groups[0])

	// Test match any
	groups, err = groupFilters(&config, map[string]string{
		"SrcK8S_Object": "Pod.default.test",
		"Port":          "8080",
	}, true)
	require.NoError(t, err)

	assert.Len(t, groups, 2)
	assert.Equal(t, map[string]string{
		"SrcK8S_Name":      `"test"`,
		"SrcK8S_Namespace": `"default"`,
		"SrcK8S_Type":      `"Pod"`,
	}, groups[0])
	assert.Equal(t, map[string]string{
		"Port": "8080",
	}, groups[1])

	// Test Src+Dst match all
	groups, err = groupFilters(&config, map[string]string{
		"K8S_Object": "Pod.default.test",
		"Port":       "8080",
	}, false)
	require.NoError(t, err)

	assert.Len(t, groups, 2)
	assert.Equal(t, map[string]string{
		"SrcK8S_Name":      `"test"`,
		"SrcK8S_Namespace": `"default"`,
		"SrcK8S_Type":      `"Pod"`,
		"Port":             "8080",
	}, groups[0])
	assert.Equal(t, map[string]string{
		"DstK8S_Name":      `"test"`,
		"DstK8S_Namespace": `"default"`,
		"DstK8S_Type":      `"Pod"`,
		"Port":             "8080",
	}, groups[1])

	// Test Src+Dst match any
	groups, err = groupFilters(&config, map[string]string{
		"K8S_Object": "Pod.default.test",
		"Port":       "8080",
	}, true)
	require.NoError(t, err)

	assert.Len(t, groups, 3)
	assert.Equal(t, map[string]string{
		"SrcK8S_Name":      `"test"`,
		"SrcK8S_Namespace": `"default"`,
		"SrcK8S_Type":      `"Pod"`,
	}, groups[0])
	assert.Equal(t, map[string]string{
		"DstK8S_Name":      `"test"`,
		"DstK8S_Namespace": `"default"`,
		"DstK8S_Type":      `"Pod"`,
	}, groups[1])
	assert.Equal(t, map[string]string{
		"Port": "8080",
	}, groups[2])
}
