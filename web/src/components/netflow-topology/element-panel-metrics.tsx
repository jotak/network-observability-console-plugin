import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextContent, TextVariants } from '@patternfly/react-core';
import { MetricType } from '../../model/flow-query';
import { TopologyMetrics } from '../../api/loki';
import { decorated, getStat, NodeData } from '../../model/topology';
import { MetricsContent } from '../metrics/metrics-content';
import { matchPeer, peersEqual } from '../../utils/metrics';
import { toNamedMetric } from '../metrics/metrics-helper';
import { ElementPanelStats, PanelMetricsContext } from './element-panel-stats';

export const ElementPanelMetrics: React.FC<{
  aData: NodeData;
  bData?: NodeData;
  metrics: TopologyMetrics[];
  metricType: MetricType;
  context: PanelMetricsContext;
}> = ({ aData, bData, metrics, metricType, context }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');
  const titleStats = t('Stats');
  const titleChart = t('Top 5 rates');

  let id = '';
  let filtered: TopologyMetrics[] = [];
  let focusNode: NodeData | undefined;
  switch (context) {
    case 'a-to-b':
      id = `edge-${aData.name}-${bData!.name}`;
      filtered = metrics.filter(m => matchPeer(aData, m.source) && matchPeer(bData!, m.destination));
      break;
    case 'b-to-a':
      id = `edge-${bData!.name}-${aData.name}`;
      filtered = metrics.filter(m => matchPeer(bData!, m.source) && matchPeer(aData, m.destination));
      break;
    case 'from-node':
      focusNode = aData;
      id = `node-${decorated(focusNode).id}`;
      filtered = metrics.filter(m => !peersEqual(m.source, m.destination) && matchPeer(focusNode!, m.source));
      break;
    case 'to-node':
      focusNode = aData;
      id = `node-${decorated(focusNode).id}`;
      filtered = metrics.filter(m => !peersEqual(m.source, m.destination) && matchPeer(focusNode!, m.destination));
      break;
  }
  const top5 = filtered
    .map(m => toNamedMetric(t, m, focusNode))
    .sort((a, b) => getStat(b.stats, 'sum') - getStat(a.stats, 'sum'));

  return (
    <div className="element-metrics-container">
      <TextContent>
        <Text id="metrics-stats-title" component={TextVariants.h4}>
          {titleStats}
        </Text>
        <ElementPanelStats metricType={metricType} metrics={filtered} context={context} />
        <Text id="metrics-chart-title" component={TextVariants.h4}>
          {titleChart}
        </Text>
      </TextContent>
      <MetricsContent
        id={id}
        title={titleChart}
        metricType={metricType}
        metrics={top5}
        limit={5}
        showArea
        showScatter
      />
    </div>
  );
};
