import { PrometheusAlert, Rule } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';

export type HealthStats = {
  global: ByResource[],
  byNamespace: ByResource[];
  byNode: ByResource[];
};

export type ByResource = {
  name: string;
  rules: AlertWithRuleName[];
  critical: SeverityStats;
  warning: SeverityStats;
  other: SeverityStats;
};

type SeverityStats = {
  firing: string[];
  pending: string[];
  silenced: string[];
};

export type AlertWithRuleName = PrometheusAlert & {
  ruleName: string;
  ruleID: string;
};

export const buildStats = (rules: Rule[]): HealthStats => {
  const alerts: AlertWithRuleName[] = rules.flatMap(r =>
    r.alerts.map(a => {
      if (typeof a.value === 'string') {
        a.value = parseFloat(a.value);
      }
      return { ...a, ruleName: r.name, ruleID: r.id };
    })
  );

  const global = filterGlobals(alerts);
  const byNamespace = groupBy(alerts, 'SrcK8S_Namespace', 'DstK8S_Namespace');
  const byNode = groupBy(alerts, 'SrcK8S_HostName', 'DstK8S_HostName');
  return { global, byNamespace, byNode };
};

const filterGlobals = (alerts: AlertWithRuleName[]): ByResource[] => {
  const filtered = alerts.filter(a => 
    !('SrcK8S_Namespace' in a.labels) &&
    !('DstK8S_Namespace' in a.labels) &&
    !('SrcK8S_HostName' in a.labels) &&
    !('DstK8S_HostName' in a.labels)
  );
  return statsFromGrouped({"": filtered});
};

const groupBy = (alerts: AlertWithRuleName[], fieldSrc: string, fieldDst: string): ByResource[] => {
  const groups = _.groupBy(alerts.filter(a => fieldSrc in a.labels), a => a.labels[fieldSrc]);
  const byDst = _.groupBy(alerts.filter(a => fieldDst in a.labels), a => a.labels[fieldDst]);
  _.keys(byDst).forEach(k => {
    if (k in groups) {
      groups[k].push(...byDst[k]);
    } else {
      groups[k] = byDst[k];
    }
  });
  return statsFromGrouped(groups);
};

const statsFromGrouped = (g: _.Dictionary<AlertWithRuleName[]>): ByResource[] => {
  const stats: ByResource[] = [];
  _.keys(g).forEach(k => {
    if (k) {
      const br: ByResource = {
        name: k,
        rules: g[k],
        critical: { firing: [], pending: [], silenced: [] },
        warning: { firing: [], pending: [], silenced: [] },
        other: { firing: [], pending: [], silenced: [] }
      };
      stats.push(br);
      g[k].forEach(alert => {
        let stats: SeverityStats;
        switch (alert.labels.severity) {
          case 'critical':
            stats = br.critical;
            break;
          case 'warning':
            stats = br.warning;
            break;
          default:
            stats = br.other;
            break;
        }
        switch (alert.state) {
          case 'firing':
            stats.firing.push(alert.ruleName);
            break;
          case 'pending':
            stats.pending.push(alert.ruleName);
            break;
          case 'silenced':
            stats.silenced.push(alert.ruleName);
            break;
        }
      });
    }
  });
  return stats;
};

export const getRulesPreview = (byr: ByResource): string => {
  const r: string[] = [];
  [byr.critical.firing, byr.warning.firing, byr.other.firing].forEach(list => {
    list.forEach(name => {
      if (r.length < 3 && !r.includes(name)) {
        r.push(name);
      }
    });
  });
  if (r.length < 3) {
    return r.join(', ');
  }
  return r.join(', ') + '...';
};
