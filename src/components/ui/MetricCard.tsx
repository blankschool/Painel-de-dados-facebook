import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { MetricTooltip } from './MetricTooltip';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  tooltip: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  tooltip,
  icon,
  trend,
  isLoading,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <MetricTooltip description={tooltip}>
              <button
                type="button"
                className="inline-flex items-center text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                aria-label="Mais informações"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </MetricTooltip>
          </div>

          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {value}
            </p>
          )}

          {trend && !isLoading && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={cn(
                  'font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
