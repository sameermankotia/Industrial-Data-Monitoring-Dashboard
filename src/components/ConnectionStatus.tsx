import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '@/utils/formatters';
import type { ConnectionStatus as ConnState, PollingState } from '@/types/api';
import styles from './css/ConnectionStatus.module.css';

interface Props {
  connection: ConnState;
  polling: PollingState;
  username: string;
  serverUrl: string;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function ConnectionStatus({
  connection,
  polling,
  username,
  serverUrl,
  loading,
  onRefresh,
  onLogout,
}: Props) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [, setTick] = useState(0);

  // bump a counter every second so the "X ago" label rerenders without actually refetching
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // if there's a specific error message from the API use that, otherwise fall back to the generic string
  const dotClass = connection.isConnected ? styles.dotConnected : styles.dotDisconnected;
  const statusText = connection.isConnected
    ? t('status.connected')
    : connection.error ?? t('status.disconnected');

  const lastPollLabel = polling.lastPoll
    ? t('status.lastUpdated', { value: formatRelativeTime(polling.lastPoll, t) })
    : t('status.neverUpdated');

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.left}>
          <span className={styles.statusBlock}>
            <span className={`${styles.dot} ${dotClass}`} aria-hidden="true" />
            <span className={styles.statusText}>{statusText}</span>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.meta}>{t('dashboard:header.user', { username })}</span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.meta} title={serverUrl}>
            {t('dashboard:header.server', { server: serverUrl })}
          </span>
        </div>

        <div className={styles.right}>
          <span className={styles.lastPoll}>{lastPollLabel}</span>
          <button
            type="button"
            className={`btn ${styles.actionBtn}`}
            onClick={onRefresh}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            {t('actions.refresh')}
          </button>
          <button
            type="button"
            className={`btn btn-danger-outline ${styles.actionBtn}`}
            onClick={onLogout}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
            {t('actions.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
