import { Flex, FlexItem, Text, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricType } from '../../model/flow-query';
import { TopologyMetrics } from '../../api/loki';
import { getStat } from '../../model/topology';
import { getFormattedValue } from '../../utils/metrics';

export const ElementPanelStats: React.FC<{
  metrics: TopologyMetrics[];
  metricType: MetricType;
}> = ({ metrics, metricType }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  const latest = metrics.reduce((prev, cur) => prev + getStat(cur.stats, 'last'), 0);
  const average = metrics.reduce((prev, cur) => prev + getStat(cur.stats, 'avg'), 0);
  const totalBytes = metrics.reduce((prev, cur) => prev + getStat(cur.stats, 'sum'), 0);
  return (
    <Flex className="metrics-flex-container">
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsNone' }}>
        <FlexItem>
          <FlexItem>
            <Text className="element-text" component={TextVariants.h4}>
              {t('Total')}
            </Text>
          </FlexItem>
        </FlexItem>
        <FlexItem>
          <FlexItem>
            <Text className="element-text" component={TextVariants.h4}>
              {t('Average')}
            </Text>
          </FlexItem>
        </FlexItem>
        <FlexItem>
          <FlexItem>
            <Text className="element-text" component={TextVariants.h4}>
              {t('Latest')}
            </Text>
          </FlexItem>
        </FlexItem>
      </Flex>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsNone' }}>
        <FlexItem>
          <Text id="metrics-stats-total">{getFormattedValue(totalBytes, metricType, 'sum')}</Text>
        </FlexItem>
        <FlexItem>
          <Text id="metrics-stats-avg">{getFormattedValue(average, metricType, 'avg')}</Text>
        </FlexItem>
        <FlexItem>
          <Text id="metrics-stats-latest">{getFormattedValue(latest, metricType, 'last')}</Text>
        </FlexItem>
      </Flex>
    </Flex>
  );
};
