import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface LogiKpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean } | null;
  index?: number;
  tooltip?: string;
  size?: 'default' | 'large';
  className?: string;
}

export function LogiKpiCard({
  label,
  value,
  icon,
  trend,
  index = 0,
  tooltip,
  size = 'default',
  className,
}: LogiKpiCardProps) {
  const isLarge = size === 'large';
  const staggerClass = `stagger-${Math.min(index + 1, 8)}`;

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border/40 bg-card p-5 transition-all duration-200",
        "animate-fade-in-up hover-lift",
        staggerClass,
        className
      )}
    >
      {/* Icon Container - Circular */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground transition-transform duration-200 group-hover:scale-110">
          {icon}
        </div>
        
        {/* Trend Badge */}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              trend.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {trend.isPositive ? '+' : ''}
              {typeof trend.value === 'number' ? trend.value.toFixed(1) : trend.value}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className={cn(
          "font-bold tracking-tight text-foreground transition-colors",
          isLarge ? "text-4xl" : "text-3xl"
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </article>
  );
}

// Grid wrapper for consistent layout
export function LogiKpiGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4', colsClass[columns], className)}>
      {children}
    </div>
  );
}
