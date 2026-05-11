// Tests for the formatter helpers. Pure functions, so no mocks are needed herw
// just feed in inputs and check the output.

import { describe, expect, it } from 'vitest';

import { deriveStatus, formatNumber, formatRelativeTime, formatTimestamp } from '@/utils/formatters';

// A fake t() so the tests don't pull in real translations. Just returns
// short strings we can match against in expects.
const tStub = (key: string, opts?: Record<string, unknown>) => {
  const count = (opts?.count as number | undefined) ?? 0;
  if (key === 'time.justNow') return 'just now';
  if (key === 'time.secondsAgo') return `${count}s ago`;
  if (key === 'time.minutesAgo') return `${count}m ago`;
  if (key === 'time.hoursAgo') return `${count}h ago`;
  if (key === 'status.neverUpdated') return 'never';
  return key;
};

describe('deriveStatus', () => {
  it('flags recent updates as active', () => {
    const now = Date.now();
    expect(deriveStatus(new Date(now - 5_000), now)).toBe('active');
  });

  it('flags 30–60s old as stale', () => {
    const now = Date.now();
    expect(deriveStatus(new Date(now - 45_000), now)).toBe('stale');
  });

  it('flags 60s+ old as inactive', () => {
    const now = Date.now();
    expect(deriveStatus(new Date(now - 120_000), now)).toBe('inactive');
  });

  it('returns inactive for missing timestamps', () => {
    expect(deriveStatus(undefined)).toBe('inactive');
  });
});

describe('formatRelativeTime', () => {
  it('returns seconds even for very recent updates', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 1_000), tStub, now)).toBe('1s ago');
  });

  it('returns at least 1 second when the diff is essentially zero', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now), tStub, now)).toBe('1s ago');
  });

  it('returns seconds for under one minute', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 30_000), tStub, now)).toBe('30s ago');
  });

  it('returns minutes for under one hour', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 5 * 60_000), tStub, now)).toBe('5m ago');
  });

  it('returns hours for an hour or more', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 2 * 3600_000), tStub, now)).toBe('2h ago');
  });

  it('falls back to "never" when missing', () => {
    expect(formatRelativeTime(undefined, tStub)).toBe('never');
  });
});

describe('formatTimestamp', () => {
  it('formats valid ISO strings as HH:MM:SS', () => {
    const result = formatTimestamp('2024-12-03T14:30:45.000Z', 'en-US');
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('returns em-dash for missing values', () => {
    expect(formatTimestamp(undefined, 'en-US')).toBe('—');
  });

  it('passes through unparseable strings', () => {
    expect(formatTimestamp('not-a-date', 'en-US')).toBe('not-a-date');
  });
});

describe('formatNumber', () => {
  it('formats finite numbers using locale', () => {
    expect(formatNumber(1234, 'en-US')).toBe('1,234');
  });

  it('returns em-dash for undefined', () => {
    expect(formatNumber(undefined, 'en-US')).toBe('—');
  });
});
