import { isModelFeatureFlag, ModelFeatureFlag, useResolvedExtensions } from '@openshift-console/dynamic-plugin-sdk';
import { Button, PageSection, Tooltip } from '@patternfly/react-core';
import { ColumnsIcon, SyncAltIcon } from '@patternfly/react-icons';
import * as _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Record } from '../api/ipfix';
import { getFlows } from '../api/routes';
import NetflowTable from './netflow-table/netflow-table';
import { Column, getDefaultColumns } from '../utils/columns';
import { usePoll } from '../utils/poll-hook';
import { ColumnsModal } from './columns-modal';
import { FiltersToolbar } from './filters-toolbar';
import './netflow-traffic.css';
import { RefreshDropdown } from './refresh-dropdown';
import TimeRangeDropdown from './time-range-dropdown';
import TimeRangeModal from './time-range-modal';
import {
  setURLQueryArguments,
  buildQueryArguments,
  getFiltersFromURL,
  getQueryOptionsFromURL,
  getRangeFromURL,
  QueryArguments
} from '../utils/router';
import { TimeRange } from '../utils/datetime';
import DisplayDropdown from './display-dropdown';
import { Size } from './display-dropdown';
import {
  LOCAL_STORAGE_COLS_KEY,
  LOCAL_STORAGE_REFRESH_KEY,
  LOCAL_STORAGE_SIZE_KEY,
  useLocalStorage
} from '../utils/local-storage-hook';
import { Filter } from '../utils/filters';
import { QueryOptions } from '../model/query-options';
import { getHTTPErrorDetails } from '../utils/errors';

export const NetflowTraffic: React.FC = () => {
  const [extensions] = useResolvedExtensions<ModelFeatureFlag>(isModelFeatureFlag);
  const [loading, setLoading] = React.useState(true);
  const [flows, setFlows] = React.useState<Record[]>([]);
  const [error, setError] = React.useState<string | undefined>();
  const [size, setSize] = useLocalStorage<Size>(LOCAL_STORAGE_SIZE_KEY, 'm');
  const [isTRModalOpen, setTRModalOpen] = React.useState(false);
  const [isColModalOpen, setColModalOpen] = React.useState(false);
  const { t } = useTranslation('plugin__network-observability-plugin');

  //TODO: create a number range filter type for Packets & Bytes
  const [columns, setColumns] = useLocalStorage<Column[]>(LOCAL_STORAGE_COLS_KEY, getDefaultColumns(t), {
    id: 'id',
    criteria: 'isSelected'
  });
  const [filters, setFilters] = React.useState<Filter[]>(getFiltersFromURL(columns));
  const [range, setRange] = React.useState<number | TimeRange>(getRangeFromURL());
  const [queryOptions, setQueryOptions] = React.useState<QueryOptions>(getQueryOptionsFromURL());
  const [interval, setInterval] = useLocalStorage<number | undefined>(LOCAL_STORAGE_REFRESH_KEY);
  const isInit = React.useRef(true);

  const tick = React.useCallback(
    (queryArgs?: QueryArguments) => {
      const qa = queryArgs ?? buildQueryArguments(filters, range, queryOptions);
      setLoading(true);
      setError(undefined);
      getFlows(qa)
        .then(setFlows)
        .catch(err => {
          setFlows([]);
          const errorMessage = getHTTPErrorDetails(err);
          setError(errorMessage);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [filters, range, queryOptions]
  );

  // Rewrite URL params on state change and tick
  React.useEffect(() => {
    // Skip on init
    if (isInit.current) {
      isInit.current = false;
      return;
    }
    const qa = buildQueryArguments(filters, range, queryOptions);
    setURLQueryArguments(qa);
    tick(qa);
  }, [filters, range, queryOptions, tick]);

  usePoll(tick, interval);

  // updates table filters and clears up the table for proper visualization of the
  // updating process
  const updateTableFilters = (f: Filter[]) => {
    setFilters(f);
    setFlows([]);
  };

  const clearFilters = () => {
    updateTableFilters([]);
  };

  //close modal on range updated
  React.useEffect(() => {
    setTRModalOpen(false);
  }, [range]);

  return !_.isEmpty(extensions) ? (
    <PageSection id="pageSection">
      <h1 className="co-m-pane__heading">
        <span>Network Traffic</span>
        <div className="co-actions">
          <TimeRangeDropdown
            id="time-range-dropdown"
            range={typeof range === 'number' ? range : undefined}
            setRange={setRange}
            openCustomModal={() => setTRModalOpen(true)}
          />
          <RefreshDropdown id="refresh-dropdown" interval={interval} setInterval={setInterval} />
          <Button
            id="refresh-button"
            className="co-action-refresh-button"
            variant="primary"
            onClick={() => tick()}
            icon={<SyncAltIcon style={{ animation: `spin ${loading ? 1 : 0}s linear infinite` }} />}
          />
        </div>
      </h1>
      <FiltersToolbar
        id="filter-toolbar"
        columns={columns}
        filters={filters}
        setFilters={updateTableFilters}
        clearFilters={clearFilters}
        queryOptions={queryOptions}
        setQueryOptions={setQueryOptions}
      >
        <Tooltip content={t('Manage columns')}>
          <Button
            id="manage-columns-button"
            variant="plain"
            onClick={() => setColModalOpen(true)}
            aria-label={t('Column management')}
          >
            <ColumnsIcon color="#6A6E73" />
          </Button>
        </Tooltip>
        <DisplayDropdown id="display-dropdown" setSize={setSize} />
      </FiltersToolbar>
      <NetflowTable
        loading={loading}
        error={error}
        flows={flows}
        size={size}
        clearFilters={clearFilters}
        columns={columns.filter(col => col.isSelected)}
      />
      <TimeRangeModal
        id="time-range-modal"
        isModalOpen={isTRModalOpen}
        setModalOpen={setTRModalOpen}
        range={typeof range === 'object' ? range : undefined}
        setRange={setRange}
      />
      <ColumnsModal
        id="columns-modal"
        isModalOpen={isColModalOpen}
        setModalOpen={setColModalOpen}
        columns={columns}
        setColumns={setColumns}
      />
    </PageSection>
  ) : null;
};

export default NetflowTraffic;
