import { useTranslation } from 'react-i18next';

import type { SymbolValue } from '@/types/api';
import { deriveStatus, formatNumber, formatRelativeTime, formatTimestamp } from '@/utils/formatters';
import styles from './css/DetailStatBlock.module.css';

interface Props {
  value: SymbolValue | undefined;
  lng: string;
}

export default function DetailStatBlock({ value, lng }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);

  const raw = value?.rawData;
  const status = value && value.lastUpdated.getTime() > 0
    ? deriveStatus(value.lastUpdated)
    : 'inactive';

  return (
    <div className={styles.statBlock}>
      <Stat label={t('dashboard:detail.currentValue')}>
        <span className={styles.bigValue}>
          {value && value.lastUpdated.getTime() > 0
            ? formatNumber(value.stVal, lng)
            : '—'}
        </span>
        {raw?.units && <span className={styles.unit}>{raw.units}</span>}
      </Stat>

      <Stat label={t('dashboard:detail.status')}>
        <span className={`pill pill-${status}`}>{t(`status.${status}`)}</span>
        {raw?.range && (
          <span className={styles.muted}>{t(`range.${raw.range}` as never)}</span>
        )}
      </Stat>

      <Stat label={t('dashboard:detail.quality')}>
        <span
          className={styles.qualityDot}
          data-quality={raw?.q?.validity ?? 'unknown'}
          aria-hidden="true"
        />
        <span>{t(`quality.${raw?.q?.validity ?? 'unknown'}` as never)}</span>
      </Stat>

      <Stat label={t('dashboard:detail.lastUpdated')}>
        <span>{formatTimestamp(value?.t, lng)}</span>
        <span className={styles.muted}>
          {value && value.lastUpdated.getTime() > 0
            ? formatRelativeTime(value.lastUpdated, t)
            : t('status.neverUpdated')}
        </span>
      </Stat>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{children}</span>
    </div>
  );
}
