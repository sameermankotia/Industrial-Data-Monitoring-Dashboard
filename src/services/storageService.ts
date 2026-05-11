// localStorage wrapper: centralises try/catch (private mode throws) and types keys to catch typos at compile time

// prefix avoids key collisions with other apps or extensions sharing localhost
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
    // Treat as "not stored". the app still works without persistence.
    return null;
  }
}

function writeRaw(key: StorageKey, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // If quota exceeded or private mode. drop quietly, don't break the UI.
  }
}

function removeRaw(key: StorageKey): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}

// each get* returns null for missing keys or unparseable values (e.g. hand-edited storage)
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

  // clears only auth keys.
  clearAuth(): void {
    removeRaw('auth-token');
    removeRaw('auth-token-expires-at');
  },
};

export type { StorageKey };
