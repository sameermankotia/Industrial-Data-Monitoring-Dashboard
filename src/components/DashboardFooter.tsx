import { useTranslation } from 'react-i18next';
import styles from './css/DashboardFooter.module.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface Props {
  shownCount: number;
  totalCount: number;
  exportDisabled: boolean;
  pageSize: number;
  safePage: number;
  totalPages: number;
  pageInput: string;
  onPageSizeChange: (n: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageInputChange: (v: string) => void;
  onPageInputCommit: () => void;
  onExport: () => void;
}

export default function DashboardFooter({
  shownCount,
  totalCount,
  exportDisabled,
  pageSize,
  safePage,
  totalPages,
  pageInput,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  onPageInputChange,
  onPageInputCommit,
  onExport,
}: Props) {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className={styles.footer}>
      <span className={styles.count}>
        {t('dashboard:table.showing', { shown: shownCount, total: totalCount })}
      </span>

      <div className={styles.pagination}>
        <label className={styles.perPage}>
          <span>{t('dashboard:pagination.perPage')}</span>
          <select
            className={`field-input ${styles.perPageSelect}`}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
          onClick={onPrevPage}
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
            onChange={(e) => onPageInputChange(e.target.value)}
            onBlur={onPageInputCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onPageInputCommit();
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
          onClick={onNextPage}
          aria-label={t('dashboard:pagination.next')}
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="btn"
          onClick={onExport}
          disabled={exportDisabled}
        >
          <i className="bi bi-download" aria-hidden="true" />
          {t('actions.exportCsv')}
        </button>
      </div>
    </div>
  );
}
