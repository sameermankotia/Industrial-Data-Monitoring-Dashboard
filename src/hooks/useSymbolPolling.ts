// Owns all timers: runs the fetch loop, builds rolling history, exposes reactive state to the dashboard

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiService } from '@/services/apiService';
import { storageService } from '@/services/storageService';
import {
  ApiError,
  AuthCredentials,
  ConnectionStatus,
  HISTORY_MAX_POINTS,
  HISTORY_WINDOW_MS,
  PollingState,
  Symbol,
  SymbolHistory,
  SymbolHistoryPoint,
  SymbolValue,
} from '@/types/api';

const DEFAULT_INTERVAL = 2000;
const VALID_INTERVALS = [1000, 2000, 5000, 10_000];

// guards against bad storage data or arbitrary values (e.g. 17ms)
function clampInterval(ms: number): number {
  return VALID_INTERVALS.includes(ms) ? ms : DEFAULT_INTERVAL;
}

// appends a point then trims by age (5 min) and count (50) so memory doesn't grow unbounded
function appendHistory(
  prev: Map<string, SymbolHistory>,
  symbolName: string,
  value: number,
): Map<string, SymbolHistory> {
  const now = new Date();
  const point: SymbolHistoryPoint = {
    value,
    timestamp: now,
    formattedTime: now.toLocaleTimeString(),
  };
  const existing = prev.get(symbolName);
  const dataPoints = [...(existing?.dataPoints ?? []), point]
    // drop anything older than the rolling window first, then cap by count
    .filter((p) => now.getTime() - p.timestamp.getTime() <= HISTORY_WINDOW_MS)
    .slice(-HISTORY_MAX_POINTS);

  const next = new Map(prev);
  next.set(symbolName, {
    symbolName,
    dataPoints,
    maxPoints: HISTORY_MAX_POINTS,
  });
  return next;
}

export interface UseSymbolPollingResult {
  symbols: Symbol[];
  symbolValues: Map<string, SymbolValue>;
  symbolHistory: Map<string, SymbolHistory>;
  connectionStatus: ConnectionStatus;
  pollingState: PollingState;
  loading: boolean;
  error: ApiError | null;

  authenticate: (credentials: AuthCredentials) => Promise<boolean>;
  loadSymbols: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (ms: number) => void;
  refreshOnce: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

export function useSymbolPolling(): UseSymbolPollingResult {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [symbolValues, setSymbolValues] = useState<Map<string, SymbolValue>>(new Map());
  const [symbolHistory, setSymbolHistory] = useState<Map<string, SymbolHistory>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: apiService.isTokenValid(),
  });
  const [pollingState, setPollingState] = useState<PollingState>(() => {
    const saved = storageService.getNumber('polling-interval');
    return { isPolling: false, interval: clampInterval(saved ?? DEFAULT_INTERVAL) };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // refs for timer callback.
  const symbolsRef = useRef<Symbol[]>([]);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const isPollingRef = useRef(false);

  // Keep the ref in sync with the latest symbols on every render.
  symbolsRef.current = symbols;

  const stopPolling = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }
    isPollingRef.current = false;
    setSymbolHistory (new Map());
    setPollingState((s) => ({ ...s, isPolling: false }));
  }, []);

  // fetches all symbols in parallel; updates state with whichever succeed
  const fetchOnce = useCallback(async () => {
    const list = symbolsRef.current;
    if (list.length === 0) return;

    // cancel any inflight batch to avoid request pileup on slow networks or short intervals
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    // allSettled instead of all so one failing symbol doesn't kill the rest.
    const settled = await Promise.allSettled(
      list.map((s) => apiService.getSymbolValue(s.name, controller.signal)),
    );

    // If we got cancelled mid-fetch, then drop the results.
    if (controller.signal.aborted) return;

    setSymbolValues((prev) => {
      const next = new Map(prev);
      settled.forEach((res, idx) => {
        const item = list[idx];
        if (!item) return;
        if (res.status === 'fulfilled') {
          next.set(item.name, res.value);
        }
      });
      return next;
    });

    setSymbolHistory((prev) => {
      let history = prev;
      settled.forEach((res, idx) => {
        const item = list[idx];
        if (!item || res.status !== 'fulfilled') return;
        history = appendHistory(history, item.name, res.value.stVal);
      });
      return history;
    });

    setPollingState((s) => ({ ...s, lastPoll: new Date() }));
    setConnectionStatus((c) => ({ ...c, isConnected: true, lastConnection: new Date() }));
    inFlightRef.current = null;
  }, []);

  const refreshOnce = useCallback(async () => {
    try {
      await fetchOnce();
    } catch (e) {
      setError(e as ApiError);
    }
  }, [fetchOnce]);

  const startPolling = useCallback(() => {
    // Guard against double start so we don't end up with two intervals.
    if (isPollingRef.current) return;
    if (!apiService.isTokenValid()) {
      setError({
        message: 'Not authenticated',
        timestamp: new Date(),
      });
      return;
    }
    isPollingRef.current = true;
    setPollingState((s) => ({ ...s, isPolling: true }));
    // immediate fetch so the table populates without waiting a full interval
    void fetchOnce();
    intervalIdRef.current = setInterval(() => {
      void fetchOnce();
    }, pollingState.interval);
  }, [fetchOnce, pollingState.interval]);

  // swaps the interval live without stopping/starting polling
  const setPollingInterval = useCallback(
  (ms: number) => {
    const interval = clampInterval(ms);
    storageService.setNumber('polling-interval', interval);
    setPollingState((s) => ({ ...s, interval }));
    if (isPollingRef.current) {

      if(intervalIdRef.current){
        clearInterval(intervalIdRef.current);
      }
    }

    intervalIdRef.current = setInterval(() => {
      void fetchOnce();
    } ,interval);
  
  },
  [fetchOnce],
);









  // fetches symbol list once; called on login and manual refresh
  const loadSymbols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiService.getSymbols({ sort: 'asc', limit: 50 });
      setSymbols(list);
      // seed empty SymbolValue entries so the table renders with names right away
      setSymbolValues((prev) => {
        const next = new Map(prev);
        list.forEach((s) => {
          if (!next.has(s.name)) {
            next.set(s.name, {
              symbolName: s.name,
              stVal: 0,
              t: '',
              lastUpdated: new Date(0),
            });
          }
        });
        return next;
      });
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  // on success, immediately loads symbols so the dashboard is ready before polling starts
  const authenticate = useCallback(
    async (credentials: AuthCredentials): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const ok = await apiService.authenticate(credentials);
        setConnectionStatus({ isConnected: ok, lastConnection: new Date() });
        if (ok) await loadSymbols();
        return ok;
      } catch (e) {
        setError(e as ApiError);
        setConnectionStatus({ isConnected: false, error: (e as ApiError).message });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadSymbols],
  );

  // stops polling, clears token, wipes all in-memory state
  const disconnect = useCallback(() => {
    stopPolling();
    apiService.clearToken();
    setSymbols([]);
    setSymbolValues(new Map());
    setSymbolHistory(new Map());
    setConnectionStatus({ isConnected: false });
  }, [stopPolling]);

  const clearError = useCallback(() => setError(null), []);

  // Surface 401s coming back from any request as a forced disconnect
  useEffect(() => {
    apiService.setUnauthorizedHandler(() => {
      stopPolling();
      setConnectionStatus({ isConnected: false, error: 'Session expired' });
    });
    return () => apiService.setUnauthorizedHandler(null);
  }, [stopPolling]);

  // Tear down the interval and any inflight request on unmount
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      inFlightRef.current?.abort();
    };
  }, []);

  // memoized so consumers only rerender when something they use actually changed
  return useMemo<UseSymbolPollingResult>(
    () => ({
      symbols,
      symbolValues,
      symbolHistory,
      connectionStatus,
      pollingState,
      loading,
      error,
      authenticate,
      loadSymbols,
      startPolling,
      stopPolling,
      setPollingInterval,
      refreshOnce,
      disconnect,
      clearError,
    }),
    [
      symbols,
      symbolValues,
      symbolHistory,
      connectionStatus,
      pollingState,
      loading,
      error,
      authenticate,
      loadSymbols,
      startPolling,
      stopPolling,
      setPollingInterval,
      refreshOnce,
      disconnect,
      clearError,
    ],
  );
}
