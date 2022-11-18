import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricType } from '../../model/flow-query';
import { TopologyMetrics } from '../../api/loki';
import { decorated, getStat, NodeData } from '../../model/topology';
import { MetricsContent } from '../metrics/metrics-content';
import { matchPeer, peersEqual } from '../../utils/metrics';
import { toNamedMetric } from '../metrics/metrics-helper';
import { ElementPanelStats } from './element-panel-stats';

export const ElementPanelMetrics: React.FC<{
  from?: NodeData;
  to?: NodeData;
  metrics: TopologyMetrics[];
  metricType: MetricType;
}> = ({ from, to, metrics, metricType }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  if (from && to) {
    const filtered = metrics
      .filter(m => matchPeer(from, m.source) && matchPeer(to, m.destination))
      .map(m => toNamedMetric(t, m))
      .sort((a, b) => getStat(b.stats, 'sum') - getStat(a.stats, 'sum'));
    return (
      <div className="element-metrics-container">
        <MetricsContent
          id={`edge-${from.name}-${to.name}`}
          title={t('{{type}} rate', { type: metricType.charAt(0).toUpperCase() + metricType.slice(1) })}
          metricType={metricType}
          metrics={filtered.slice(0, 5)}
          counters={<ElementPanelStats metricType={metricType} metrics={filtered} />}
          limit={10}
          showTitle
          showArea
          showScatter
        />
      </div>
    );
  } else {
    // Either from or to must be defined
    const data = from || to;
    if (!data) {
      return null;
    }
    const matchSourceOrDest = from
      ? (m: TopologyMetrics) => matchPeer(data, m.source)
      : (m: TopologyMetrics) => matchPeer(data, m.destination);
    const filtered = metrics
      .filter(m => !peersEqual(m.source, m.destination) && matchSourceOrDest(m))
      .map(m => toNamedMetric(t, m))
      .sort((a, b) => getStat(b.stats, 'sum') - getStat(a.stats, 'sum'));
    return (
      <div className="element-metrics-container">
        <MetricsContent
          id={`node-${decorated(data).id}`}
          title={t('{{type}} rate', { type: metricType.charAt(0).toUpperCase() + metricType.slice(1) })}
          metricType={metricType}
          metrics={filtered.slice(0, 5)}
          counters={<ElementPanelStats metricType={metricType} metrics={filtered} />}
          limit={10}
          showTitle
          showArea
          showScatter
        />
      </div>
    );
  }
};
