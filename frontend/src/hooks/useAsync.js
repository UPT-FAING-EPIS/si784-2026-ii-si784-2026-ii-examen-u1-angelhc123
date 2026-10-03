import { useCallback, useEffect, useState } from 'react';

/** Carga datos asíncronos con estado de carga/error y función de recarga. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return load()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error: error.message }));
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}
