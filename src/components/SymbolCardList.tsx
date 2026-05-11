import { useTranslation } from 'react-i18next';

import type { Row } from './SymbolTable';
import { formatNumber, formatRelativeTime } from '@/utils/formatters';
import styles from './css/SymbolCardList.module.css';

type SymbolStatus = Row['status'];

const STATUS_PILL: Record<SymbolStatus, string> = {
  active: 'pill pill-active',
  stale: 'pill pill-stale',
  inactive: 'pill pill-inactive',
};

interface Props {
  loading: boolean;
  symbolCount: number;
  pageRows: Row[];
  lng: string;
  onSelectSymbol: (name: string) => void;
}

export default function SymbolCardList({
  loading,
  symbolCount,
  pageRows,
  lng,
  onSelectSymbol,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className={styles.cardList} aria-label="Symbol list">
      {loading && symbolCount === 0 && (
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
              {/* epoch=0 means symbol known but never received data */}
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
  );
}
