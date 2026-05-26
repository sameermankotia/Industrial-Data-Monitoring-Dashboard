import { useMemo } from 'react';
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

import type { SymbolHistory } from '@/types/api';
import { formatNumber } from '@/utils/formatters';
import styles from './css/DetailChart.module.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Title, Filler);

interface ThresholdConfig {
  minThreshold: number;
  maxThreshold: number;
  minLabel: string;
  maxLabel: string;
}

const THRESHOLD_MAP: Record<string, ThresholdConfig> = {
  AmbientTemperature: {
    minThreshold: 5,
    maxThreshold: 45,
    minLabel: 'Min safe ambient (5 °C)',
    maxLabel: 'Max safe ambient (45 °C)',
  },
};

const DEFAULT_THRESHOLD: ThresholdConfig = {
  minThreshold: 0,
  maxThreshold: 100,
  minLabel: 'Minimum threshold',
  maxLabel: 'Maximum threshold',
};

function colorForValue(value: number, cfg: ThresholdConfig): string {
  if (value < cfg.minThreshold) return '#2196F3';
  if (value > cfg.maxThreshold) return '#C8102E';
  return '#27AE60';
}

interface Props {
  symbolName: string;
  history: SymbolHistory | undefined;
  lng: string;
}

export default function DetailChart({ symbolName, history, lng }: Props) {
  const { t } = useTranslation('dashboard');
  const threshold = THRESHOLD_MAP[symbolName] ?? DEFAULT_THRESHOLD;

  const chartData = useMemo(() => {
    const points = history?.dataPoints ?? [];

    return {
      labels: points.map((p) => p.formattedTime),
      datasets: [
        {
          label: symbolName,
          data: points.map((p) => p.value),
          borderColor: '#00A3E0',
          backgroundColor: 'rgba(0, 163, 224, 0.10)',
          borderWidth: 2,
          fill: true,
          tension: 0.32,
          segment: {
            borderColor: (ctx: any) => {
              const v = points[ctx.p1DataIndex]?.value;
              return v != null ? colorForValue(v, threshold) : '#00A3E0';
            },
          },

          pointBackgroundColor: (ctx: any) => {
            const v = points[ctx.dataIndex]?.value;
            return v != null ? colorForValue(v, threshold) : '#00A3E0';
          },
          pointBorderColor: (ctx: any) => {
            const v = points[ctx.dataIndex]?.value;
            return v != null ? colorForValue(v, threshold) : '#00A3E0';
          },
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [history, symbolName, threshold]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
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
          afterLabel: (ctx: TooltipItem<'line'>) => {
            const v = ctx.parsed.y;
            if (v == null) return '';
            if (v < threshold.minThreshold) return `↓ ${threshold.minLabel}`;
            if (v > threshold.maxThreshold) return `↑ ${threshold.maxLabel}`;
            return '';
          },
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
  }), [threshold, lng]);

  return (
    <section className={styles.chartCard}>
      <h3 className={styles.sectionTitle}>{t('detail.history')}</h3>
      <div className={styles.chartWrap}>
        {chartData.labels.length === 0 ? (
          <p className={styles.empty}>{t('detail.noHistory')}</p>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
      <div className={styles.thresholdLegend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: '#2196F3' }} />
          {threshold.minLabel}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: '#27AE60' }} />
          {t('common:normal')}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: '#C8102E' }} />
          {threshold.maxLabel}
        </span>
      </div>
    </section>
  );
}
