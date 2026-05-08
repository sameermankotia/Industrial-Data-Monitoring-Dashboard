// All the type definitions for the app live here. The API service, the
// polling hook, and the UI all import from this file so we have one source
// of truth for what a Symbol or a SymbolValue looks like.

// What the user types in on the login screen.
export interface AuthCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

// Shape of the JSON the server returns when auth succeeds. PascalCase comes
// straight from the API — we keep it as-is here and convert to camelCase
// when storing the token.
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

// Raw symbol from GET /logic-engine/symbols (PascalCase — keep separate
// from the camelCase Symbol below so the boundary is obvious).
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

// IEC 61850 quality flag. The device tells us if the value is trustworthy.
export type QualityValidity = 'good' | 'invalid' | 'questionable';

// The full quality object from the device. We mostly only care about
// `validity`, but the detail flags drive the quality grid in the modal.
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

// Timestamp object the device sends. We pull `value` for display and keep
// the rest for the quality details panel.
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

// What the dashboard table actually renders. `lastUpdated` is set on the
// client (when we receive the response) so the status pill can age it
// forward without needing the device clock.
export interface SymbolValue {
  symbolName: string;
  stVal: number;
  t: string;
  lastUpdated: Date;
  rawData?: RawSymbolValue;
}

// One point on the chart. We build these client-side because there's no
// history endpoint.
export interface SymbolHistoryPoint {
  value: number;
  timestamp: Date;
  formattedTime: string;
}

// All the history we have for one symbol. Capped at maxPoints so memory
// doesn't grow forever.
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

// Friendly error shape. The API service maps any axios error into this so
// the UI never has to know about HTTP status codes.
export interface ApiError {
  message: string;
  status?: number;
  timestamp: Date;
  cancelled?: boolean;
}

// What the status pill on each row shows.
export type SymbolStatus = 'active' | 'stale' | 'inactive';

// Anything updated within 30s = active, 30-60s = stale, 60s+ = inactive.
// Used by formatters.deriveStatus.
export const STATUS_THRESHOLDS = {
  activeMs: 30_000,
  staleMs: 60_000,
} as const;

// Chart caps. 50 points at 2s polling = a 100s window in the worst case;
// HISTORY_WINDOW_MS gives us the 5-minute outer cap mentioned in the spec.
export const HISTORY_MAX_POINTS = 50;
export const HISTORY_WINDOW_MS = 5 * 60 * 1000;
