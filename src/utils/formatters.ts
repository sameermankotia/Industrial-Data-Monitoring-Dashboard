// Small helpers for displaying values. Kept separate from components so
// they're easy to unit test and reuse from the dashboard, the modal, and
// the connection bar.

import { STATUS_THRESHOLDS, type SymbolStatus } from '@/types/api';

// Loose t-function shape so anyone with a useTranslation hook can pass it
// in. Pinning it to a single namespace caused TS errors when the dashboard
// passed its t() to a util that called common-namespace keys.
type Translate = (key: string, options?: Record<string, unknown>) => string;

// Active / Stale / Inactive comes purely from how recently we received
// data — not the device clock. That way the UI stays honest if the device
// stops responding.
export function deriveStatus(lastUpdated: Date | undefined, now = Date.now()): SymbolStatus {
  if (!lastUpdated) return 'inactive';
  const diff = now - lastUpdated.getTime();
  if (diff < STATUS_THRESHOLDS.activeMs) return 'active';
  if (diff < STATUS_THRESHOLDS.staleMs) return 'stale';
  return 'inactive';
}

// "30 seconds ago" / "5 minutes ago" / "2 hours ago"
// so en/es both spell correctly.
export function formatRelativeTime(
  date: Date | undefined,
  t: Translate,
  now = Date.now(),
): string {
  if (!date) return t('status.neverUpdated');
  const diffMs = now - date.getTime();
  // Floor at 1 so we never render "0 seconds ago" right after a poll.
  const seconds = Math.max(1, Math.floor(diffMs / 1000));

  if (seconds < 60) return t('time.secondsAgo', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  return t('time.hoursAgo', { count: hours });
}

// Format an ISO string as HH:MM:SS in the user's locale.
// Returns the raw string if it can't be parsed, em-dash if it's missing.
export function formatTimestamp(iso: string | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    // Some locales aren't supported on every browser — fall back to ISO.
    return d.toISOString();
  }
}

// Locale-aware number formatting (commas in en, periods in es).
// Used in the dashboard table and the detail modal.
export function formatNumber(value: number | undefined, locale: string): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}
