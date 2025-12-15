import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  tooltip?: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  legend?: React.ReactNode;
}

export function ChartCard({ title, subtitle, tooltip, badge, actions, children, legend }: ChartCardProps) {
  return (
    <article className="chart-card animate-slide-up">
      <div className="chart-head">
        <div>
          <h2 className="chart-title flex items-center gap-2">
            {title}
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
          </h2>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge && <span className="tag">{badge}</span>}
          {actions}
        </div>
      </div>
      <div className="chart-body">{children}</div>
      {legend && <div className="legend">{legend}</div>}
    </article>
  );
}
