import { useTranslation } from 'react-i18next';

import type { SymbolValue } from '@/types/api';
import { formatNumber } from '@/utils/formatters';
import styles from './css/DetailMetaGrid.module.css';

interface Props {
  value: SymbolValue | undefined;
  lng: string;
}

export default function DetailMetaGrid({ value, lng }: Props) {
  const { t } = useTranslation('dashboard');
  const raw = value?.rawData;

  return (
    <section className={styles.metaGrid}>
      <MetaItem label={t('detail.description')} value={raw?.d} />
      <MetaItem label={t('detail.type')} value="INS (16-bit Integer)" />{/* type absent from API; hardcoded per the spec document */}
      <MetaItem label={t('detail.units')} value={raw?.units} />
      <MetaItem
        label={t('detail.multiplier')}
        value={raw?.multiplier !== undefined ? formatNumber(raw.multiplier, lng) : undefined}
      />
    </section>
  );
}

export function MetaItem({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value ?? '—'}</span>
    </div>
  );
}
