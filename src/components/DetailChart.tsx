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

interface ThresholdConfig {
  minThreshold: number;
  maxThreshold: number;
  minLabel: string;
  maxLabel: string;
}


const THRESHOLD_MAP: Record<string, ThresholdConfig > = {
  'AmbientTemperature : {
    minThreshold: 32,
    maxThreshold: 80,
    minLabel : 'Min Safe temp (32)',
    maxLabel : 'Max safe Temperature (80)'
},

const getColorForValue =(Value: number , threshold: ThresholdConfig): string => {
  if (value < threshold.minThreshold){
    return '#2196F3';
  }else if (value > threshold.maxThreshold) {
    return '#ecf321';
  }else{
    return '#f32125';
  }
}

const isWithinSafeRange = (value: number, threshold: Thresholdconfig): boolean => {
  return value >= threshold.minThreshold && value <= threshold.maxThreshold;
};


const getStatusText = (value: number, threshold: Thresholdconfig): string => {
  if (value < threshold.minThreshold){
    return 'Below minimum (${threshold.minThreshold})';
  }else if (value > threshold.maxThreshold) {
    return 'Above maximum (${threshold.maxThreshold})';
  }else{
    return 'safe Range';
  }
};


interface Props {
  symbolName: string;
  history: SymbolHistory | undefined;
  lng: string;
}

export default function DetailChart({ symbolName, history, lng }: Props) {
  const { t } = useTranslation('dashboard');

  const threshold = THRESHOLD_MAP[symbolName] || {
    minThreshold:0,
    maxThreshold: 100,
    minLabel: 'Minimum threshold',
    maxLabel: 'Maximum threshold'
  };







  const chartData = useMemo(() => {
    const points = history?.dataPoints ?? [];
    
    if (points.length === 0) {
      return{
        labels: [],
        datasets : [
          {
            label:symbolName,
            data:[],
            borderColor: '#f32125',
            backgroundColor: 'rbga(25, 118, 210. 0.2)'
            fill: true,
            tension:0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderwidth :2,
          }
        ]  
      }
    };
    
    
    
    
    
    
    
    
    
    
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




      segment: {
        bordercolor:(Ctx: nay) => {
          const value = Ctx.p1DataIndex !== undefined ? points[Ctx.p1DataIndex]?.value:0;
          return getColorForValue(value, threshold);
        }
      },

      pointBackgroundColor: (ctx: any) => {
        const value = points[ctx.dataIndex]?.value;
        return getColorForValue(value, threshold);
      },

      pointRadius:4,
      pointHoverRadius: 6,
      pointBorderWidth: 2,

    }
  ]


      }, [history, symbolName, threshold]


  const chartOptions = {
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


 
