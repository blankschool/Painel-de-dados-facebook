import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
