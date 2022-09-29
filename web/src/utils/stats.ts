import _ from 'lodash';
import { RawTopologyMetrics, TopologyMetrics } from '../api/loki';
import { roundTwoDigits } from './count';
import { computeStepInterval, getRangeEnd, rangeToSeconds, TimeRange } from './datetime';

/**
 * computeStats computes avg, max and total. Input metric is always the bytes rate (Bps).
 */
export const computeStats = (tm: RawTopologyMetrics, range: number | TimeRange): TopologyMetrics => {
  const values = tm.values.map(dp => Number(dp[1])).filter(v => !_.isNaN(v));
  if (values.length === 0) {
    return {
      ...tm,
      stats: { latest: 0, avg: 0, max: 0, total: 0 }
    };
  }

  // TODO: fill missing dp with 0

  // Figure out what's the expected number of datapoints, because series may not contain all datapoints
  // We'll assume that missing datapoints are zeros
  const info = computeStepInterval(range);
  const rangeInSeconds = rangeToSeconds(range);
  const expectedDatapoints = Math.floor(rangeInSeconds / info.stepSeconds);

  // Compute stats
  const sum = values.reduce((prev, cur) => prev + cur, 0);
  const avg = sum / expectedDatapoints;
  const max = Math.max(...values);

  // Get last datapoint. If the serie ends too early before the expected end range, we assume it's 0
  // (with a tolerance margin)
  const tolerance = 5 * info.stepSeconds;
  const endRange = getRangeEnd(range).getTime() / 1000;
  const lastDP = tm.values[tm.values.length - 1] as [number, string];
  const latest = lastDP[0] >= endRange - tolerance ? Number(lastDP[1]) : 0;

  return {
    ...tm,
    stats: {
      latest: roundTwoDigits(latest),
      avg: roundTwoDigits(avg),
      max: roundTwoDigits(max),
      total: Math.floor(avg * rangeInSeconds)
    }
  };
};
