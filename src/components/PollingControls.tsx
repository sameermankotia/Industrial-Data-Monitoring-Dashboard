import { useTranslation } from 'react-i18next';
import styles from './css/PollingControls.module.css';

const INTERVAL_OPTIONS = [1000, 2000, 5000, 10_000];

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface Props {
  search: string;
  isPolling: boolean;
  loading: boolean;
  pollingInterval: number;
  pollingStartedAt: number | null;
  onSearchChange: (v: string) => void;
  onTogglePolling: () => void;
  onIntervalChange: (ms: number) => void;
}

export default function PollingControls({
  search,
  isPolling,
  loading,
  pollingInterval,
  pollingStartedAt,
  onSearchChange,
  onTogglePolling,
  onIntervalChange,
}: Props) {
  const { t } = useTranslation('dashboard');

  return (
    <div className={styles.controls}>
      <div className={styles.searchWrap}>
        <i className={`bi bi-search ${styles.searchIcon}`} aria-hidden="true" />
        <input
          type="search"
          className={`field-input ${styles.search}`}
          placeholder={t('controls.search')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('controls.search')}
        />
      </div>

      <div className={styles.pollGroup}>
        {isPolling && pollingStartedAt !== null && (
          <span
            className={styles.elapsedBadge}
            aria-label={t('controls.elapsed', {
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
          {isPolling ? t('controls.stopPolling') : t('controls.startPolling')}
        </button>

        {/* button+role="radio" used over <input type="radio"> to keep segmented-control styling simple */}
        <div
          className={styles.intervalSegment}
          role="radiogroup"
          aria-label={t('controls.intervalLabel')}
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
  );
}
