import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapData {
  [dayHourKey: string]: number; // e.g., "0_14" = Sunday at 14:00
}

interface HeatmapChartProps {
  data: HeatmapData;
  title?: string;
  subtitle?: string;
  valueLabel?: string;
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
  showLegend?: boolean;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Color schemes using semantic tokens
const COLOR_SCHEMES = {
  blue: {
    0: 'bg-muted/30',
    1: 'bg-blue-100 dark:bg-blue-900/40',
    2: 'bg-blue-200 dark:bg-blue-800/50',
    3: 'bg-blue-300 dark:bg-blue-700/60',
    4: 'bg-blue-400 dark:bg-blue-600/70',
    5: 'bg-blue-500 dark:bg-blue-500',
  },
  green: {
    0: 'bg-muted/30',
    1: 'bg-green-100 dark:bg-green-900/40',
    2: 'bg-green-200 dark:bg-green-800/50',
    3: 'bg-green-300 dark:bg-green-700/60',
    4: 'bg-green-400 dark:bg-green-600/70',
    5: 'bg-green-500 dark:bg-green-500',
  },
  purple: {
    0: 'bg-muted/30',
    1: 'bg-purple-100 dark:bg-purple-900/40',
    2: 'bg-purple-200 dark:bg-purple-800/50',
    3: 'bg-purple-300 dark:bg-purple-700/60',
    4: 'bg-purple-400 dark:bg-purple-600/70',
    5: 'bg-purple-500 dark:bg-purple-500',
  },
  orange: {
    0: 'bg-muted/30',
    1: 'bg-orange-100 dark:bg-orange-900/40',
    2: 'bg-orange-200 dark:bg-orange-800/50',
    3: 'bg-orange-300 dark:bg-orange-700/60',
    4: 'bg-orange-400 dark:bg-orange-600/70',
    5: 'bg-orange-500 dark:bg-orange-500',
  },
};

export function HeatmapChart({
  data,
  title,
  subtitle,
  valueLabel = 'Valor',
  colorScheme = 'blue',
  showLegend = true,
}: HeatmapChartProps) {
  const { maxValue, minValue, getIntensity } = useMemo(() => {
    const values = Object.values(data).filter(v => v > 0);
    const max = values.length > 0 ? Math.max(...values) : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    
    const getIntensity = (value: number): 0 | 1 | 2 | 3 | 4 | 5 => {
      if (value === 0 || !max) return 0;
      const normalized = (value - min) / (max - min || 1);
      if (normalized <= 0.2) return 1;
      if (normalized <= 0.4) return 2;
      if (normalized <= 0.6) return 3;
      if (normalized <= 0.8) return 4;
      return 5;
    };

    return { maxValue: max, minValue: min, getIntensity };
  }, [data]);

  const colors = COLOR_SCHEMES[colorScheme];

  // Find best time (highest value)
  const bestTime = useMemo(() => {
    let best = { day: 0, hour: 0, value: 0 };
    Object.entries(data).forEach(([key, value]) => {
      if (value > best.value) {
        const [day, hour] = key.split('_').map(Number);
        best = { day, hour, value };
      }
    });
    return best;
  }, [data]);

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && <h3 className="font-semibold text-foreground">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Best time highlight */}
      {bestTime.value > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Melhor horário:</span>
          <span className="font-semibold text-foreground">
            {DAYS_FULL[bestTime.day]} às {bestTime.hour.toString().padStart(2, '0')}:00
          </span>
          <span className="text-muted-foreground">
            ({formatValue(bestTime.value)} {valueLabel.toLowerCase()})
          </span>
        </div>
      )}

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex">
            <div className="w-12 flex-shrink-0" />
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-muted-foreground pb-1"
              >
                {hour % 3 === 0 ? `${hour.toString().padStart(2, '0')}h` : ''}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, dayIndex) => (
            <div key={dayIndex} className="flex items-center">
              <div className="w-12 flex-shrink-0 text-xs text-muted-foreground pr-2 text-right">
                {day}
              </div>
              {HOURS.map((hour) => {
                const key = `${dayIndex}_${hour}`;
                const value = data[key] || 0;
                const intensity = getIntensity(value);
                const isBest = dayIndex === bestTime.day && hour === bestTime.hour && value > 0;

                return (
                  <Tooltip key={hour}>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          flex-1 aspect-square m-0.5 rounded-sm cursor-pointer
                          transition-all duration-150 hover:ring-2 hover:ring-primary/50
                          ${colors[intensity]}
                          ${isBest ? 'ring-2 ring-primary ring-offset-1' : ''}
                        `}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">{DAYS_FULL[dayIndex]}, {hour.toString().padStart(2, '0')}:00</p>
                      <p className="text-muted-foreground">
                        {formatValue(value)} {valueLabel.toLowerCase()}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Menos</span>
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`w-4 h-4 rounded-sm ${colors[level as keyof typeof colors]}`}
            />
          ))}
          <span>Mais</span>
        </div>
      )}
    </div>
  );
}

// Helper to convert online_followers API data to heatmap format
export function convertOnlineFollowersToHeatmap(
  onlineFollowers: Record<string, number> | undefined
): HeatmapData {
  if (!onlineFollowers) return {};
  
  const heatmapData: HeatmapData = {};
  
  // API format is like: { "0": { "0": 100, "1": 120, ... }, "1": { ... } }
  // or flat format: { "0_0": 100, "0_1": 120, ... }
  
  Object.entries(onlineFollowers).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Nested format: key is day index, value is object of hours
      const dayIndex = parseInt(key, 10);
      Object.entries(value as Record<string, number>).forEach(([hourKey, hourValue]) => {
        const hour = parseInt(hourKey, 10);
        if (!isNaN(dayIndex) && !isNaN(hour) && typeof hourValue === 'number') {
          heatmapData[`${dayIndex}_${hour}`] = hourValue;
        }
      });
    } else if (key.includes('_')) {
      // Flat format: "dayIndex_hour"
      if (typeof value === 'number') {
        heatmapData[key] = value;
      }
    }
  });

  return heatmapData;
}

// Helper to build engagement heatmap from posts
export function buildEngagementHeatmap(
  posts: Array<{
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    insights?: { saved?: number; shares?: number };
  }>,
  timezone: string = 'America/Sao_Paulo'
): HeatmapData {
  const heatmapData: HeatmapData = {};
  const countData: Record<string, number> = {};

  posts.forEach((post) => {
    if (!post.timestamp) return;
    
    const date = new Date(post.timestamp);
    
    // Get day and hour in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const weekdayPart = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
    
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    const dayIndex = dayMap[weekdayPart] ?? 0;
    const hour = parseInt(hourPart, 10);
    const key = `${dayIndex}_${hour}`;

    const engagement = 
      (post.like_count || 0) + 
      (post.comments_count || 0) + 
      (post.insights?.saved || 0) + 
      (post.insights?.shares || 0);

    heatmapData[key] = (heatmapData[key] || 0) + engagement;
    countData[key] = (countData[key] || 0) + 1;
  });

  // Convert to average engagement per slot
  Object.keys(heatmapData).forEach((key) => {
    if (countData[key] > 0) {
      heatmapData[key] = Math.round(heatmapData[key] / countData[key]);
    }
  });

  return heatmapData;
}
