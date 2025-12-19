import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string;
  delta?: string | { value: string; positive: boolean };
  deltaType?: 'good' | 'bad' | 'neutral';
  tooltip?: string;
  tag?: string;
  sparkline?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'default' | 'large';
}

export function MetricCard({
  label,
  value,
  delta,
  deltaType = 'neutral',
  tooltip,
  tag,
  sparkline,
  icon,
  size = 'default',
}: MetricCardProps) {
  const deltaValue = typeof delta === 'object' ? delta.value : delta;
  const computedDeltaType = typeof delta === 'object' 
    ? (delta.positive ? 'good' : 'bad') 
    : deltaType;

  const isLarge = size === 'large';

  return (
    <article className={cn(
      "metric-card animate-fade-in",
      isLarge && "p-6"
    )}>
      <div className="metric-label">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span>{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
        {tag && <span className="tag ml-auto">{tag}</span>}
      </div>

      <div className={cn(
        "metric-value",
        isLarge && "text-3xl"
      )}>
        {value}
      </div>

      {deltaValue && (
        <div className="metric-delta">
          {computedDeltaType === 'good' && <TrendingUp className="h-3.5 w-3.5 text-success" />}
          {computedDeltaType === 'bad' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
          <span className={cn(
            "font-medium",
            computedDeltaType === 'good' && "text-success",
            computedDeltaType === 'bad' && "text-destructive"
          )}>
            {deltaValue}
          </span>
          <span className="text-muted-foreground">vs período anterior</span>
        </div>
      )}

      {sparkline && <div className="sparkline">{sparkline}</div>}
    </article>
  );
}