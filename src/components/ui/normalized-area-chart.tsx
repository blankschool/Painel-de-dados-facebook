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

interface NormalizedAreaChartProps {
  title: string;
  legendItems: LegendItem[];
  chartData: ChartSeries[];
  colorScheme?: string[];
  height?: number;
}

export const NormalizedAreaChart: React.FC<NormalizedAreaChartProps> = ({
  title,
  legendItems,
  chartData,
  colorScheme = ['#FAE5F6', '#EE4094', '#BB015A'],
  height = 200,
}) => {
  // Validate and sanitize data
  const validatedData = chartData.map(series => ({
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        
        {/* Legend */}
        <div className="flex items-center gap-3">
          {legendItems.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }} className="w-full">
        <StackedNormalizedAreaChart
          data={validatedData as any}
          xAxis={
            <LinearXAxis
              type="time"
              tickSeries={
                <LinearXAxisTickSeries
                  label={
                    <LinearXAxisTickLabel
                      format={(v) => new Date(v).toLocaleDateString('pt-BR', { month: 'numeric', day: 'numeric' })}
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
                        <GradientStop key="start" offset="0%" stopOpacity={0.4} />,
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
    </motion.div>
  );
};

export default NormalizedAreaChart;
