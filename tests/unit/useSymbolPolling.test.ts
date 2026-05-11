// API service fully mocked; fake timers fast-forward poll cycles without real waiting

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Symbol, SymbolValue } from '@/types/api';

// each test configures these fakes here for its specific scenario.
vi.mock('@/services/apiService', () => {
  return {
    apiService: {
      isTokenValid: vi.fn(() => true),
      authenticate: vi.fn(),
      getSymbols: vi.fn(),
      getSymbolValue: vi.fn(),
      clearToken: vi.fn(),
      setUnauthorizedHandler: vi.fn(),
    },
  };
});

import { apiService } from '@/services/apiService';
import { useSymbolPolling } from '@/hooks/useSymbolPolling';

const mocked = apiService as unknown as {
  isTokenValid: ReturnType<typeof vi.fn>;
  authenticate: ReturnType<typeof vi.fn>;
  getSymbols: ReturnType<typeof vi.fn>;
  getSymbolValue: ReturnType<typeof vi.fn>;
  clearToken: ReturnType<typeof vi.fn>;
  setUnauthorizedHandler: ReturnType<typeof vi.fn>;
};

// two symbols is enough to cover multi-symbol behavior without cluttering tests.
const sampleSymbols: Symbol[] = [
  { name: 'A', type: 'INS' },
  { name: 'B', type: 'INS' },
];

// Helper to spit out a SymbolValue with the lastUpdated set to now.
const valueFor = (name: string, stVal: number): SymbolValue => ({
  symbolName: name,
  stVal,
  t: new Date().toISOString(),
  lastUpdated: new Date(),
});

describe('useSymbolPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.isTokenValid.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads symbols and seeds empty values', async () => {
    mocked.getSymbols.mockResolvedValueOnce(sampleSymbols);

    const { result } = renderHook(() => useSymbolPolling());
    await act(async () => {
      await result.current.loadSymbols();
    });

    expect(result.current.symbols).toHaveLength(2);
    expect(result.current.symbolValues.size).toBe(2);
    expect(result.current.symbolValues.get('A')?.stVal).toBe(0);
  });

  it('starts and stops polling, firing fetches at the configured interval', async () => {
    vi.useFakeTimers();
    mocked.getSymbols.mockResolvedValueOnce(sampleSymbols);
    mocked.getSymbolValue.mockImplementation(async (name: string) => valueFor(name, 1));

    const { result } = renderHook(() => useSymbolPolling());
    await act(async () => {
      await result.current.loadSymbols();
    });

    act(() => {
      result.current.setPollingInterval(1000);
    });
    act(() => {
      result.current.startPolling();
    });

    // The hook fires one fetch right when polling starts (no waiting).
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocked.getSymbolValue).toHaveBeenCalled();

    const initialCalls = mocked.getSymbolValue.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(mocked.getSymbolValue.mock.calls.length).toBeGreaterThan(initialCalls);

    act(() => {
      result.current.stopPolling();
    });
    expect(result.current.pollingState.isPolling).toBe(false);
  });

  it('keeps fetching successful symbols when one rejects', async () => {
    mocked.getSymbols.mockResolvedValueOnce(sampleSymbols);
    mocked.getSymbolValue.mockImplementation(async (name: string) => {
      if (name === 'B') throw new Error('boom');
      return valueFor(name, 7);
    });

    const { result } = renderHook(() => useSymbolPolling());
    await act(async () => {
      await result.current.loadSymbols();
    });

    await act(async () => {
      await result.current.refreshOnce();
    });

    await waitFor(() => {
      expect(result.current.symbolValues.get('A')?.stVal).toBe(7);
    });
    expect(result.current.symbolValues.get('B')?.stVal).toBe(0);
  });

  it('builds history points up to the cap', async () => {
    vi.useFakeTimers();
    mocked.getSymbols.mockResolvedValueOnce([{ name: 'A', type: 'INS' }]);
    let counter = 0;
    mocked.getSymbolValue.mockImplementation(async (name: string) => {
      counter += 1;
      return valueFor(name, counter);
    });

    const { result } = renderHook(() => useSymbolPolling());
    await act(async () => {
      await result.current.loadSymbols();
    });

    act(() => {
      result.current.setPollingInterval(1000);
    });
    act(() => {
      result.current.startPolling();
    });

    // Run more poll cycles than the 50-point cap so we can be sure the
    // history is actually being trimmed and not just growing forever.
    for (let i = 0; i < 60; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
    }

    const history = result.current.symbolHistory.get('A');
    expect(history).toBeDefined();
    expect(history!.dataPoints.length).toBeLessThanOrEqual(50);
    expect(history!.dataPoints.length).toBeGreaterThan(0);
  });

  it('does not start polling without a valid token', () => {
    mocked.isTokenValid.mockReturnValue(false);
    const { result } = renderHook(() => useSymbolPolling());

    act(() => {
      result.current.startPolling();
    });

    expect(result.current.pollingState.isPolling).toBe(false);
    expect(result.current.error?.message).toMatch(/Not authenticated/);
  });

  it('disconnect clears state and stops polling', async () => {
    mocked.getSymbols.mockResolvedValueOnce(sampleSymbols);
    mocked.getSymbolValue.mockResolvedValue(valueFor('A', 5));

    const { result } = renderHook(() => useSymbolPolling());
    await act(async () => {
      await result.current.loadSymbols();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.symbols).toHaveLength(0);
    expect(result.current.symbolValues.size).toBe(0);
    expect(result.current.connectionStatus.isConnected).toBe(false);
    expect(mocked.clearToken).toHaveBeenCalled();
  });
});
