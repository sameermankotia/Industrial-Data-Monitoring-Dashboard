import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { SymbolHistory, SymbolValue } from '@/types/api';
import DetailStatBlock from './DetailStatBlock';
import DetailChart from './DetailChart';
import DetailMetaGrid from './DetailMetaGrid';
import QualityFlagList from './QualityFlagList';
import styles from './css/SymbolDetailView.module.css';

interface Props {
  open: boolean;
  symbolName: string | null;
  value: SymbolValue | undefined;
  history: SymbolHistory | undefined;
  onClose: () => void;
}

export default function SymbolDetailView({ open, symbolName, value, history, onClose }: Props) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus(); // move focus into modal on open for keyboard accessibility
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden'; // prevent background scroll while modal is open
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !symbolName) return null;

  const lng = i18n.resolvedLanguage ?? 'en';
  const raw = value?.rawData;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="detail-title" className={styles.title}>{symbolName}</h2>
            {raw?.d && <p className={styles.tagline}>{raw.d}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('actions.close')}
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <DetailStatBlock value={value} lng={lng} />
          <DetailChart symbolName={symbolName} history={history} lng={lng} />
          <DetailMetaGrid value={value} lng={lng} />
          <QualityFlagList value={value} />
        </div>
      </div>
    </div>
  );
}
