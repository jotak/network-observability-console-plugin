import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import NetflowTrafficParent from './components/netflow-traffic-parent';
import { configure } from 'mobx';
import { ContextSingleton } from './utils/context';
// base-no-reset: Headlamp owns the page shell (sidebar/masthead) via MUI, so we pull in
// PatternFly's design tokens/component styles without its global html/body reset.
import '@patternfly/react-core/dist/styles/base-no-reset.css';

configure({ isolateGlobalState: true });
ContextSingleton.setStandalone();
// PoC: point API calls at the port-forwarded backend (kubectl port-forward ... 9099:9001).
ContextSingleton.setHost('http://127.0.0.1:9099');

function WelcomePage() {
  return (
    <NetflowTrafficParent />
  );
}

// Register the page — note sidebar now points to our entry
registerRoute({
  path: '/netobserv',
  sidebar: 'netobserv',
  component: WelcomePage,
  useClusterURL: false,
  noAuthRequired: true,
});

// Register the sidebar entry
registerSidebarEntry({
  name: 'netobserv',
  label: 'NetObserv',
  url: '/netobserv',
  icon: 'mdi:satellite-variant',
  useClusterURL: false,
});
