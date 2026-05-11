// Inline error banner; toasts handle lighter-weight "fyi" cases

import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/types/api';
import styles from './css/ErrorDisplay.module.css';

interface Props {
  error: ApiError | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, onDismiss, onRetry }: Props) {
  const { t } = useTranslation();
  // returns null so callers can always render this without conditional logic
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
