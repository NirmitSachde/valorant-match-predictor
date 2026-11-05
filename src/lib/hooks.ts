import { useEffect, useState } from "react";
import { errorMessage, isAbort } from "../api/client";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Runs `fn` when `key` changes; aborts the previous call. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, key: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  useEffect(() => {
    const ctl = new AbortController();
    setState({ data: null, error: null, loading: true });
    fn(ctl.signal).then(
      (data) => {
        if (!ctl.signal.aborted) setState({ data, error: null, loading: false });
      },
      (e) => {
        if (isAbort(e) || ctl.signal.aborted) return;
        setState({ data: null, error: errorMessage(e), loading: false });
      },
    );
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} | VCT Match Predictor` : "VCT Match Predictor";
  }, [title]);
}
