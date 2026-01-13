import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface CircularProgressProps {
  value: number;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showPercentage?: boolean;
  className?: string;
  strokeWidth?: number;
  animate?: boolean;
}

const sizeConfig = {
  sm: { dimension: 48, fontSize: 'text-xs', labelSize: 'text-[8px]' },
  md: { dimension: 72, fontSize: 'text-base', labelSize: 'text-[10px]' },
  lg: { dimension: 96, fontSize: 'text-xl', labelSize: 'text-xs' },
};

export function CircularProgress({
  value,
  maxValue = 100,
  size = 'md',
  label,
  showPercentage = true,
  className,
  strokeWidth = 6,
  animate = true,
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);
  const config = sizeConfig[size];
  const radius = (config.dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((animatedValue / maxValue) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();
    const startValue = animatedValue;
    const diff = value - startValue;

    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(startValue + diff * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);
  }, [value, animate]);

  const displayValue = showPercentage
    ? `${Math.round(percentage)}%`
    : animatedValue.toFixed(1);

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg
        width={config.dimension}
        height={config.dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold text-foreground', config.fontSize)}>
          {displayValue}
        </span>
        {label && (
          <span className={cn('text-muted-foreground uppercase tracking-wider mt-0.5', config.labelSize)}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// Gauge variant with color based on value
export function GaugeProgress({
  value,
  maxValue = 100,
  thresholds = { low: 33, medium: 66 },
  size = 'md',
  label,
  className,
}: CircularProgressProps & {
  thresholds?: { low: number; medium: number };
}) {
  const percentage = (value / maxValue) * 100;
  
  const getColor = () => {
    if (percentage <= thresholds.low) return 'hsl(var(--destructive))';
    if (percentage <= thresholds.medium) return 'hsl(var(--chart-line-secondary))';
    return 'hsl(var(--success))';
  };

  const config = sizeConfig[size];
  const strokeWidth = 6;
  const radius = (config.dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg
        width={config.dimension}
        height={config.dimension}
        className="transform -rotate-90"
      >
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', config.fontSize)} style={{ color: getColor() }}>
          {value.toFixed(1)}%
        </span>
        {label && (
          <span className={cn('text-muted-foreground uppercase tracking-wider mt-0.5', config.labelSize)}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
