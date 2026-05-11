// Single source of truth for all types; API service, polling hook, and UI all import from here

// What the user types in on the login screen.
export interface AuthCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

// raw auth response (PascalCase from API); converted to camelCase in apiService before storing
export interface AuthTokenResponse {
  AccessToken: string;
  ExpiresIn: number;
  Scope: string;
  TokenType: string;
}

// What the server returns on a 401.
export interface AuthErrorResponse {
  title: string;
  status: number;
  detail: string;
}

// raw API shape (PascalCase); kept separate from Symbol so the mapping boundary is explicit
export interface RawSymbol {
  Name: string;
  Type: string;
  Description?: string;
}

// Camel-cased version used everywhere inside the app.
export interface Symbol {
  name: string;
  type: string;
  description?: string;
}

export type QualityValidity = 'good' | 'invalid' | 'questionable';

// validity is the main field; detailQual flags drive the quality grid in the detail modal
export interface RawQuality {
  validity: QualityValidity;
  source: string;
  test: boolean;
  operatorBlocked: boolean;
  detailQual: {
    overflow: boolean;
    outOfRange: boolean;
    badReference: boolean;
    oscillatory: boolean;
    failure: boolean;
    oldData: boolean;
    inconsistent: boolean;
    inaccurate: boolean;
  };
}

// `value` is used for display; clock flags feed the quality details panel
export interface RawTimestamp {
  value: string;
  leapSecondsKnown: boolean;
  clockFailure: boolean;
  clockNotSynchronized: boolean;
  timeAccuracy: number;
  source: string;
}

// What range the value is currently in (normal, high, low, etc).
export type SymbolRange = 'normal' | 'high' | 'low' | 'high-high' | 'low-low';

// Raw shape of GET /logic-engine/symbols/{name}.
export interface RawSymbolValue {
  stVal: number;
  q: RawQuality;
  t: RawTimestamp;
  range: SymbolRange;
  units: string;
  multiplier: number;
  d: string;
}

// `lastUpdated` is client-set on receipt so the status pill can age without the device clock
export interface SymbolValue {
  symbolName: string;
  stVal: number;
  t: string;
  lastUpdated: Date;
  rawData?: RawSymbolValue;
}

// built client-side; no history endpoint exists on the device
export interface SymbolHistoryPoint {
  value: number;
  timestamp: Date;
  formattedTime: string;
}

// capped at maxPoints to prevent unbounded memory growth
export interface SymbolHistory {
  symbolName: string;
  dataPoints: SymbolHistoryPoint[];
  maxPoints: number;
}

// Whether we currently have a working session with the device.
export interface ConnectionStatus {
  isConnected: boolean;
  lastConnection?: Date;
  error?: string;
}

// Polling timer state. Owned by the useSymbolPolling hook.
export interface PollingState {
  isPolling: boolean;
  interval: number;
  lastPoll?: Date;
}

// apiService maps all axios errors into this so the UI never handles HTTP codes directly
export interface ApiError {
  message: string;
  status?: number;
  timestamp: Date;
  cancelled?: boolean;
}

// What the status pill on each row shows.
export type SymbolStatus = 'active' | 'stale' | 'inactive';

// 0-30s = active, 30-60s = stale, 60s+ = inactive; used by formatters.deriveStatus
export const STATUS_THRESHOLDS = {
  activeMs: 30_000,
  staleMs: 60_000,
} as const;

// 50 points × 2s = 100s worst-case window; HISTORY_WINDOW_MS enforces the 5-min outer cap from the spec document.
export const HISTORY_MAX_POINTS = 50;
export const HISTORY_WINDOW_MS = 5 * 60 * 1000;
