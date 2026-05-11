import { useTranslation } from 'react-i18next';

import type { SymbolValue } from '@/types/api';
import styles from './css/QualityFlagList.module.css';

interface Props {
  value: SymbolValue | undefined;
}

export default function QualityFlagList({ value }: Props) {
  const { t } = useTranslation('dashboard');
  const raw = value?.rawData;
  const detail = raw?.q?.detailQual;

  if (!detail) return null;

  return (
    <section>
      <h3 className={styles.sectionTitle}>{t('detail.qualityDetails')}</h3>
      <ul className={styles.flagList}>
        <Flag label={t('detail.qualityFlags.operatorBlocked')} active={raw?.q?.operatorBlocked} bad />
        <Flag label={t('detail.qualityFlags.test')} active={raw?.q?.test} />
        <Flag label={t('detail.qualityFlags.overflow')} active={detail.overflow} bad />
        <Flag label={t('detail.qualityFlags.outOfRange')} active={detail.outOfRange} bad />
        <Flag label={t('detail.qualityFlags.badReference')} active={detail.badReference} bad />
        <Flag label={t('detail.qualityFlags.oscillatory')} active={detail.oscillatory} bad />
        <Flag label={t('detail.qualityFlags.failure')} active={detail.failure} bad />
        <Flag label={t('detail.qualityFlags.oldData')} active={detail.oldData} bad />
        <Flag label={t('detail.qualityFlags.inconsistent')} active={detail.inconsistent} bad />
        <Flag label={t('detail.qualityFlags.inaccurate')} active={detail.inaccurate} bad />
        <Flag
          label={
            raw?.t?.clockNotSynchronized
              ? t('detail.qualityFlags.clockNotSync')
              : t('detail.qualityFlags.clockSync')
          }
          active={raw?.t?.clockNotSynchronized}
          bad={raw?.t?.clockNotSynchronized}
        />
      </ul>
    </section>
  );
}

function Flag({
  label,
  active,
  bad = false,
}: {
  label: string;
  active: boolean | undefined;
  bad?: boolean;
}) {
  const tone = active ? (bad ? styles.flagBad : styles.flagOk) : styles.flagIdle;
  return (
    <li className={`${styles.flag} ${tone}`}>
      <span className={styles.flagDot} aria-hidden="true" />
      <span>{label}</span>
    </li>
  );
}
