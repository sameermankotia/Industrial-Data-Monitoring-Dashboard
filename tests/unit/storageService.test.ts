// verifies prefix isolation, typed parsing, and that corrupted localStorage values don't crash the app

import { describe, expect, it } from 'vitest';

import { storageService } from '@/services/storageService';

describe('storageService', () => {
  it('round-trips strings under a prefix', () => {
    storageService.setString('auth-username', 'sameer');
    expect(storageService.getString('auth-username')).toBe('sameer');
    // Just to be sure the saved key actually starts with our prefix.
    expect(window.localStorage.getItem('dashboard:auth-username')).toBe('sameer');
  });

  it('reads numbers safely and returns null on bad data', () => {
    storageService.setNumber('polling-interval', 5000);
    expect(storageService.getNumber('polling-interval')).toBe(5000);

    // Simulating someone hand-editing localStorage with garbage.
    window.localStorage.setItem('dashboard:polling-interval', 'banana');
    expect(storageService.getNumber('polling-interval')).toBeNull();
  });

  it('handles booleans', () => {
    storageService.setBoolean('remember-credentials', true);
    expect(storageService.getBoolean('remember-credentials')).toBe(true);

    storageService.setBoolean('remember-credentials', false);
    expect(storageService.getBoolean('remember-credentials')).toBe(false);
  });

  it('returns null when nothing is stored', () => {
    expect(storageService.getString('auth-token')).toBeNull();
    expect(storageService.getNumber('auth-token-expires-at')).toBeNull();
    expect(storageService.getBoolean('auto-start-polling')).toBeNull();
  });

  it('clears auth specifically', () => {
    storageService.setString('auth-token', 'abc');
    storageService.setNumber('auth-token-expires-at', Date.now() + 1000);
    storageService.setString('auth-username', 'should-stay');

    storageService.clearAuth();

    // Auth gone, but we should NOT have wiped the saved username.
    expect(storageService.getString('auth-token')).toBeNull();
    expect(storageService.getNumber('auth-token-expires-at')).toBeNull();
    expect(storageService.getString('auth-username')).toBe('should-stay');
  });
});
