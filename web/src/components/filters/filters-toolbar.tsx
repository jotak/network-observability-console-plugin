import {
  Button,
  InputGroup,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
  ValidatedOptions
} from '@patternfly/react-core';
import { CompressIcon, ExpandIcon } from '@patternfly/react-icons';
import * as _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  FilterComponent,
  FilterDefinition,
  FilterValue,
  findFromFilters,
  hasEnabledFilterValues,
  removeFromFilters
} from '../../model/filters';
import { QuickFilter } from '../../model/quick-filters';
import { findFilter } from '../../utils/filter-definitions';
import { QueryOptionsDropdown, QueryOptionsDropdownProps } from '../dropdowns/query-options-dropdown';
import { QuickFilters } from './quick-filters';
import AutocompleteFilter from './autocomplete-filter';
import { FilterHints } from './filter-hints';
import FiltersDropdown from './filters-dropdown';
import { Indicator } from './filters-helper';
import TextFilter from './text-filter';
import { LOCAL_STORAGE_SHOW_FILTERS_KEY, useLocalStorage } from '../../utils/local-storage-hook';
import { FiltersChips } from './filters-chips';
import { navigate } from '../dynamic-loader/dynamic-loader';
import CompareFilter, { FilterCompare } from './compare-filter';
import { LinksOverflow } from '../overflow/links-overflow';
import './filters-toolbar.css';

export interface FiltersToolbarProps {
  id: string;
  filters?: Filters;
  forcedFilters?: Filters | null;
  skipTipsDelay?: boolean;
  setFilters: (v: Filters) => void;
  clearFilters: () => void;
  resetFilters: () => void;
  queryOptionsProps: QueryOptionsDropdownProps;
  quickFilters: QuickFilter[];
  allowConnectionFilter?: boolean;
  allowDNSFilter?: boolean;
  isFullScreen: boolean;
  setFullScreen: (b: boolean) => void;
}

export const FiltersToolbar: React.FC<FiltersToolbarProps> = ({
  id,
  filters,
  forcedFilters,
  skipTipsDelay,
  setFilters,
  clearFilters,
  resetFilters,
  quickFilters,
  allowConnectionFilter,
  allowDNSFilter,
  isFullScreen,
  setFullScreen,
  ...props
}) => {
  const { t } = useTranslation('plugin__netobserv-plugin');
  const [indicator, setIndicator] = React.useState<Indicator>(ValidatedOptions.default);
  const [message, setMessage] = React.useState<string | undefined>();
  const [selectedFilter, setSelectedFilter] = React.useState<FilterDefinition>(findFilter(t, 'src_namespace')!);
  const [selectedCompare, setSelectedCompare] = React.useState<FilterCompare>(FilterCompare.EQUAL);
  const [showFilters, setShowFilters] = useLocalStorage<boolean>(LOCAL_STORAGE_SHOW_FILTERS_KEY, true);

  // reset and delay message state to trigger tooltip properly
  const setMessageWithDelay = React.useCallback(
    (m: string | undefined) => {
      if (skipTipsDelay) {
        setMessage(m);
      } else {
        setMessage(undefined);
        setTimeout(() => {
          setMessage(m);
        }, 100);
      }
    },
    [skipTipsDelay]
  );

  const setFiltersList = React.useCallback(
    (list: Filter[]) => {
      setFilters({ ...filters!, list: list });
    },
    [setFilters, filters]
  );

  const addFilter = React.useCallback(
    (filterValue: FilterValue) => {
      const newFilters = _.cloneDeep(filters?.list) || [];
      const not = selectedCompare === FilterCompare.NOT_EQUAL ? true : false;
      const found = findFromFilters(newFilters, { def: selectedFilter, not });
      if (found) {
        if (found.values.map(value => value.v).includes(filterValue.v)) {
          setMessageWithDelay(t('Filter already exists'));
          setIndicator(ValidatedOptions.error);
          return false;
        } else {
          found.values.push(filterValue);
        }
      } else {
        newFilters.push({ def: selectedFilter, not, values: [filterValue] });
      }
      setFiltersList(newFilters);
      return true;
    },
    [filters, selectedCompare, selectedFilter, setFiltersList, setMessageWithDelay, t]
  );

  const getFilterControl = React.useCallback(() => {
    const commonProps = {
      filterDefinition: selectedFilter,
      addFilter: addFilter,
      setMessageWithDelay: setMessageWithDelay,
      indicator: indicator,
      setIndicator: setIndicator
    };
    switch (selectedFilter.component) {
      case FilterComponent.Text:
        return <TextFilter {...commonProps} />;
      case FilterComponent.Autocomplete:
        return <AutocompleteFilter {...commonProps} />;
    }
  }, [selectedFilter, addFilter, indicator, setIndicator, setMessageWithDelay]);

  const isForced = !_.isEmpty(forcedFilters);
  const filtersOrForced = isForced ? forcedFilters : filters;
  const defaultFilters = quickFilters.filter(qf => qf.default).flatMap(qf => qf.filters);

  const countActiveFilters = (filtersOrForced?.list || []).reduce((prev, cur) => prev + cur.values.length, 0);
  let showHideText: string | undefined;
  if (countActiveFilters > 0) {
    showHideText = showFilters ? t('Hide filters') : t('Show {{count}} filters', { count: countActiveFilters });
  } else if (defaultFilters.length > 0) {
    showHideText = showFilters ? t('Hide filters') : t('Show filters');
  }

  return (
    <Toolbar data-test={id} id={id}>
      <ToolbarContent data-test={`${id}-search-filters`} id={`${id}-search-filters`} toolbarId={id}>
        <ToolbarItem className="flex-start">
          <QueryOptionsDropdown {...props.queryOptionsProps} />
        </ToolbarItem>
        {!isForced && quickFilters.length > 0 && (
          <ToolbarItem className="flex-start">
            <QuickFilters quickFilters={quickFilters} activeFilters={filters?.list || []} setFilters={setFiltersList} />
          </ToolbarItem>
        )}
        {!isForced && (
          <>
            <ToolbarItem className="flex-start">
              <Tooltip
                //css hide tooltip here to avoid render issue
                className={`filters-tooltip${_.isEmpty(message) ? '-empty' : ''}`}
                isVisible={!_.isEmpty(message)}
                content={message}
                trigger={_.isEmpty(message) ? 'manual' : 'click'}
                enableFlip={false}
                position={'top'}
              >
                <div>
                  <InputGroup>
                    <FiltersDropdown
                      selectedFilter={selectedFilter}
                      setSelectedFilter={setSelectedFilter}
                      allowConnectionFilter={allowConnectionFilter}
                      allowDNSFilter={allowDNSFilter}
                  />
                    <CompareFilter value={selectedCompare} setValue={setSelectedCompare} />
                    {getFilterControl()}
                  </InputGroup>
                  <FilterHints def={selectedFilter} />
                </div>
              </Tooltip>
            </ToolbarItem>
          </>
        )}
        {showHideText && (
          <ToolbarItem className="flex-start">
            <Button
              data-test="show-filters-button"
              id="show-filters-button"
              variant="link"
              className="overflow-button"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showHideText}
            </Button>
          </ToolbarItem>
        )}
        <ToolbarItem className="flex-start">
          <LinksOverflow
            id={'filters-more-options'}
            items={[
              {
                id: 'fullscreen',
                label: isFullScreen ? t('Collapse') : t('Expand'),
                onClick: () => setFullScreen(!isFullScreen),
                icon: isFullScreen ? <CompressIcon /> : <ExpandIcon />
              }
            ]}
          />
        </ToolbarItem>
        {showFilters && (
          <FiltersChips
            isForced={isForced}
            filters={filtersOrForced!}
            setFilters={setFilters}
            clearFilters={clearFilters}
            resetFilters={resetFilters}
            quickFilters={quickFilters}
          />
        )}
      </ToolbarContent>
    </Toolbar>
  );
};

export default FiltersToolbar;
