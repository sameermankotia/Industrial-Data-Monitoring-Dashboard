import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { storageService } from '@/services/storageService';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import styles from './UserMenu.module.css';

export type ThemePreference = 'auto' | 'light' | 'dark';

interface Props {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  autoStartPolling: boolean;
  onAutoStartChange: (value: boolean) => void;
}

export default function UserMenu({
  theme,
  onThemeChange,
  autoStartPolling,
  onAutoStartChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // close the dropdown when clicking outside it or pressing Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleLanguageChange = (lng: SupportedLanguage) => {
    void i18n.changeLanguage(lng);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`btn btn-ghost ${styles.trigger}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={`bi bi-gear-fill ${styles.gear}`} aria-hidden="true" />
        <span>{t('actions.settings')}</span>
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.section}>
            <div className={styles.label}>{t('theme.label')}</div>
            <div className={styles.segmented}>
              {(['auto', 'light', 'dark'] as ThemePreference[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.segment} ${theme === opt ? styles.segmentActive : ''}`}
                  onClick={() => onThemeChange(opt)}
                  aria-pressed={theme === opt}
                >
                  {t(`theme.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.label}>{t('language.label')}</div>
            <div className={styles.segmented}>
              {SUPPORTED_LANGUAGES.map((lng) => (
                <button
                  key={lng}
                  type="button"
                  className={`${styles.segment} ${
                    i18n.resolvedLanguage === lng ? styles.segmentActive : ''
                  }`}
                  onClick={() => handleLanguageChange(lng)}
                  aria-pressed={i18n.resolvedLanguage === lng}
                >
                  {t(`language.${lng}`)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={autoStartPolling}
                onChange={(e) => {
                  onAutoStartChange(e.target.checked);
                  storageService.setBoolean('auto-start-polling', e.target.checked);
                }}
              />
              <span>{t('dashboard:settings.autoStart')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
