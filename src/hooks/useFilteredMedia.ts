import { useMemo } from 'react';
import { subDays, subMonths, subYears } from 'date-fns';
import { useFilters, type DayFilter, type MediaType, type DateRangePreset } from '@/contexts/FiltersContext';
import { useDateRange } from '@/contexts/DateRangeContext';
import type { IgMediaItem } from '@/utils/ig';

// Returns date range start based on preset
function getDateRangeStart(preset: DateRangePreset): Date {
  const now = new Date();
  switch (preset) {
    case '7d': return subDays(now, 7);
    case '14d': return subDays(now, 14);
    case '30d': return subDays(now, 30);
    case '60d': return subDays(now, 60);
    case '90d': return subDays(now, 90);
    case '6m': return subMonths(now, 6);
    case '1y': return subYears(now, 1);
    case 'custom': return subDays(now, 30); // fallback
    default: return subDays(now, 30);
  }
}

// Check if day matches filter
function matchesDayFilter(dayOfWeek: number, filter: DayFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
    case 'weekends': return dayOfWeek === 0 || dayOfWeek === 6; // Sat-Sun
    case 'best': return true; // Show all, could be enhanced with analytics
    default: return true;
  }
}

export function useFilteredMedia(media: IgMediaItem[]) {
  const { filters } = useFilters();
  const { dateRange } = useDateRange();

  return useMemo(() => {
    let filtered = [...media];

    // Filter by date range (use custom calendar range if set, otherwise use preset)
    const startDate = dateRange?.from || getDateRangeStart(filters.dateRangePreset);
    const endDate = dateRange?.to || new Date();

    filtered = filtered.filter((item) => {
      if (!item.timestamp) return true;
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });

    // Filter by day of week
    if (filters.dayFilter !== 'all') {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDate = new Date(item.timestamp);
        return matchesDayFilter(itemDate.getDay(), filters.dayFilter);
      });
    }

    // Filter by media type
    if (filters.mediaType !== 'all') {
      filtered = filtered.filter((item) => {
        if (filters.mediaType === 'REELS') {
          return item.media_product_type === 'REELS' || item.media_product_type === 'REEL';
        }
        return item.media_type === filters.mediaType;
      });
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const caption = item.caption?.toLowerCase() || '';
        const id = item.id?.toLowerCase() || '';
        return caption.includes(query) || id.includes(query);
      });
    }

    return filtered;
  }, [media, filters, dateRange]);
}
