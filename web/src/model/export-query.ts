import { FlowQuery } from './flow-query';

export interface ExportQuery extends FlowQuery {
  format: string;
  columns?: string;
}

export const buildExportQuery = (flowQuery: FlowQuery, columns?: string[]) => {
  const query: ExportQuery = {
    ...flowQuery,
    format: 'csv'
  };
  if (columns) {
    query.columns = String(columns);
  }
  return query;
};
