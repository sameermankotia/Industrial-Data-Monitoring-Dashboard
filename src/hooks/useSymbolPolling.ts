// The polling hook is the only place in the app that owns timers. It runs
// the fetch loop, builds the rolling history map, and exposes everything
// the dashboard needs as plain reactive state.

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

// If someone passes us a weird interval (or storage has bad data), fall
// back to the default instead of polling at, say, 17ms.
function clampInterval(ms: number): number {
  return VALID_INTERVALS.includes(ms) ? ms : DEFAULT_INTERVAL;
}

// Add one new point to a symbol's history. Trims by both age (5 minutes)
// and count (50 points) so memory doesn't grow forever.
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

  // Refs hold values we need inside the timer callback. Using state here
  // would force us to recreate the interval every time anything changed.
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
    setPollingState((s) => ({ ...s, isPolling: false }));
  }, []);

  // One full poll cycle: fetch every symbol's current value in parallel,
  // then update state with whichever ones came back successfully.
  const fetchOnce = useCallback(async () => {
    const list = symbolsRef.current;
    if (list.length === 0) return;

    // If a previous batch is still running (slow network or short interval),
    // cancel it. Otherwise we'd build up a pile of in-flight requests.
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    // allSettled instead of all so one failing symbol doesn't kill the rest.
    const settled = await Promise.allSettled(
      list.map((s) => apiService.getSymbolValue(s.name, controller.signal)),
    );

    // If we got cancelled mid-fetch, drop the results — they're stale.
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
      // fetchOnce uses Promise.allSettled internally, so a thrown error here
      // is something unexpected — surface it.
      setError(e as ApiError);
    }
  }, [fetchOnce]);

  const startPolling = useCallback(() => {
    // Guard against double-start so we don't end up with two intervals.
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
    // Fire once immediately so the table populates without making the user
    // wait a full interval to see anything.
    void fetchOnce();
    intervalIdRef.current = setInterval(() => {
      void fetchOnce();
    }, pollingState.interval);
  }, [fetchOnce, pollingState.interval]);

  // Lets the user change polling speed without stopping/starting.
  // If we're already polling, swap out the interval immediately.
  const setPollingInterval = useCallback(
    (ms: number) => {
      const interval = clampInterval(ms);
      storageService.setNumber('polling-interval', interval);
      setPollingState((s) => ({ ...s, interval }));
      if (isPollingRef.current) {
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        intervalIdRef.current = setInterval(() => {
          void fetchOnce();
        }, interval);
      }
    },
    [fetchOnce],
  );

  // Pulls the symbol list from the API once. Called on login and on
  // manual refresh.
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

  // Sign in. On success we also pull the symbol list so the dashboard has
  // something to show before the user clicks Start polling.
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

  // Log out. Stops polling, clears the token, wipes everything from memory.
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

  // Tear down the interval and any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      inFlightRef.current?.abort();
    };
  }, []);

  // Memoize the returned object so consumers don't re-render on every tick
  // unless something they care about actually changed.
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
