'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  StackedNormalizedAreaChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  StackedNormalizedAreaSeries,
  Line,
  Area,
  Gradient,
  GradientStop,
  GridlineSeries,
  Gridline,
} from 'reaviz';
import { TrendingUp, TrendingDown, Eye, Heart, MessageCircle } from 'lucide-react';

// Type definitions
interface ChartDataPoint {
  key: Date;
  data: number;
}

interface ChartSeries {
  key: string;
  data: ChartDataPoint[];
}

interface LegendItem {
  name: string;
  color: string;
}

interface MetricInfo {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: 'up' | 'down';
  trendColor: string;
  delay: number;
}

interface DetailedNormalizedReportProps {
  title?: string;
  legendItems?: LegendItem[];
  chartData?: ChartSeries[];
  colorScheme?: string[];
  metrics?: MetricInfo[];
  height?: number;
}

// Default data and constants
const DEFAULT_LEGEND_ITEMS: LegendItem[] = [
  { name: 'Alcance', color: '#3B82F6' },
  { name: 'Impressões', color: '#8B5CF6' },
  { name: 'Engajamento', color: '#EC4899' },
];

const DEFAULT_COLOR_SCHEME = ['#3B82F6', '#8B5CF6', '#EC4899'];

const generateDate = (offsetDays: number): Date => {
  const now = new Date();
  const date = new Date(now);
  date.setDate(now.getDate() - offsetDays);
  return date;
};

const generateDefaultChartData = (): ChartSeries[] => [
  {
    key: 'Alcance',
    data: Array.from({ length: 7 }, (_, i) => ({ 
      key: generateDate(6 - i), 
      data: Math.floor(Math.random() * 2000) + 1000 
    })),
  },
  {
    key: 'Impressões',
    data: Array.from({ length: 7 }, (_, i) => ({ 
      key: generateDate(6 - i), 
      data: Math.floor(Math.random() * 3000) + 1500 
    })),
  },
  {
    key: 'Engajamento',
    data: Array.from({ length: 7 }, (_, i) => ({ 
      key: generateDate(6 - i), 
      data: Math.floor(Math.random() * 500) + 100 
    })),
  },
];

const DEFAULT_METRICS: MetricInfo[] = [
  {
    id: 'reach',
    icon: <Eye className="h-5 w-5" />,
    label: 'Alcance Médio',
    value: '12.5K',
    trend: 'up',
    trendColor: '#22C55E',
    delay: 0,
  },
  {
    id: 'engagement',
    icon: <Heart className="h-5 w-5" />,
    label: 'Taxa de Engajamento',
    value: '4.2%',
    trend: 'up',
    trendColor: '#22C55E',
    delay: 0.05,
  },
  {
    id: 'comments',
    icon: <MessageCircle className="h-5 w-5" />,
    label: 'Comentários/Post',
    value: '24',
    trend: 'down',
    trendColor: '#EF4444',
    delay: 0.1,
  },
];

const TrendIcon: React.FC<{ trend: 'up' | 'down'; color: string }> = ({ trend, color }) => {
  const Icon = trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <div 
      className="flex items-center justify-center w-8 h-8 rounded-xl"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
  );
};

const DetailedNormalizedIncidentReport: React.FC<DetailedNormalizedReportProps> = ({
  title = 'Relatório de Performance',
  legendItems = DEFAULT_LEGEND_ITEMS,
  chartData,
  colorScheme = DEFAULT_COLOR_SCHEME,
  metrics = DEFAULT_METRICS,
  height = 220,
}) => {
  const data = chartData || generateDefaultChartData();
  
  // Validate and sanitize data
  const validatedData = data.map(series => ({
    ...series,
    data: series.data.map(item => ({
      ...item,
      data: (typeof item.data !== 'number' || isNaN(item.data)) ? 0 : item.data,
    })),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-3xl p-6 shadow-sm border border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        
        {/* Legend */}
        <div className="flex items-center gap-4">
          {legendItems.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }} className="w-full mb-6">
        <StackedNormalizedAreaChart
          data={validatedData as any}
          xAxis={
            <LinearXAxis
              type="time"
              tickSeries={
                <LinearXAxisTickSeries
                  label={
                    <LinearXAxisTickLabel
                      format={(v) => new Date(v).toLocaleDateString('pt-BR', { 
                        month: 'numeric', 
                        day: 'numeric' 
                      })}
                      fill="hsl(var(--muted-foreground))"
                    />
                  }
                  tickSize={10}
                />
              }
            />
          }
          yAxis={
            <LinearYAxis
              tickSeries={<LinearYAxisTickSeries tickSize={0} />}
            />
          }
          series={
            <StackedNormalizedAreaSeries
              line={<Line strokeWidth={2} />}
              area={
                <Area
                  gradient={
                    <Gradient
                      stops={[
                        <GradientStop key="start" offset="0%" stopOpacity={0.5} />,
                        <GradientStop key="end" offset="100%" stopOpacity={0.1} />,
                      ]}
                    />
                  }
                />
              }
              colorScheme={colorScheme}
            />
          }
          gridlines={<GridlineSeries line={<Gridline strokeDasharray="3 3" />} />}
        />
      </div>

      {/* Metrics List */}
      <div className="space-y-3">
        {metrics.map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: metric.delay, duration: 0.3 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                {metric.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{metric.label}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-foreground">{metric.value}</span>
              <TrendIcon trend={metric.trend} color={metric.trendColor} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default DetailedNormalizedIncidentReport;
