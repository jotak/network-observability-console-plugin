import { Table, Tbody, Td, Tr } from '@patternfly/react-table';
import * as React from 'react';

import { AlertWithRuleName, ByResource } from './helper';
import { Label } from '@patternfly/react-core';
import { valueFormat } from '../../../utils/format';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface RuleDetailsProps {
  info: ByResource;
}

export const RuleDetails: React.FC<RuleDetailsProps> = ({ info }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');

  const buildLink = (r: AlertWithRuleName): string => {
    const labels: string[] = [];
    Object.keys(r.labels).forEach(k => {
      labels.push(k + '=' + r.labels[k]);
    });
    return `/monitoring/alerts/${r.ruleID}?${labels.join('&')}`;
  }

  return (
    <Table
      data-test-rows-count={info.rules.length}
      aria-label="Detailed alerting rules"
      variant="compact"
      >
      <Tbody>
        {info.rules.map((r, i) => (
          <Tr key={'detailed-rules-row-'+i}>
            <Td>
              <Link
                to={buildLink(r)}
                title={t('Navigate to alert details')}
              >
                {r.annotations['summary']}
              </Link>
            </Td>
            <Td>{r.state}</Td>
            <Td>{r.labels.severity}</Td>
            <Td>
              {Object.keys(r.labels).filter(k => k !== 'app' && k !== 'severity' && k !== 'alertname' && r.labels[k] !== info.name).map(k => (
                <Label key={k}>{k}={r.labels[k]}</Label>
              ))}
            </Td>
            <Td>{valueFormat(r.value as number, 2)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
