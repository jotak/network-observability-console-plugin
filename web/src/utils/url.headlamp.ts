/**
 * Headlamp-specific router bindings.
 *
 * Headlamp's host app bundles react-router-dom v5 (no useNavigate/useSearchParams hooks),
 * exposed globally as `pluginLib.ReactRouter`. Vite externalizes any 'react-router' /
 * 'react-router-dom' import to that same global (see web/vite.config.ts), so this file
 * implements the v7-shaped API used by the rest of the app on top of v5's useHistory/useLocation.
 */
import { useCallback, useRef } from 'react';
import { Link as RouterLink, useHistory, useLocation, useParams as useRouterParams } from 'react-router-dom';

export * from './url';

export { RouterLink as Link };

export const useNavigate = () => {
  const history = useHistory();
  const historyRef = useRef(history);
  historyRef.current = history;

  return useCallback((to: string | number) => {
    if (typeof to === 'number') {
      historyRef.current.go(to);
    } else {
      historyRef.current.push(to);
    }
  }, []);
};

export const useParams = <T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T => {
  return useRouterParams() as T;
};

export const useSearchParams = (): [URLSearchParams, (params: URLSearchParams | Record<string, string>) => void] => {
  const location = useLocation();
  const history = useHistory();

  const setSearchParams = useCallback(
    (params: URLSearchParams | Record<string, string>) => {
      const search = params instanceof URLSearchParams ? params : new URLSearchParams(params);
      history.push({ search: search.toString() });
    },
    [history]
  );

  return [new URLSearchParams(location.search), setSearchParams];
};
