import { TFunction } from 'i18next';
import { findFilter } from './filter-definitions';
import { TimeRange } from './datetime';
import { Match, Reporter } from '../model/flow-query';
import { getURLParam, getURLParamAsNumber, setURLParam, URLParam } from './url';
import { createFilterValue, Filter, FilterId } from '../model/filters';

const filtersSeparator = ';';
const filterKVSeparator = '=';
const filterValuesSeparator = ',';
export const defaultTimeRange = 300;
const defaultLimit = 100;
export const defaultReporter: Reporter = 'destination';
const defaultMatch: Match = 'all';

export const flowdirToReporter: { [flowdir: string]: Reporter } = {
  '0': 'destination',
  '1': 'source',
  '': 'both'
};

// export const reporterToFlowdir = _.invert(flowdirToReporter);

// export const buildURLParams = (
//   filters: Filter[],
//   range: number | TimeRange,
//   match: Match,
//   opts: QueryOptions
// ): URLParams => {
//   const params: URLParams = {};
//   params[URLParam.Filters] = filtersToURL(filters);
//   if (range) {
//     if (typeof range === 'number') {
//       params[URLParam.TimeRange] = range;
//     } else if (typeof range === 'object') {
//       params[URLParam.StartTime] = range.from.toString();
//       params[URLParam.EndTime] = range.to.toString();
//     }
//   }
//   if (opts.reporter !== 'both') {
//     params[URLParam.Reporter] = reporterToFlowdir[opts.reporter];
//   }
//   params[URLParam.Limit] = opts.limit;
//   params[URLParam.Match] = match;
//   return params;
// };

// export const getURLParams = (qa: URLParams) => {
//   const urlParams = new URLSearchParams();
//   _.each(qa, (v, k) => {
//     urlParams.set(k, String(v));
//   });
//   return urlParams;
// };

export const getRangeFromURL = (): number | TimeRange => {
  const timeRange = getURLParamAsNumber(URLParam.TimeRange);
  const startTime = getURLParamAsNumber(URLParam.StartTime);
  const endTime = getURLParamAsNumber(URLParam.EndTime);
  if (timeRange) {
    return timeRange;
  } else if (startTime && endTime) {
    return { from: startTime, to: endTime };
  }
  return defaultTimeRange;
};

export const getReporterFromURL = (): Reporter => {
  return (getURLParam(URLParam.Reporter) as Reporter | null) || defaultReporter;
};

export const getLimitFromURL = (): number => {
  return getURLParamAsNumber(URLParam.Limit) || defaultLimit;
};

export const getMatchFromURL = (): Match => {
  return (getURLParam(URLParam.Match) as Match | null) || defaultMatch;
};

export const getFiltersFromURL = (t: TFunction): Promise<Filter[]> => {
  const urlParam = getURLParam(URLParam.Filters) || '';
  const filterPromises: Promise<Filter>[] = [];
  const filters = urlParam.split(filtersSeparator);
  filters.forEach(keyValue => {
    const pair = keyValue.split(filterKVSeparator);
    if (pair.length === 2) {
      const def = findFilter(t, pair[0] as FilterId);
      if (def) {
        const values = pair[1].split(filterValuesSeparator);
        filterPromises.push(
          Promise.all(values.map(v => createFilterValue(def, v))).then(filterValues => {
            return {
              id: def.id,
              def: def,
              values: filterValues
            };
          })
        );
      }
    }
  });
  return Promise.all(filterPromises);
};

export const setURLFilters = (filters: Filter[]) => {
  const urlFilters = filters
    .map(filter => {
      return filter.def.id + filterKVSeparator + filter.values.map(v => v.v).join(filterValuesSeparator);
    })
    .join(filtersSeparator);
  setURLParam(URLParam.Filters, urlFilters);
};

export const setURLRange = (range: number | TimeRange) => {
  if (typeof range === 'number') {
    setURLParam(URLParam.TimeRange, String(range));
  } else if (typeof range === 'object') {
    setURLParam(URLParam.StartTime, String(range.from));
    setURLParam(URLParam.EndTime, String(range.to));
  }
};

export const setURLReporter = (reporter: Reporter) => {
  setURLParam(URLParam.Reporter, reporter);
};

export const setURLLimit = (limit: number) => {
  setURLParam(URLParam.Limit, String(limit));
};

export const setURLMatch = (match: Match) => {
  setURLParam(URLParam.Match, match);
};
