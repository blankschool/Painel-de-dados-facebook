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
  onClick?: () => void;
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
  onClick,
}: LogiKpiCardProps) {
  const isLarge = size === 'large';
  const staggerClass = `stagger-${Math.min(index + 1, 8)}`;
  const isClickable = !!onClick;

  return (
    <article
      onClick={onClick}
      className={cn(
        "group relative rounded-xl md:rounded-2xl border border-border/50 bg-card/85 p-3 md:p-5 transition-all duration-200 backdrop-blur-sm",
        "animate-fade-in-up hover-lift",
        staggerClass,
        isClickable && "cursor-pointer hover:ring-2 hover:ring-primary/20",
        className
      )}
    >
      {/* Icon Container - Circular */}
      <div className="flex items-start justify-between mb-2 md:mb-4">
        <div className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-full bg-accent/80 text-foreground transition-transform duration-200 group-hover:scale-110">
          <span className="[&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-5 md:[&>svg]:w-5">
            {icon}
          </span>
        </div>
        
        {/* Trend Badge */}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-0.5 md:gap-1 rounded-full px-1.5 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold",
              trend.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
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
          isLarge ? "text-2xl md:text-4xl" : "text-xl md:text-3xl"
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div className="mt-1 md:mt-1.5 flex items-center gap-1 md:gap-1.5">
        <span className="text-[9px] md:text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {tooltip && (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors hidden md:inline-flex">
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-[280px] text-xs z-[9999]" 
              side="top" 
              sideOffset={8}
              avoidCollisions={true}
            >
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
