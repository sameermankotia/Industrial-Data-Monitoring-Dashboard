// Inline error banner. Used when something failed but we don't want to
// blow away the dashboard — e.g. a single failed poll or auth issue.
// Toasts handle the lighter-weight "fyi" cases; this banner is for things
// the user might want to retry.

import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/types/api';
import styles from './ErrorDisplay.module.css';

interface Props {
  error: ApiError | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, onDismiss, onRetry }: Props) {
  const { t } = useTranslation();
  // Render nothing when there's no error so callers can keep this in their
  // tree without conditional logic.
  if (!error) return null;

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.icon} aria-hidden="true">
        !
      </div>
      <div className={styles.body}>
        <strong className={styles.title}>{t('errors.title')}</strong>
        <p className={styles.message}>{error.message}</p>
      </div>
      <div className={styles.actions}>
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            {t('actions.retry')}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className={styles.close}
            aria-label={t('actions.close')}
            onClick={onDismiss}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
