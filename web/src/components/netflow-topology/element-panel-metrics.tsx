import { Flex, FlexItem, Text, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricFunction, MetricType } from '../../model/flow-query';
import { TopologyMetrics } from '../../api/loki';
import { decorated, getStat, NodeData } from '../../model/topology';
import { MetricsContent } from '../metrics/metrics-content';
import { getFormattedValue, matchPeer, peersEqual } from '../../utils/metrics';
import { toNamedMetric } from '../metrics/metrics-helper';

export const ElementPanelMetrics: React.FC<{
  from?: NodeData;
  to?: NodeData;
  isReversed?: boolean;
  metrics: TopologyMetrics[];
  metricFunction: MetricFunction;
  metricType: MetricType;
}> = ({ from, to, isReversed, metrics, metricFunction, metricType }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  const metricCounts = React.useCallback(
    (count: number, forEdge: boolean) => {
      const label = forEdge
        ? isReversed
          ? t('Destination to source:')
          : t('Source to destination:')
        : from
        ? t('Out:')
        : t('In:');
      return (
        <Flex className="metrics-flex-container">
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsNone' }}>
            <FlexItem>
              <FlexItem>
                <Text className="element-text" component={TextVariants.h4}>
                  {label}
                </Text>
              </FlexItem>
            </FlexItem>
          </Flex>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsNone' }}>
            <FlexItem>
              <Text id="inCount">{getFormattedValue(count, metricType, metricFunction)}</Text>
            </FlexItem>
          </Flex>
        </Flex>
      );
    },
    [metricFunction, metricType, t]
  );

  if (from && to) {
    const filtered = metrics
      .filter(m => matchPeer(from, m.source) && matchPeer(to, m.destination))
      .map(m => toNamedMetric(t, m))
      .sort((a, b) => getStat(b.stats, 'sum') - getStat(a.stats, 'sum'));
    const count = filtered.reduce((prev, cur) => prev + getStat(cur.stats, metricFunction), 0);
    return (
      <div className="element-metrics-container">
        <MetricsContent
          id={`edge-${from.name}-${to.name}`}
          title={t('{{type}} rate', { type: metricType.charAt(0).toUpperCase() + metricType.slice(1) })}
          metricType={metricType}
          metrics={filtered.slice(0, 5)}
          counters={metricCounts(count, true)}
          limit={10}
          showTitle
          showArea
          showScatter
        />
      </div>
    );
  } else {
    // Either from or to must be defined
    const data = from || to!;
    const matchSourceOrDest = from
      ? (m: TopologyMetrics) => matchPeer(data, m.source)
      : (m: TopologyMetrics) => matchPeer(data, m.destination);
    const filtered = metrics
      .filter(m => !peersEqual(m.source, m.destination) && matchSourceOrDest(m))
      .map(m => toNamedMetric(t, m))
      .sort((a, b) => getStat(b.stats, 'sum') - getStat(a.stats, 'sum'));
    const count = filtered.reduce((prev, cur) => prev + getStat(cur.stats, metricFunction), 0);
    return (
      <div className="element-metrics-container">
        <MetricsContent
          id={`node-${decorated(data).id}`}
          title={t('{{type}} rate', { type: metricType.charAt(0).toUpperCase() + metricType.slice(1) })}
          metricType={metricType}
          metrics={filtered.slice(0, 5)}
          counters={metricCounts(count, false)}
          limit={10}
          showTitle
          showArea
          showScatter
        />
      </div>
    );
  }
};
