import { defineConfig } from 'vite';
import { resolve } from 'path';

// Merged into @kinvolk/headlamp-plugin's build config (Vite auto-loads this file).
export default defineConfig({
  resolve: {
    alias: [
      {
        // Redirects the OpenShift Console SDK to the same standalone mock used by
        // webpack.standalone.js's NormalModuleReplacementPlugin: the real SDK package
        // pulls in @console/internal/* and @console/shared/* paths that only resolve
        // inside actual OpenShift Console, and Rollup would otherwise leave them as
        // unresolved `require(...)` calls in the plugin bundle.
        find: '@openshift-console/dynamic-plugin-sdk',
        replacement: resolve(__dirname, 'pluginToStandaloneMapper/mapper'),
      },
      {
        // web/src/utils/url.ts targets react-router v7 (Console plugin / standalone).
        // Headlamp bundles react-router-dom v5 as a global (no useNavigate/useSearchParams),
        // so route to a Headlamp-specific implementation built on v5's useHistory/useLocation.
        find: /utils\/url$/,
        replacement: 'utils/url.headlamp.ts',
      },
    ],
  },
});
