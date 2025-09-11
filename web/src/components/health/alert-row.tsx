import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import * as React from 'react';

import { Label, Tooltip } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { valueFormat } from '../../utils/format';
import { HealthColorSquare } from './health-color-square';
import { AlertWithRuleName, getAlertFilteredLabels, getAlertLink, getHealthMetadata } from './helper';

export interface AlertRowProps {
  resourceName: string;
  alert: AlertWithRuleName;
  wide: boolean;
}

export const AlertRow: React.FC<AlertRowProps> = ({ resourceName, alert, wide }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  const md = getHealthMetadata(alert.annotations);
  const labels = getAlertFilteredLabels(alert, resourceName);
  const links = [
    {
      name: t('Navigate to alert details'),
      url: getAlertLink(alert)
    }
  ];
  if (md?.links) {
    links.push(...md?.links);
  }

  return (
    <Tr>
      {wide && (
        <Td>
          <AlertSummaryCell alert={alert} showTooltip={false} />
        </Td>
      )}
      <Td noPadding={!wide}>{alert.state}</Td>
      <Td>{alert.labels.severity}</Td>
      <Td>
        {labels.length === 0
          ? t('None')
          : labels.map(kv => (
              <Label key={kv[0]}>
                {kv[0]}={kv[1]}
              </Label>
            ))}
      </Td>
      <Td>
        {valueFormat(alert.value as number, 2)}
        {md?.threshold && ' > ' + md.threshold + ' ' + md.unit}
      </Td>
      {wide && <Td>{alert.annotations['description']}</Td>}
      <Td noPadding>
        <ActionsColumn
          isDisabled={links.length === 0}
          items={links.map(l => {
            return {
              title: <a href={l.url}>{l.name}</a>
            };
          })}
        />
      </Td>
    </Tr>
  );
};

export const AlertSummaryCell: React.FC<{ alert: AlertWithRuleName; showTooltip: boolean }> = ({
  alert,
  showTooltip
}) => {
  return (
    <>
      <HealthColorSquare alert={alert} />
      {showTooltip ? (
        <Tooltip content={alert.annotations['description']}>
          <span>{alert.annotations['summary']}</span>
        </Tooltip>
      ) : (
        <>{alert.annotations['summary']}</>
      )}
    </>
  );
};
