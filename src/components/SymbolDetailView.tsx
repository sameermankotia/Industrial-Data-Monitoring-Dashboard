import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Title,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import type { SymbolHistory, SymbolValue } from '@/types/api';
import { deriveStatus, formatNumber, formatRelativeTime, formatTimestamp } from '@/utils/formatters';
import styles from './SymbolDetailView.module.css';


ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Title, Filler);

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
    closeRef.current?.focus(); // putting focus on the close button for keyboard users
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // lock page scroll when the modal is open so background doesn't drift
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const lng = i18n.resolvedLanguage ?? 'en';

  // build the chart dataset 
  const chartData = useMemo(() => {
    const points = history?.dataPoints ?? [];
    return {
      labels: points.map((p) => p.formattedTime),
      datasets: [
        {
          label: symbolName ?? '',
          data: points.map((p) => p.value),
          borderColor: '#00A3E0',
          backgroundColor: 'rgba(0, 163, 224, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.32,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [history, symbolName]);

  if (!open || !symbolName) return null;

  const raw = value?.rawData;
  const status = value && value.lastUpdated.getTime() > 0
    ? deriveStatus(value.lastUpdated)
    : 'inactive';
  const validity = raw?.q?.validity;
  const detail = raw?.q?.detailQual;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 26, 42, 0.92)',
        padding: 10,
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: TooltipItem<'line'>) =>
            formatNumber(ctx.parsed.y ?? undefined, lng),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(122, 136, 150, 0.9)', maxTicksLimit: 6 },
      },
      y: {
        grid: { color: 'rgba(122, 136, 150, 0.18)' },
        ticks: { color: 'rgba(122, 136, 150, 0.9)' },
      },
    },
  };

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
            <h2 id="detail-title" className={styles.title}>
              {symbolName}
            </h2>
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
                data-quality={validity ?? 'unknown'}
                aria-hidden="true"
              />
              <span>{t(`quality.${validity ?? 'unknown'}` as never)}</span>
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

          <section className={styles.chartCard}>
            <h3 className={styles.sectionTitle}>{t('dashboard:detail.history')}</h3>
            <div className={styles.chartWrap}>
              {chartData.labels.length === 0 ? (
                <p className={styles.empty}>{t('dashboard:detail.noHistory')}</p>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          </section>

          <section className={styles.metaGrid}>
            <MetaItem label={t('dashboard:detail.description')} value={raw?.d} />
            <MetaItem label={t('dashboard:detail.type')} value="INS (16-bit Integer)" />
            <MetaItem label={t('dashboard:detail.units')} value={raw?.units} />
            <MetaItem
              label={t('dashboard:detail.multiplier')}
              value={raw?.multiplier !== undefined ? formatNumber(raw.multiplier, lng) : undefined}
            />
          </section>

          {detail && (
            <section>
              <h3 className={styles.sectionTitle}>{t('dashboard:detail.qualityDetails')}</h3>
              <ul className={styles.flagList}>
                <Flag
                  label={t('dashboard:detail.qualityFlags.operatorBlocked')}
                  active={raw?.q?.operatorBlocked}
                  bad
                />
                <Flag label={t('dashboard:detail.qualityFlags.test')} active={raw?.q?.test} />
                <Flag label={t('dashboard:detail.qualityFlags.overflow')} active={detail.overflow} bad />
                <Flag
                  label={t('dashboard:detail.qualityFlags.outOfRange')}
                  active={detail.outOfRange}
                  bad
                />
                <Flag
                  label={t('dashboard:detail.qualityFlags.badReference')}
                  active={detail.badReference}
                  bad
                />
                <Flag
                  label={t('dashboard:detail.qualityFlags.oscillatory')}
                  active={detail.oscillatory}
                  bad
                />
                <Flag label={t('dashboard:detail.qualityFlags.failure')} active={detail.failure} bad />
                <Flag label={t('dashboard:detail.qualityFlags.oldData')} active={detail.oldData} bad />
                <Flag
                  label={t('dashboard:detail.qualityFlags.inconsistent')}
                  active={detail.inconsistent}
                  bad
                />
                <Flag
                  label={t('dashboard:detail.qualityFlags.inaccurate')}
                  active={detail.inaccurate}
                  bad
                />
                <Flag
                  label={
                    raw?.t?.clockNotSynchronized
                      ? t('dashboard:detail.qualityFlags.clockNotSync')
                      : t('dashboard:detail.qualityFlags.clockSync')
                  }
                  active={raw?.t?.clockNotSynchronized}
                  bad={raw?.t?.clockNotSynchronized}
                />
              </ul>
            </section>
          )}
        </div>
      </div>
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

function MetaItem({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value ?? '—'}</span>
    </div>
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
