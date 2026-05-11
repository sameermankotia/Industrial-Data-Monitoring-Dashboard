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

// Must be called once before any <Line> renders.
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Title, Filler);

interface Props {
  symbolName: string;
  history: SymbolHistory | undefined;
  lng: string;
}

export default function DetailChart({ symbolName, history, lng }: Props) {
  const { t } = useTranslation('dashboard');

  const chartData = useMemo(() => {
    const points = history?.dataPoints ?? [];
    return {
      labels: points.map((p) => p.formattedTime),
      datasets: [
        {
          label: symbolName,
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
    <section className={styles.chartCard}>
      <h3 className={styles.sectionTitle}>{t('detail.history')}</h3>
      <div className={styles.chartWrap}>
        {chartData.labels.length === 0 ? (
          <p className={styles.empty}>{t('detail.noHistory')}</p>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </section>
  );
}
