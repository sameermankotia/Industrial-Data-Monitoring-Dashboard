// display helpers kept outside components for testability and reuse across dashboard, modal, and connection bar

import { STATUS_THRESHOLDS, type SymbolStatus } from '@/types/api';

// loose t() shape; pinning to one namespace caused TS errors when callers used cross-namespace keys
type Translate = (key: string, options?: Record<string, unknown>) => string;

// status derived from client receive-time, not the device clock, so the UI stays honest if the device stops
export function deriveStatus(lastUpdated: Date | undefined, now = Date.now()): SymbolStatus {
  if (!lastUpdated) return 'inactive';
  const diff = now - lastUpdated.getTime();
  if (diff < STATUS_THRESHOLDS.activeMs) return 'active';
  if (diff < STATUS_THRESHOLDS.staleMs) return 'stale';
  return 'inactive';
}

// produces "30 seconds ago" / "5 minutes ago" etc. via i18n so en/es both render correctly
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

// formats ISO  (HH:MM:SS) in user's locale; returns raw string on parse failure.
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
    // Some locales aren't supported on every browser fall back to ISO.
    return d.toISOString();
  }
}

// locale-aware number formatting for table and detail modal
export function formatNumber(value: number | undefined, locale: string): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}
