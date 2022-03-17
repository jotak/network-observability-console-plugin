import * as _ from 'lodash';
import protocols from 'protocol-numbers';
import { getPort } from 'port-numbers';
import { ColumnsId } from './columns';
import { getProtectedService } from './port';
import { autoCompleteCache } from './autocomplete-cache';

export enum FilterType {
  NONE,
  ADDRESS_PORT,
  ADDRESS,
  PORT,
  PROTOCOL,
  NUMBER,
  K8S_NAMES,
  CANONICAL_PATH,
  NAMESPACE,
  KIND
}

export interface FilterValue {
  v: string;
  display?: string;
}

export interface Filter {
  colId: ColumnsId;
  values: FilterValue[];
}

export interface FilterOption {
  name: string;
  value: string;
}

export const toFilterOption = (name: string): FilterOption => {
  return { name, value: name };
};

export const getActiveColumnFilters = (columnId: ColumnsId, filters: Filter[]) => {
  return filters.filter(f => f.colId === columnId).flatMap(f => f.values.map(v => v.v));
};

const protocolOptions: FilterOption[] = Object.values(protocols)
  .map(proto => ({ name: proto.name, value: proto.value }))
  .filter(proto => !_.isEmpty(proto.name))
  .filter(proto => Number(proto.value) < 1024);
_.orderBy(protocolOptions, 'name');

const getProtocolOptions = (value: string) => {
  return protocolOptions.filter(
    opt => opt.value.startsWith(value) || opt.name.toLowerCase().startsWith(value.toLowerCase())
  );
};

export const getNamespaceOptions = (value: string): FilterOption[] => {
  const options = autoCompleteCache.getNamespaces().map(toFilterOption);
  if (value) {
    return options.filter(n => n.name.toLowerCase().startsWith(value.toLowerCase()));
  } else {
    return options;
  }
};

export const getKindOptions = (value: string): FilterOption[] => {
  const options = autoCompleteCache.getKinds().map(toFilterOption);
  if (value) {
    return options.filter(n => n.name.toLowerCase().startsWith(value.toLowerCase()));
  } else {
    return options;
  }
};

type SplitCanonicalPath = { kind: string; namespace: string; name: string };

export const splitCanonicalPath = (path: string): SplitCanonicalPath => {
  const parts = path.split('.');
  if (parts.length === 1) {
    return { kind: parts[0], namespace: '', name: '' };
  } else if (parts.length === 2) {
    return { kind: parts[0], namespace: parts[1], name: '' };
  }
  return { kind: parts[0], namespace: parts[1], name: parts[2] };
};

export const getCanonicalPathOptions = (filterValue: string) => {
  const parts = splitCanonicalPath(filterValue);
  if (!parts.name && !parts.namespace) {
    // show kinds
    return getKindOptions(parts.kind);
  } else if (!parts.name) {
    // show namespaces
    return getNamespaceOptions(parts.namespace);
  }
  // show names
  const options = (autoCompleteCache.getNames(parts.kind, parts.namespace) || []).map(toFilterOption);
  if (parts.name) {
    return options.filter(n => n.name.toLowerCase().startsWith(parts.name.toLowerCase()));
  } else {
    return options;
  }
};

const getPortOptions = (value: string) => {
  const isNumber = !isNaN(Number(value));
  const foundService = isNumber ? getProtectedService(Number(value)) : null;
  const foundPort = !isNumber ? getPort(value) : null;
  if (foundService) {
    return [{ name: foundService.name, value: value }];
  } else if (foundPort) {
    return [{ name: value, value: foundPort.port.toString() }];
  }
  return [];
};

const filterOptions: Map<FilterType, (value: string) => FilterOption[]> = new Map([
  [FilterType.PROTOCOL, getProtocolOptions],
  [FilterType.PORT, getPortOptions],
  [FilterType.CANONICAL_PATH, getCanonicalPathOptions],
  [FilterType.KIND, getKindOptions],
  [FilterType.NAMESPACE, getNamespaceOptions]
]);

export const getFilterOptions = (type: FilterType, value: string, max = 10) => {
  if (filterOptions.has(type)) {
    let options = filterOptions.get(type)!(value);
    if (options.length > max) {
      options = options.slice(0, max);
    }
    return options;
  }
  return [];
};

export const createFilterValue = (type: FilterType, value: string): FilterValue => {
  if (filterOptions.has(type)) {
    const option = filterOptions.get(type)!(value).find(p => p.name === value || p.value === value);
    if (option) {
      return {
        v: option.value,
        display: option.name
      };
    } else {
      console.warn('filter not found', type, value);
    }
  }
  return { v: value };
};

export const findProtocolOption = (nameOrVal: string) => {
  return protocolOptions.find(p => p.name.toLowerCase() === nameOrVal.toLowerCase() || p.value === nameOrVal);
};
