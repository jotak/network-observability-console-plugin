import { cyrb53 } from '../utils/hash';
import { Fields, Labels, Record } from './ipfix';

export interface LokiResponse {
  resultType: string;
  result: StreamResult[];
  stats: LokiStats;
}

export interface LokiStats {}

export type StreamResult = {
  stream: { [key: string]: string };
  values: string[][];
};

export const parseStream = (raw: StreamResult): Record[] => {
  return raw.values.map(v => {
    const fields = JSON.parse(v[1]) as Fields;
    return {
      labels: raw.stream as unknown as Labels,
      key: cyrb53(v.join(',')),
      timestamp: +v[0].slice(0, 13),
      fields: fields
    };
  });
};
