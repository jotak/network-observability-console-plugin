import { FieldMapping, Filter, FilterValue } from './filters';

export type Reporter = 'source' | 'destination' | 'both';
export type Match = 'all' | 'any';

export interface FlowQuery {
  timeRange?: number;
  startTime?: string;
  endTime?: string;
  filters: string;
  reporter: Reporter;
  limit: number;
}

// All filters in AND-group (ie. usually for "match all") are set in a map
type AndGroup = Map<string, string[]>;
// All filters in OR-group (ie. usually for "match any") are set as elements of AndGroup array
type OrGroup = AndGroup[];

// E.g.: OrGroup=[AndGroup={foo=a,bar=b}] is match all: foo=a AND bar=b
// OrGroup=[AndGroup={foo=a},AndGroup={bar=b}] is match any: foo=a OR bar=b
// Things get more complicated with the Src/Dst group split,
// e.g. "Namespace=foo AND Port=80" (match all) stands for
// "SrcNamespace=foo AND SrcPort=80" OR "DstNamespace=foo AND DstPort=80"
// which translates into:
// OrGroup=[AndGroup={SrcNamespace=foo,SrcPort=80},AndGroup={DstNamespace=foo,DstPort=80}]

// Match all: put all filters in a single AndGroup, except if there's a Src/Dst group split found
// in which case there will be Src-AndGroup OR Dst-AndGroup
export const groupFiltersMatchAll = (filters: Filter[]): string => {
  const srcMatch: AndGroup = new Map();
  const dstMatch: AndGroup = new Map();
  let needSrcDstSplit = false;
  filters.forEach(f => {
    if (f.def.fieldMatching.always) {
      // Filters here are always applied, regardless Src/Dst group split
      f.def.fieldMatching.always(f.values).forEach(filter => {
        addToAndGroup(srcMatch, filter.key, filter.values);
        addToAndGroup(dstMatch, filter.key, filter.values);
      });
    } else {
      needSrcDstSplit = true;
      // Filters here are applied for their Src/Dst group split
      f.def.fieldMatching.ifSrc!(f.values).forEach(filter => {
        addToAndGroup(srcMatch, filter.key, filter.values);
      });
      f.def.fieldMatching.ifDst!(f.values).forEach(filter => {
        addToAndGroup(dstMatch, filter.key, filter.values);
      });
    }
  });
  return encodeFilters(needSrcDstSplit ? [srcMatch, dstMatch] : [srcMatch]);
};

const addToAndGroup = (group: AndGroup, key: string, values: string[]) => {
  const currentValues = group.get(key) || [];
  group.set(key, [...currentValues, ...values]);
};

export const groupFiltersMatchAny = (filters: Filter[]): string => {
  const orGroup: OrGroup = [];
  filters.forEach(f => {
    if (f.def.fieldMatching.always) {
      orGroup.push(newGroup(f.def.fieldMatching.always, f.values));
    } else {
      orGroup.push(newGroup(f.def.fieldMatching.ifSrc!, f.values));
      orGroup.push(newGroup(f.def.fieldMatching.ifDst!, f.values));
    }
  });
  return encodeFilters(orGroup);
};

const newGroup = (mapping: FieldMapping, values: FilterValue[]): AndGroup => {
  const filterFields = mapping(values).map(filter => {
    return [filter.key, filter.values] as [string, string[]];
  });
  return new Map(filterFields);
};

const encodeFilters = (filters: Map<string, string[]>[]): string => {
  // Example of output: foo=a,b&bar=c|baz=d (url-encoded)
  const str = filters
    .map(group => {
      return Array.from(group.entries())
        .map(pair => {
          return `${pair[0]}=${pair[1].join(',')}`;
        })
        .join('&');
    })
    .join('|');
  return encodeURIComponent(str);
};
