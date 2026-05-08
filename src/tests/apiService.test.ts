// API service tests. We mock axios entirely so no real network happens —
// each test feeds the service a canned response and checks the result.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosError, AxiosInstance } from 'axios';

// vi.mock runs before any other code in this file, so it can't see
// variables declared below. I am keeping everything it needs inside the
// factory and put the fake client on globalThis so tests can read it back.
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');

  type RequestInterceptor = (cfg: {
    headers: { set: (k: string, v: string) => void };
    url?: string;
  }) => unknown;
  type ResponseError = (err: unknown) => Promise<never>;

  interface MockClient {
    get: ReturnType<typeof vi.fn>;
    defaults: { baseURL: string };
    interceptors: {
      request: { use: (fn: RequestInterceptor) => void };
      response: { use: (ok: unknown, err: ResponseError) => void };
    };
    __requestInterceptor?: RequestInterceptor;
    __responseError?: ResponseError;
  }

  const mocks: MockClient[] = [];
  (globalThis as unknown as { __axiosMocks: MockClient[] }).__axiosMocks = mocks;

  return {
    default: {
      ...actual.default,
      create: vi.fn(() => {
        const client: MockClient = {
          get: vi.fn(),
          defaults: { baseURL: '/api/v1' },
          interceptors: {
            request: {
              use: (fn) => {
                client.__requestInterceptor = fn;
              },
            },
            response: {
              use: (_ok, err) => {
                client.__responseError = err as ResponseError;
              },
            },
          },
        };
        mocks.push(client);
        return client as unknown as AxiosInstance;
      }),
      isAxiosError: actual.default.isAxiosError,
      isCancel: actual.default.isCancel,
    },
    isAxiosError: actual.default.isAxiosError,
    isCancel: actual.default.isCancel,
  };
});

import { SELApiService } from '@/services/apiService';
import { storageService } from '@/services/storageService';

interface MockClient {
  get: ReturnType<typeof vi.fn>;
  defaults: { baseURL: string };
  __requestInterceptor?: (cfg: { headers: { set: (k: string, v: string) => void }; url?: string }) => unknown;
  __responseError?: (err: unknown) => Promise<never>;
}

// Each `new SELApiService(...)` creates a new mock axios instance.
// lastClient() returns the most recent one so a test can poke at it.
const lastClient = (): MockClient => {
  const all = (globalThis as unknown as { __axiosMocks: MockClient[] }).__axiosMocks;
  return all[all.length - 1] as MockClient;
};

// Helper to build a realistic looking axios error for a given status.
// Just enough shape for the service's `isAxiosError`-based handler to bite.
const buildAxiosError = (status: number, detail = 'nope'): AxiosError => {
  const e = new Error('request failed') as AxiosError;
  (e as unknown as { isAxiosError: boolean }).isAxiosError = true;
  e.response = {
    status,
    data: { detail },
    statusText: '',
    headers: {},
    config: {} as never,
  };
  e.code = undefined;
  return e;
};

describe('SELApiService', () => {
  let service: SELApiService;

  beforeEach(() => {
    window.localStorage.clear();
    service = new SELApiService({ baseURL: '/api/v1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('authenticates with valid credentials and stores the token', async () => {
    lastClient().get.mockResolvedValueOnce({
      data: {
        AccessToken: 'jwt-here',
        ExpiresIn: 3600,
        Scope: 'api',
        TokenType: 'Bearer',
      },
    });

    const ok = await service.authenticate({
      serverUrl: 'https://192.168.3.2',
      username: 'testuser',
      password: 'testpass',
    });

    expect(ok).toBe(true);
    expect(service.isTokenValid()).toBe(true);
    expect(service.getToken()).toBe('jwt-here');
    expect(storageService.getString('auth-token')).toBe('jwt-here');
  });

  it('surfaces a friendly message on 401', async () => {
    lastClient().get.mockRejectedValueOnce(buildAxiosError(401, 'Invalid credentials'));

    await expect(
      service.authenticate({
        serverUrl: 'https://192.168.3.2',
        username: 'testuser',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/credentials|expired/i),
      status: 401,
    });
  });

  it('injects Bearer token via request interceptor for non-auth calls', async () => {
    lastClient().get.mockResolvedValueOnce({
      data: { AccessToken: 'tk', ExpiresIn: 3600, Scope: 'api', TokenType: 'Bearer' },
    });
    await service.authenticate({
      serverUrl: 'https://192.168.3.2',
      username: 'a',
      password: 'b',
    });

    const seen: Record<string, string> = {};
    lastClient().__requestInterceptor?.({
      url: '/logic-engine/symbols',
      headers: { set: (k, v) => { seen[k] = v; } },
    });
    expect(seen.Authorization).toBe('Bearer tk');
  });

  it('does NOT inject the bearer on the auth/token request itself', async () => {
    lastClient().get.mockResolvedValueOnce({
      data: { AccessToken: 'tk', ExpiresIn: 3600, Scope: 'api', TokenType: 'Bearer' },
    });
    await service.authenticate({ serverUrl: 'https://x', username: 'a', password: 'b' });

    const seen: Record<string, string> = {};
    lastClient().__requestInterceptor?.({
      url: '/auth/token',
      headers: { set: (k, v) => { seen[k] = v; } },
    });
    expect(seen.Authorization).toBeUndefined();
  });

  it('clears token and notifies handler on 401 via response interceptor', async () => {
    lastClient().get.mockResolvedValueOnce({
      data: { AccessToken: 'tk', ExpiresIn: 3600, Scope: 'api', TokenType: 'Bearer' },
    });
    await service.authenticate({ serverUrl: 'https://x', username: 'a', password: 'b' });
    expect(service.isTokenValid()).toBe(true);

    const onUnauthorized = vi.fn();
    service.setUnauthorizedHandler(onUnauthorized);

    await expect(lastClient().__responseError?.(buildAxiosError(401))).rejects.toBeDefined();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(service.isTokenValid()).toBe(false);
  });

  it('fetches symbols and filters to type "INS"', async () => {
    lastClient().get.mockResolvedValueOnce({
      data: [
        { Name: 'A', Type: 'INS', Description: 'a' },
        { Name: 'B', Type: 'INT', Description: 'b' },
        { Name: 'C', Type: 'INS' },
      ],
    });

    const symbols = await service.getSymbols({ sort: 'asc', limit: 10 });

    expect(symbols).toHaveLength(2);
    expect(symbols[0]).toEqual({ name: 'A', type: 'INS', description: 'a' });
    expect(lastClient().get).toHaveBeenCalledWith(
      '/logic-engine/symbols',
      expect.objectContaining({ params: { sort: 'asc', limit: 10 } }),
    );
  });

  it('maps a symbol value response into camelCase shape', async () => {
    lastClient().get.mockResolvedValueOnce({
      data: {
        stVal: 42,
        q: { validity: 'good', source: 'process', test: false, operatorBlocked: false, detailQual: {} },
        t: { value: '2024-12-03T14:30:00.000Z' },
        range: 'normal',
        units: 'mV',
        multiplier: 1,
        d: 'desc',
      },
    });

    const value = await service.getSymbolValue('AnalogDeadband');
    expect(value.symbolName).toBe('AnalogDeadband');
    expect(value.stVal).toBe(42);
    expect(value.t).toBe('2024-12-03T14:30:00.000Z');
    expect(value.lastUpdated).toBeInstanceOf(Date);
    expect(value.rawData?.units).toBe('mV');
  });

  it('converts network failures to a friendly error', async () => {
    const networkErr = new Error('network down') as AxiosError;
    (networkErr as unknown as { isAxiosError: boolean }).isAxiosError = true;
    networkErr.response = undefined;
    networkErr.code = 'ECONNREFUSED';
    lastClient().get.mockRejectedValueOnce(networkErr);

    await expect(service.getSymbols()).rejects.toMatchObject({
      message: 'Network connection failed',
    });
  });

  it('isTokenValid returns false once expiry passes', () => {
    service.setToken('tk', 1);
    expect(service.isTokenValid()).toBe(true);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5_000);
    expect(service.isTokenValid()).toBe(false);
    vi.useRealTimers();
  });
});
