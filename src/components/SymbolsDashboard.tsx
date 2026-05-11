import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Symbol, SymbolValue, SymbolStatus } from '@/types/api';
import { deriveStatus, formatNumber, formatRelativeTime, formatTimestamp } from '@/utils/formatters';
import { buildCsv, downloadCsv, type CsvRow } from '@/utils/csvExport';
import styles from './SymbolsDashboard.module.css';

type SortKey = 'name' | 'value';
type SortDir = 'asc' | 'desc';

interface Props {
  symbols: Symbol[];
  values: Map<string, SymbolValue>;
  isPolling: boolean;
  pollingInterval: number;
  loading: boolean;
  onTogglePolling: () => void;
  onIntervalChange: (ms: number) => void;
  onSelectSymbol: (name: string) => void;
}

// converts milliseconds into mm:ss (or h:mm:ss if it's been running for an hour+)
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const INTERVAL_OPTIONS = [1000, 2000, 5000, 10_000];


interface Row {
  symbol: Symbol;
  value: SymbolValue | undefined;
  status: SymbolStatus;
}

const STATUS_PILL: Record<SymbolStatus, string> = {
  active: 'pill pill-active',
  stale: 'pill pill-stale',
  inactive: 'pill pill-inactive',
};

export default function SymbolsDashboard({
  symbols,
  values,
  isPolling,
  pollingInterval,
  loading,
  onTogglePolling,
  onIntervalChange,
  onSelectSymbol,
}: Props) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');

  // tick every second so "X ago" labels and the elapsed timer stay current
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // record the start time when polling begins so it can show how long it's been running
  useEffect(() => {
    if (isPolling) {
      setPollingStartedAt((prev) => prev ?? Date.now());
    } else {
      setPollingStartedAt(null);
    }
  }, [isPolling]);

  // combine symbol metadata with its live value and computed status into one object
  const rows: Row[] = useMemo(() => {
    return symbols.map((s) => {
      const value = values.get(s.name);
      const status = value && value.lastUpdated.getTime() > 0
        ? deriveStatus(value.lastUpdated)
        : 'inactive';
      return { symbol: s, value, status };
    });
  }, [symbols, values]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.symbol.name.toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.symbol.name.localeCompare(b.symbol.name);
      } else {
        const av = a.value?.stVal ?? Number.NEGATIVE_INFINITY;
        const bv = b.value?.stVal ?? Number.NEGATIVE_INFINITY;
        cmp = av - bv;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, pageSize]);

  // Keep the page input in sync whenever safePage changes
  useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    // export whatever is currently filtered/sorted so the csv matches what the user sees
    const csvRows: CsvRow[] = sorted.map((r) => ({
      symbolName: r.symbol.name,
      value: r.value,
      status: r.status,
    }));
    const headers = [
      t('dashboard:table.symbol'),
      t('dashboard:table.value'),
      t('dashboard:table.timestamp'),
      t('dashboard:table.lastUpdated'),
      t('dashboard:table.status'),
    ];
    const csv = buildCsv(csvRows, headers);
    // timestamp in the filename so downloaded files don't all overwrite each other
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsv(`industrial-symbols-${stamp}.csv`, csv);
  };

  const intervalSeconds = pollingInterval / 1000;
  const lng = i18n.resolvedLanguage ?? 'en';

  return (
    <section className={styles.wrap}>
      {/* Search + polling controls */}
      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <i className={`bi bi-search ${styles.searchIcon}`} aria-hidden="true" />
          <input
            type="search"
            className={`field-input ${styles.search}`}
            placeholder={t('dashboard:controls.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('dashboard:controls.search')}
          />
        </div>

        <div className={styles.pollGroup}>
          {isPolling && pollingStartedAt !== null && (
            <span
              className={styles.elapsedBadge}
              aria-label={t('dashboard:controls.elapsed', {
                value: formatElapsed(Date.now() - pollingStartedAt),
              })}
            >
              <span className={styles.elapsedDot} aria-hidden="true" />
              <span className={styles.elapsedTime}>
                {formatElapsed(Date.now() - pollingStartedAt)}
              </span>
            </span>
          )}

          <button
            type="button"
            className={`btn ${isPolling ? 'btn-danger-outline' : 'btn-primary'} ${styles.pollBtn}`}
            onClick={onTogglePolling}
            disabled={loading}
          >
            <i
              className={`bi ${isPolling ? 'bi-stop-fill' : 'bi-play-fill'} ${styles.pollIcon}`}
              aria-hidden="true"
            />
            {isPolling ? t('dashboard:controls.stopPolling') : t('dashboard:controls.startPolling')}
          </button>

          <div
            className={styles.intervalSegment}
            role="radiogroup"
            aria-label={t('dashboard:controls.intervalLabel')}
          >
            {INTERVAL_OPTIONS.map((ms) => {
              const active = pollingInterval === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${styles.intervalOption} ${active ? styles.intervalOptionActive : ''}`}
                  onClick={() => onIntervalChange(ms)}
                >
                  {ms / 1000}s
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table — visible on tablet and wider */}
      <div className={`card ${styles.tableWrap}`}>
        <table className={styles.table} role="table">
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader
                label={t('dashboard:table.symbol')}
                active={sortKey === 'name'}
                dir={sortDir}
                onToggle={() => toggleSort('name')}
                ariaTooltip={t('dashboard:table.sortBy', { column: t('dashboard:table.symbol') })}
              />
              <SortHeader
                label={t('dashboard:table.value')}
                active={sortKey === 'value'}
                dir={sortDir}
                onToggle={() => toggleSort('value')}
                ariaTooltip={t('dashboard:table.sortBy', { column: t('dashboard:table.value') })}
              />
              <th scope="col">{t('dashboard:table.timestamp')}</th>
              <th scope="col" className={styles.colHideTablet}>{t('dashboard:table.lastUpdated')}</th>
              <th scope="col">{t('dashboard:table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && symbols.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {t('dashboard:table.loading')}
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {t('dashboard:table.empty')}
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={row.symbol.name}
                className={styles.row}
                onClick={() => onSelectSymbol(row.symbol.name)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSymbol(row.symbol.name);
                  }
                }}
              >
                <td className={styles.symbolCell}>{row.symbol.name}</td>
                <td className={styles.valueCell}>
                  {row.value && row.value.lastUpdated.getTime() > 0
                    ? formatNumber(row.value.stVal, lng)
                    : '—'}
                </td>
                <td>{formatTimestamp(row.value?.t, lng)}</td>
                <td className={styles.colHideTablet}>
                  {row.value && row.value.lastUpdated.getTime() > 0
                    ? formatRelativeTime(row.value.lastUpdated, t)
                    : t('status.neverUpdated')}
                </td>
                <td>
                  <span className={STATUS_PILL[row.status]}>
                    {t(`status.${row.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — replaces the table on small screens */}
      <div className={styles.cardList} aria-label="Symbol list">
        {loading && symbols.length === 0 && (
          <div className={styles.cardEmpty}>{t('dashboard:table.loading')}</div>
        )}
        {!loading && pageRows.length === 0 && (
          <div className={styles.cardEmpty}>{t('dashboard:table.empty')}</div>
        )}
        {pageRows.map((row) => (
          <button
            key={row.symbol.name}
            type="button"
            className={styles.symbolCard}
            onClick={() => onSelectSymbol(row.symbol.name)}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardName}>{row.symbol.name}</span>
              <span className={STATUS_PILL[row.status]}>{t(`status.${row.status}`)}</span>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardValue}>
                {row.value && row.value.lastUpdated.getTime() > 0
                  ? formatNumber(row.value.stVal, lng)
                  : '—'}
              </span>
              <span className={styles.cardMeta}>
                {row.value && row.value.lastUpdated.getTime() > 0
                  ? formatRelativeTime(row.value.lastUpdated, t)
                  : t('status.neverUpdated')}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.count}>
          {t('dashboard:table.showing', { shown: sorted.length, total: symbols.length })}
        </span>

        <div className={styles.pagination}>
          <label className={styles.perPage}>
            <span>{t('dashboard:pagination.perPage')}</span>
            <select
              className={`field-input ${styles.perPageSelect}`}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={t('dashboard:pagination.previous')}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className={styles.pageLabel}>
            <input
              type="number"
              className={`field-input ${styles.pageInput}`}
              value={pageInput}
              min={1}
              max={totalPages}
              aria-label={t('dashboard:pagination.page', { page: safePage, total: totalPages })}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const n = parseInt(pageInput, 10);
                const clamped = isNaN(n) ? safePage : Math.min(Math.max(1, n), totalPages);
                setPage(clamped);
                setPageInput(String(clamped));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const n = parseInt(pageInput, 10);
                  const clamped = isNaN(n) ? safePage : Math.min(Math.max(1, n), totalPages);
                  setPage(clamped);
                  setPageInput(String(clamped));
                  e.currentTarget.blur();
                }
              }}
            />
            <span>/ {totalPages}</span>
          </span>
          <button
            type="button"
            className="btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label={t('dashboard:pagination.next')}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleExport}
            disabled={sorted.length === 0}
          >
            <i className="bi bi-download" aria-hidden="true" />
            {t('actions.exportCsv')}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {isPolling
          ? `Polling every ${intervalSeconds} seconds`
          : 'Polling stopped'}
      </p>
    </section>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onToggle: () => void;
  ariaTooltip: string;
}

function SortHeader({ label, active, dir, onToggle, ariaTooltip }: SortHeaderProps) {
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const className = `${styles.sortHeader} ${active ? styles.sortHeaderActive : ''}`;

  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <button
        type="button"
        className={styles.sortBtn}
        onClick={onToggle}
        title={ariaTooltip}
      >
        <span className={styles.sortLabel}>{label}</span>
        <span className={styles.sortIndicator} aria-hidden="true">
          <span
            className={`${styles.arrow} ${active && dir === 'asc' ? styles.arrowActive : ''}`}
          >
            ▲
          </span>
          <span
            className={`${styles.arrow} ${active && dir === 'desc' ? styles.arrowActive : ''}`}
          >
            ▼
          </span>
        </span>
      </button>
    </th>
  );
}
