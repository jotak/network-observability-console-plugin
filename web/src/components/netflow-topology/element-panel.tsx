import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Button,
  Divider,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Tab,
  Tabs,
  TabTitleText,
  Text,
  TextContent,
  TextVariants
} from '@patternfly/react-core';
import { FilterIcon, TimesIcon } from '@patternfly/react-icons';
import { BaseEdge, BaseNode } from '@patternfly/react-topology';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultSize, maxSize, minSize } from '../../utils/panel';
import { MetricType, NodeType } from '../../model/flow-query';
import { TopologyMetrics } from '../../api/loki';
import { Filter } from '../../model/filters';
import { ElementData, GraphElementPeer, isElementFiltered, NodeData, toggleElementFilter } from '../../model/topology';
import { ElementPanelMetrics } from './element-panel-metrics';
import './element-panel.css';

export const ElementPanelDetailsContent: React.FC<{
  element: GraphElementPeer;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
}> = ({ element, filters, setFilters }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');
  const [hidden, setHidden] = React.useState<string[]>([]);
  const data = element.getData();

  const toggle = React.useCallback(
    (id: string) => {
      const index = hidden.indexOf(id);
      const newExpanded: string[] =
        index >= 0 ? [...hidden.slice(0, index), ...hidden.slice(index + 1, hidden.length)] : [...hidden, id];
      setHidden(newExpanded);
    },
    [hidden]
  );

  const isFiltered = React.useCallback(
    (d: ElementData) => {
      return isElementFiltered(d, filters, t);
    },
    [filters, t]
  );

  const onFilter = React.useCallback(
    (d: ElementData) => {
      toggleElementFilter(d, isFiltered(d), filters, setFilters, t);
    },
    [filters, isFiltered, setFilters, t]
  );

  const resourceInfos = React.useCallback(
    (d: NodeData) => {
      let infos: React.ReactElement | undefined;

      const addInfos = (id: string, title: string, content: React.ReactElement, data: ElementData) => {
        infos = (
          <>
            {infos}
            <TextContent id={id} className="record-field-container">
              <Text component={TextVariants.h4}>{title}</Text>
              <Flex>
                <FlexItem flex={{ default: 'flex_1' }}>{content}</FlexItem>
                <FlexItem>
                  <Button variant="link" aria-label="Filter" onClick={() => onFilter(data)}>
                    {isFiltered(data) ? <TimesIcon /> : <FilterIcon />}
                  </Button>
                </FlexItem>
              </Flex>
            </TextContent>
          </>
        );
      };

      if (d.resourceKind && d.name) {
        addInfos(
          'resourcelink',
          element instanceof BaseNode ? t('Name') : d.resourceKind,
          element instanceof BaseNode ? (
            <Text>{d.name}</Text>
          ) : (
            <ResourceLink inline={true} kind={d.resourceKind} name={d.name} namespace={d.namespace} />
          ),
          d
        );
      }
      if (d.namespace) {
        addInfos('namespace', t('Namespace'), <ResourceLink inline={true} kind={'Namespace'} name={d.namespace} />, {
          nodeType: 'namespace' as NodeType,
          name: d.namespace
        });
      }
      if (d.host) {
        addInfos('host', t('Node Name'), <ResourceLink inline={true} kind={'Node'} name={d.host} />, {
          nodeType: 'host' as NodeType,
          name: d.host
        });
      }
      if (d.addr) {
        addInfos('address', t('IP'), <Text id="addressValue">{d.addr}</Text>, {
          addr: d.addr
        });
      }

      if (!infos) {
        infos = (
          <TextContent id="no-infos" className="record-field-container">
            {
              // eslint-disable-next-line max-len
              <Text component={TextVariants.p}>
                {t('No information available for this content. Change scope to get more details.')}
              </Text>
            }
          </TextContent>
        );
      }
      return infos;
    },
    [element, isFiltered, onFilter, t]
  );

  if (element instanceof BaseNode && data) {
    const infos = resourceInfos(data);
    return <>{infos}</>;
  } else if (element instanceof BaseEdge) {
    // Edge A to B (prefering neutral naming here as there is no assumption about what is source, what is destination
    const aData = element.getSource().getData();
    const bData = element.getTarget().getData();
    const aInfos = resourceInfos(aData);
    const bInfos = resourceInfos(bData);
    return (
      <Accordion asDefinitionList={false}>
        {aInfos && (
          <div className="record-group-container" key={'source'} data-test-id={'source'}>
            <AccordionItem data-test-id={'source'}>
              {
                <AccordionToggle
                  className="borderless-accordion"
                  onClick={() => toggle('source')}
                  isExpanded={!hidden.includes('source')}
                  id={'source'}
                >
                  {t('Source')}
                </AccordionToggle>
              }
              <AccordionContent
                className="borderless-accordion"
                id="source-content"
                isHidden={hidden.includes('source')}
              >
                {aInfos}
              </AccordionContent>
            </AccordionItem>
          </div>
        )}
        {bInfos && (
          <div className="record-group-container" key={'destination'} data-test-id={'destination'}>
            <Divider />
            <AccordionItem data-test-id={'destination'}>
              {
                <AccordionToggle
                  className="borderless-accordion"
                  onClick={() => toggle('destination')}
                  isExpanded={!hidden.includes('destination')}
                  id={'destination'}
                >
                  {t('Destination')}
                </AccordionToggle>
              }
              <AccordionContent
                className="borderless-accordion"
                id="destination-content"
                isHidden={hidden.includes('destination')}
              >
                {bInfos}
              </AccordionContent>
            </AccordionItem>
          </div>
        )}
      </Accordion>
    );
  }
  return <></>;
};

export const ElementPanel: React.FC<{
  onClose: () => void;
  element: GraphElementPeer;
  metrics: TopologyMetrics[];
  metricType: MetricType;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
  id?: string;
}> = ({ id, element, metrics, metricType, filters, setFilters, onClose }) => {
  const { t } = useTranslation('plugin__netobserv-plugin');
  const [activeTab, setActiveTab] = React.useState<string>('details');

  const data = element.getData();

  let aData: NodeData | undefined;
  let bData: NodeData | undefined;
  if (element instanceof BaseEdge) {
    aData = element.getSource().getData();
    bData = element.getTarget().getData();
  } else {
    // Keep aData undefined so that "from" is undefined for Metrics In
    bData = data;
  }

  const titleContent = React.useCallback(() => {
    if (element instanceof BaseNode && data?.resourceKind && data?.name) {
      return <ResourceLink inline={true} kind={data.resourceKind} name={data.name} namespace={data.namespace} />;
    } else if (data?.resourceKind) {
      return <Text component={TextVariants.h2}>{data?.resourceKind}</Text>;
    } else if (element instanceof BaseEdge) {
      return <Text component={TextVariants.h2}>{t('Edge')}</Text>;
    } else {
      return <Text component={TextVariants.h2}>{t('Unknown')}</Text>;
    }
  }, [data, element, t]);

  return (
    <DrawerPanelContent
      data-test-id={id}
      id={id}
      className="drawer-panel-content"
      isResizable
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
    >
      <DrawerHead id={`${id}-drawer-head`} data-test-id="drawer-head" className="drawer-head">
        {titleContent()}
        <DrawerActions>
          <DrawerCloseButton data-test-id="drawer-close-button" className="drawer-close-button" onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <Divider />
      <DrawerPanelBody id={`${id}-drawer-body`} className="drawer-body" data-test-id="drawer-body">
        <Tabs
          id="drawer-tabs"
          activeKey={activeTab}
          usePageInsets
          onSelect={(e, key) => setActiveTab(key as string)}
          role="region"
        >
          <Tab className="drawer-tab" eventKey={'details'} title={<TabTitleText>{t('Details')}</TabTitleText>}>
            <ElementPanelDetailsContent element={element} filters={filters} setFilters={setFilters} />
          </Tab>
          <Tab className="drawer-tab" eventKey={'metrics-in'} title={<TabTitleText>{t('Metrics In')}</TabTitleText>}>
            <ElementPanelMetrics from={aData} to={bData} metrics={metrics} metricType={metricType} />
          </Tab>
          <Tab className="drawer-tab" eventKey={'metrics-out'} title={<TabTitleText>{t('Metrics Out')}</TabTitleText>}>
            <ElementPanelMetrics from={bData} to={aData} metrics={metrics} metricType={metricType} />
          </Tab>
        </Tabs>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default ElementPanel;
