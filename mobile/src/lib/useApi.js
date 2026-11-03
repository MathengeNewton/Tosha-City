import { useEffect, useState } from 'react';

const IDLE = { data: null, error: null, loading: true, refreshing: false };

/** Load data from the API with loading, pull-to-refresh and error state. Reloads when `deps` change. */
export function useApi(loader, deps = []) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState(IDLE);
  const [request, setRequest] = useState({ key, nonce: 0 });

  if (request.key !== key) {
    setRequest({ key, nonce: request.nonce + 1 });
    setState((s) => ({ ...s, error: null, loading: true, refreshing: false }));
  }

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false, refreshing: false });
      },
      (e) => {
        if (!cancelled) {
          setState((s) => ({ ...s, error: e?.message ?? 'Something went wrong', loading: false, refreshing: false }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const rerun = (mode) => {
    setState((s) => ({ ...s, error: null, [mode]: true }));
    setRequest((r) => ({ ...r, nonce: r.nonce + 1 }));
  };

  return { ...state, reload: () => rerun('loading'), refresh: () => rerun('refreshing') };
}
