import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface MetricCardProps {
  label: string;
  value: string;
  delta?: string | { value: string; positive: boolean };
  deltaType?: 'good' | 'bad' | 'neutral';
  tooltip?: string;
  tag?: string;
  sparkline?: React.ReactNode;
  icon?: React.ReactNode;
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
}: MetricCardProps) {
  // Handle delta as string or object
  const deltaValue = typeof delta === 'object' ? delta.value : delta;
  const computedDeltaType = typeof delta === 'object' 
    ? (delta.positive ? 'good' : 'bad') 
    : deltaType;

  return (
    <article className="metric-card animate-slide-up">
      <div className="metric-label">
        <span className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span>{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground hover:bg-secondary">
                  ?
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </span>
        {tag && <span className="tag">{tag}</span>}
      </div>
      <div className="metric-value">{value}</div>
      {deltaValue && (
        <div className="metric-delta">
          <span className={`tag ${computedDeltaType === 'good' ? 'tag-good' : computedDeltaType === 'bad' ? 'tag-bad' : ''}`}>
            {deltaValue}
          </span>
          <span>vs período anterior</span>
        </div>
      )}
      {sparkline && <div className="sparkline">{sparkline}</div>}
    </article>
  );
}