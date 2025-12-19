import { useMemo } from 'react';
import { useFilters, type DayFilter } from '@/contexts/FiltersContext';
import type { IgMediaItem } from '@/utils/ig';

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
  const { filters, getDateRangeFromPreset } = useFilters();

  return useMemo(() => {
    if (!media || media.length === 0) {
      console.log('[useFilteredMedia] No media to filter');
      return [];
    }

    console.log(`[useFilteredMedia] Filtering ${media.length} items with preset=${filters.dateRangePreset}`);

    let filtered = [...media];

    // Get date range from the preset (single source of truth)
    const dateRange = getDateRangeFromPreset();
    const startDate = dateRange.from!;
    const endDate = dateRange.to!;

    console.log(`[useFilteredMedia] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Filter by date range
    filtered = filtered.filter((item) => {
      if (!item.timestamp) return false;
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });

    console.log(`[useFilteredMedia] After date filter: ${filtered.length} items`);

    // Filter by day of week
    if (filters.dayFilter !== 'all') {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDate = new Date(item.timestamp);
        return matchesDayFilter(itemDate.getDay(), filters.dayFilter);
      });
      console.log(`[useFilteredMedia] After day filter: ${filtered.length} items`);
    }

    // Filter by media type
    if (filters.mediaType !== 'all') {
      filtered = filtered.filter((item) => {
        if (filters.mediaType === 'REELS') {
          return item.media_product_type === 'REELS' || item.media_product_type === 'REEL';
        }
        return item.media_type === filters.mediaType;
      });
      console.log(`[useFilteredMedia] After media type filter: ${filtered.length} items`);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const caption = item.caption?.toLowerCase() || '';
        const id = item.id?.toLowerCase() || '';
        return caption.includes(query) || id.includes(query);
      });
      console.log(`[useFilteredMedia] After search filter: ${filtered.length} items`);
    }

    console.log(`[useFilteredMedia] Final result: ${filtered.length} items`);
    return filtered;
  }, [media, filters, getDateRangeFromPreset]);
}
