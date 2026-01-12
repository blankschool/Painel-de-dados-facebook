import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface MetricTooltipProps {
  description: string;
  children: React.ReactNode;
}

export function MetricTooltip({ description, children }: MetricTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] px-3 py-2 text-[13px] leading-relaxed"
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
