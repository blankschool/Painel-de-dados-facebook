import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

interface StackedBarChartProps {
  data: Array<{
    date: string;
    gained?: number;
    lost?: number;
    net?: number;
    [key: string]: string | number | undefined;
  }>;
  bars: Array<{
    key: string;
    name: string;
    color: string;
    stackId?: string;
  }>;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
  showReferenceLine?: boolean;
}

const defaultFormatter = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

export function StackedBarChart({
  data,
  bars,
  height = 250,
  showLegend = true,
  showGrid = true,
  valueFormatter = defaultFormatter,
  showReferenceLine = false,
}: StackedBarChartProps) {
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '12px',
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
          )}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--foreground))' }}
            formatter={(value: number, name: string) => [valueFormatter(value), name]}
            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
          {showReferenceLine && <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />}
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name}
              fill={bar.color}
              stackId={bar.stackId}
              radius={bar.stackId ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Follower change specific chart
interface FollowerChangeChartProps {
  data: Array<{
    date: string;
    gained: number;
    lost: number;
    net: number;
  }>;
  height?: number;
  variant?: 'stacked' | 'net';
}

export function FollowerChangeChart({
  data,
  height = 250,
  variant = 'stacked',
}: FollowerChangeChartProps) {
  if (variant === 'net') {
    return (
      <StackedBarChart
        data={data}
        bars={[
          { key: 'net', name: 'Variação Líquida', color: 'hsl(var(--primary))' },
        ]}
        height={height}
        showReferenceLine
      />
    );
  }

  return (
    <StackedBarChart
      data={data}
      bars={[
        { key: 'gained', name: 'Ganhos', color: 'hsl(142, 76%, 36%)', stackId: 'stack' },
        { key: 'lost', name: 'Perdidos', color: 'hsl(0, 84%, 60%)', stackId: 'stack' },
      ]}
      height={height}
    />
  );
}
