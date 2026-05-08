// Thin wrapper around localStorage. This why I have this file:
//   1. Centralizes the try/catch (private mode / quota errors throw).
//   2. Adds a typed key list so a typo gives a TS error, not silent failure.

// Prefix keeps our keys from colliding with anything else on localhost
// during dev (other apps, browser extensions, etc).
const PREFIX = 'dashboard:';

// Anything I persist goes through here. Adding a new key? We can add it to this
type StorageKey =
  | 'auth-token'
  | 'auth-token-expires-at'
  | 'auth-server-url'
  | 'auth-username'
  | 'remember-credentials'
  | 'theme'
  | 'language'
  | 'polling-interval'
  | 'auto-start-polling';

function readRaw(key: StorageKey): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    // Treat as "not stored" — the app still works without persistence.
    return null;
  }
}

function writeRaw(key: StorageKey, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Quota exceeded or private mode — drop quietly, don't break the UI.
  }
}

function removeRaw(key: StorageKey): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}

// Public surface. Each get* returns null when nothing's stored OR when
// the stored value can't be parsed (e.g. someone hand-edited localStorage).
export const storageService = {
  getString(key: StorageKey): string | null {
    return readRaw(key);
  },

  setString(key: StorageKey, value: string): void {
    writeRaw(key, value);
  },

  getNumber(key: StorageKey): number | null {
    const raw = readRaw(key);
    if (raw === null) return null;
    const n = Number(raw);
    // Guards against NaN and Infinity sneaking back in as numbers.
    return Number.isFinite(n) ? n : null;
  },

  setNumber(key: StorageKey, value: number): void {
    writeRaw(key, String(value));
  },

  getBoolean(key: StorageKey): boolean | null {
    const raw = readRaw(key);
    if (raw === null) return null;
    return raw === 'true';
  },

  setBoolean(key: StorageKey, value: boolean): void {
    writeRaw(key, value ? 'true' : 'false');
  },

  remove(key: StorageKey): void {
    removeRaw(key);
  },

  // Convenience for the logout flow. It clears just the auth pair without
  // wiping theme/language/polling preferences too.
  clearAuth(): void {
    removeRaw('auth-token');
    removeRaw('auth-token-expires-at');
  },
};

export type { StorageKey };
