import axios from 'axios';
import { buildExportQuery } from '../model/export-query';
import { FlowQuery } from '../model/flow-query';
import { Record } from './ipfix';
import { calculateMatrixTotals, parseStream, StreamResult, TopologyMetrics } from './loki';

const host = '/api/proxy/plugin/network-observability-plugin/backend/';

export const getFlows = (params: FlowQuery): Promise<Record[]> => {
  return axios.get(host + '/api/loki/flows', { params }).then(r => {
    if (r.status >= 400) {
      throw new Error(`${r.statusText} [code=${r.status}]`);
    }
    return (r.data.data.result as StreamResult[]).flatMap(r => parseStream(r));
  });
};

export const getExportFlowsURL = (params: FlowQuery, columns?: string[]): string => {
  // TODO not using axios? params.toString won't work here
  const exportQuery = buildExportQuery(params, columns);
  return `${host}api/loki/export?${exportQuery.toString()}`;
};

export const getNamespaces = (): Promise<string[]> => {
  return axios.get(host + '/api/resources/namespaces').then(r => {
    if (r.status >= 400) {
      throw new Error(`${r.statusText} [code=${r.status}]`);
    }
    return r.data;
  });
};

export const getResources = (namespace: string, kind: string): Promise<string[]> => {
  return axios.get(`${host}/api/resources/namespace/${namespace}/kind/${kind}/names`).then(r => {
    if (r.status >= 400) {
      throw new Error(`${r.statusText} [code=${r.status}]`);
    }
    return r.data;
  });
};

export const getTopology = (params: FlowQuery): Promise<TopologyMetrics[]> => {
  return axios.get(host + '/api/loki/topology', { params }).then(r => {
    if (r.status >= 400) {
      throw new Error(`${r.statusText} [code=${r.status}]`);
    }
    return (r.data.data.result as TopologyMetrics[]).flatMap(r => calculateMatrixTotals(r));
  });
};
