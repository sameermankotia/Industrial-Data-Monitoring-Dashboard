// Single place that talks to the device. Has:
//   - the axios instance + interceptors
//   - the auth token (memory + localStorage)
//   - error mapping so the rest of the app sees a friendly ApiError shape
// Keep HTTP-specific stuff in here. Components and the polling hook should
// not know about axios or status codes.

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import type {
  ApiError,
  AuthCredentials,
  AuthTokenResponse,
  RawSymbol,
  RawSymbolValue,
  Symbol,
  SymbolValue,
} from '@/types/api';
import { storageService } from './storageService';

export interface ApiServiceConfig {
  baseURL: string;
  timeout?: number;
}

// Called when a 401 sneaks through — App.tsx wires this up to log out.
type UnauthorizedHandler = () => void;

const DEFAULT_TIMEOUT_MS = 10_000;

// Convert anything we caught into the ApiError shape the UI expects.
// Keeps every component free of axios-specific error checks.
function toApiError(err: unknown): ApiError {
  const ts = new Date();

  if (axios.isCancel(err)) {
    return { message: 'Request cancelled', timestamp: ts, cancelled: true };
  }

  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ detail?: string; title?: string }>;
    const status = ax.response?.status;

    // ECONNABORTED = our 10-second timeout fired
    if (ax.code === 'ECONNABORTED') {
      return { message: 'Request timed out', status, timestamp: ts };
    }
    // No response means the request never got there (DNS, refused, offline)
    if (!ax.response) {
      return { message: 'Network connection failed', timestamp: ts };
    }
    if (status === 401) {
      return { message: 'Invalid credentials or session expired', status, timestamp: ts };
    }
    if (status === 403) {
      return { message: 'You do not have permission to perform this action', status, timestamp: ts };
    }
    if (status && status >= 500) {
      return { message: 'Server error — please try again', status, timestamp: ts };
    }
    // Fall back to whatever the server told us in the body
    const detail = ax.response.data?.detail ?? ax.response.data?.title;
    return { message: detail ?? `Request failed (${status})`, status, timestamp: ts };
  }

  return {
    message: err instanceof Error ? err.message : 'Unexpected error',
    timestamp: ts,
  };
}

// API gives us PascalCase. Internally we use camelCase. Map at the boundary
// so nothing past this file has to think about casing.
function mapSymbol(raw: RawSymbol): Symbol {
  return {
    name: raw.Name,
    type: raw.Type,
    description: raw.Description,
  };
}

// Same idea for symbol values. We keep the raw object around as `rawData`
// so the detail modal can still read fields like `q.detailQual`.
function mapSymbolValue(symbolName: string, raw: RawSymbolValue): SymbolValue {
  return {
    symbolName,
    stVal: raw.stVal,
    t: raw.t?.value ?? '',
    // Set on the client, not from the device, so the status pill can age it
    // forward without depending on the device clock.
    lastUpdated: new Date(),
    rawData: raw,
  };
}

export class SELApiService {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt: number | null = null;
  private onUnauthorized: UnauthorizedHandler | null = null;

  constructor(config: ApiServiceConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
    });

    // Request interceptor: attach the bearer to every authenticated call.
    // We skip /auth/token itself here because that one carries Basic auth.
    this.client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
      const isAuthRequest = req.url?.includes('/auth/token');
      if (!isAuthRequest && this.token) {
        req.headers.set('Authorization', `Bearer ${this.token}`);
      }
      return req;
    });

    // Response interceptor: a 401 means the token is dead. Wipe it and
    // tell whoever's listening (App.tsx) so they can show the login form.
    this.client.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        if (err.response?.status === 401 && this.token) {
          this.clearToken();
          this.onUnauthorized?.();
        }
        return Promise.reject(err);
      },
    );

    // If we have a still-valid token from a previous session, restore it so
    // the user doesn't have to log in again on every refresh.
    const saved = storageService.getString('auth-token');
    const expiresAt = storageService.getNumber('auth-token-expires-at');
    if (saved && expiresAt && expiresAt > Date.now()) {
      this.token = saved;
      this.tokenExpiresAt = expiresAt;
    } else {
      // Anything past expiry is junk — clean it up so we don't keep checking.
      storageService.clearAuth();
    }
  }

  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
    this.onUnauthorized = fn;
  }

  setToken(token: string, expiresIn: number): void {
    this.token = token;
    // expiresIn is in seconds (per spec); we store the absolute moment in ms
    // so isTokenValid() can do a simple Date.now() compare.
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    storageService.setString('auth-token', token);
    storageService.setNumber('auth-token-expires-at', this.tokenExpiresAt);
  }

  clearToken(): void {
    this.token = null;
    this.tokenExpiresAt = null;
    storageService.clearAuth();
  }

  isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiresAt) return false;
    return this.tokenExpiresAt > Date.now();
  }

  getToken(): string | null {
    return this.token;
  }

  async authenticate(credentials: AuthCredentials): Promise<boolean> {
    const { username, password } = credentials;
    // serverUrl is informational — the actual transport always goes through
    // /api/v1, where the dev proxy, demo mock, or nginx forward to the device.
    // Hitting a URL from the browser would bypass all three and
    // also trip the device's self-signed cert.
    this.setBaseURL('/api/v1');

    // btoa = base64. Spec asks for `Basic base64(username:password)`.
    const basic = btoa(`${username}:${password}`);
    try {
      const res = await this.client.get<AuthTokenResponse>('/auth/token', {
        headers: { Authorization: `Basic ${basic}` },
      });
      const data = res.data;
      if (!data?.AccessToken) {
        // Defensive — server is supposed to always return this on 200.
        throw toApiError(new Error('Auth response missing AccessToken'));
      }
      this.setToken(data.AccessToken, data.ExpiresIn ?? 3600);
      return true;
    } catch (err) {
      throw toApiError(err);
    }
  }

  async getSymbols(params?: { sort?: 'asc' | 'desc'; limit?: number }): Promise<Symbol[]> {
    const config: AxiosRequestConfig = {
      params: {
        sort: params?.sort ?? 'asc',
        limit: params?.limit ?? 50,
      },
    };
    try {
      const res = await this.client.get<RawSymbol[]>('/logic-engine/symbols', config);
      const list = Array.isArray(res.data) ? res.data : [];
      // Challenge Document says only 16-bit integers (INS). Filter on the raw field before
      // mapping so we don't waste work on rows we'll throw away.
      return list.filter((r) => r.Type === 'INS').map(mapSymbol);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async getSymbolValue(symbolName: string, signal?: AbortSignal): Promise<SymbolValue> {
    try {
      const res = await this.client.get<RawSymbolValue>(
        // Symbol names can include `/` or other URL-unsafe chars in theory.
        `/logic-engine/symbols/${encodeURIComponent(symbolName)}`,
        { signal },
      );
      return mapSymbolValue(symbolName, res.data);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

// One shared instance the whole app uses. We point at /api/v1 so the Vite
// proxy (dev) or nginx (prod) handles the self-signed cert for us.
export const apiService = new SELApiService({ baseURL: '/api/v1' });

// Tests grab these so they can verify the helpers without going through
// the class. Underscore prefix signals "don't import this from app code".
export const __testing = { toApiError, mapSymbol, mapSymbolValue };
