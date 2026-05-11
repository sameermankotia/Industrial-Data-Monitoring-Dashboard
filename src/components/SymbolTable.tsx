import { useTranslation } from 'react-i18next';

import type { Symbol, SymbolValue, SymbolStatus } from '@/types/api';
import { formatNumber, formatRelativeTime, formatTimestamp } from '@/utils/formatters';
import styles from './css/SymbolTable.module.css';

export type SortKey = 'name' | 'value';
export type SortDir = 'asc' | 'desc';

export interface Row {
  symbol: Symbol;
  value: SymbolValue | undefined;
  status: SymbolStatus;
}

const STATUS_PILL: Record<SymbolStatus, string> = {
  active: 'pill pill-active',
  stale: 'pill pill-stale',
  inactive: 'pill pill-inactive',
};

interface Props {
  loading: boolean;
  symbolCount: number;
  pageRows: Row[];
  sortKey: SortKey;
  sortDir: SortDir;
  lng: string;
  onToggleSort: (key: SortKey) => void;
  onSelectSymbol: (name: string) => void;
}

export default function SymbolTable({
  loading,
  symbolCount,
  pageRows,
  sortKey,
  sortDir,
  lng,
  onToggleSort,
  onSelectSymbol,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
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
              onToggle={() => onToggleSort('name')}
              ariaTooltip={t('dashboard:table.sortBy', { column: t('dashboard:table.symbol') })}
            />
            <SortHeader
              label={t('dashboard:table.value')}
              active={sortKey === 'value'}
              dir={sortDir}
              onToggle={() => onToggleSort('value')}
              ariaTooltip={t('dashboard:table.sortBy', { column: t('dashboard:table.value') })}
            />
            <th scope="col">{t('dashboard:table.timestamp')}</th>
            <th scope="col" className={styles.colHideTablet}>{t('dashboard:table.lastUpdated')}</th>
            <th scope="col">{t('dashboard:table.status')}</th>
          </tr>
        </thead>
        <tbody>
          {loading && symbolCount === 0 && (
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
                  e.preventDefault(); // prevent Space from scrolling the page
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
          <span className={`${styles.arrow} ${active && dir === 'asc' ? styles.arrowActive : ''}`}>
            ▲
          </span>
          <span className={`${styles.arrow} ${active && dir === 'desc' ? styles.arrowActive : ''}`}>
            ▼
          </span>
        </span>
      </button>
    </th>
  );
}
