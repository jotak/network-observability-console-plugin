import { Rule } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, AlertVariant } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface AlertStatsProps {
  rules: Rule[];
}

export const AlertStats: React.FC<AlertStatsProps> = ({ rules }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  const stats = {
    critical: {
      firingAlerts: rules.flatMap(r => r.alerts).filter(a => a.state === 'firing' && a.labels.severity === 'critical')
        .length,
      firingRules: rules.filter(a => a.state === 'firing' && a.labels.severity === 'critical').length,
      pendingAlerts: rules.flatMap(r => r.alerts).filter(a => a.state === 'pending' && a.labels.severity === 'critical')
        .length,
      pendingRules: rules.filter(a => a.state === 'pending' && a.labels.severity === 'critical').length,
      total: rules.filter(a => a.labels.severity === 'critical').length
    },
    warning: {
      firingAlerts: rules.flatMap(r => r.alerts).filter(a => a.state === 'firing' && a.labels.severity === 'warning')
        .length,
      firingRules: rules.filter(a => a.state === 'firing' && a.labels.severity === 'warning').length,
      pendingAlerts: rules.flatMap(r => r.alerts).filter(a => a.state === 'pending' && a.labels.severity === 'warning')
        .length,
      pendingRules: rules.filter(a => a.state === 'pending' && a.labels.severity === 'warning').length,
      total: rules.filter(a => a.labels.severity === 'warning').length
    },
    info: {
      firingAlerts: rules.flatMap(r => r.alerts).filter(a => a.state === 'firing' && a.labels.severity === 'info')
        .length,
      firingRules: rules.filter(a => a.state === 'firing' && a.labels.severity === 'info').length,
      pendingAlerts: rules.flatMap(r => r.alerts).filter(a => a.state === 'pending' && a.labels.severity === 'info')
        .length,
      pendingRules: rules.filter(a => a.state === 'pending' && a.labels.severity === 'info').length,
      total: rules.filter(a => a.labels.severity === 'info').length
    }
  };

  let variant: AlertVariant = AlertVariant.success;
  let title = t('The network looks healthy');
  if (stats.critical.firingAlerts > 0) {
    variant = AlertVariant.danger;
    title = t('There are critical network issues');
  } else if (stats.warning.firingAlerts > 0) {
    variant = AlertVariant.warning;
    title = t('There are network warnings');
  }
  const details: string[] = [];
  if (stats.critical.firingAlerts > 0) {
    details.push(
      t('{{firingAlerts}} critical issues, from {{firingRules}} distinct rules', stats.critical)
    );
  } else if (stats.critical.pendingAlerts > 0) {
    details.push(
      t(
        '({{pendingAlerts}} pending critical issues, from {{pendingRules}} distinct rules)',
        stats.critical
      )
    );
  } else if (variant === AlertVariant.success) {
    details.push(t('No critical issues out of {{total}} rules', stats.critical));
  }
  if (stats.warning.firingAlerts > 0) {
    details.push(t('{{firingAlerts}} warnings, from {{firingRules}} distinct rules', stats.warning));
  } else if (stats.warning.pendingAlerts > 0) {
    details.push(
      t('({{pendingAlerts}} pending warnings, from {{pendingRules}} distinct rules)', stats.warning)
    );
  } else if (variant === AlertVariant.success) {
    details.push(t('No warnings out of {{total}} rules', stats.warning));
  }
  if (stats.info.firingAlerts > 0) {
    details.push(t('{{firingAlerts}} minor issues, from {{firingRules}} distinct rules', stats.info));
  } else if (stats.info.pendingAlerts > 0) {
    details.push(
      t('({{pendingAlerts}} pending minor issues, from {{pendingRules}} distinct rules)', stats.info)
    );
  } else if (variant === AlertVariant.success) {
    details.push(t('No minor issues out of {{total}} rules', stats.info));
  }
  return (
    <Alert variant={variant} title={title}>
      <ul>
        {details.map((text, i) => (
          <li key={'li_' + i}>{text}</li>
        ))}
      </ul>
    </Alert>
  );
};
