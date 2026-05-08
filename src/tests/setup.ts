// Vitest runs this once before any test file.

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom's Storage in this version is missing `.clear()`. Swap in an
// in-memory shim so tests can isolate state between cases.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
});

// Making sure every test starts from a clean slate so order doesn't matter.
beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Chart.js calls getContext on canvas; jsdom doesn't have one. I am faking it
// here so any incidental import of a Chart.js component doesn't crash.
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
}

// Some i18n / theme code peeks at matchMedia for prefers-color-scheme.
// Provide a no-op so we don't blow up in jsdom.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
