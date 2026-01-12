import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

export type DayFilter = 'all' | 'weekdays' | 'weekends' | 'best';
export type MediaType = 'all' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
export type DateRangePreset = '7d' | '14d' | '30d' | '60d' | '90d' | '6m' | '1y' | 'custom';

interface FiltersState {
  dayFilter: DayFilter;
  mediaType: MediaType;
  dateRangePreset: DateRangePreset;
  customDateRange: DateRange | null;
  searchQuery: string;
}

interface FiltersContextType {
  filters: FiltersState;
  setDayFilter: (day: DayFilter) => void;
  setMediaType: (type: MediaType) => void;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (range: DateRange | undefined) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
  // Computed date range based on preset
  getDateRangeFromPreset: () => DateRange;
}

const defaultFilters: FiltersState = {
  dayFilter: 'all',
  mediaType: 'all',
  dateRangePreset: '30d',
  customDateRange: null,
  searchQuery: '',
};

// Helper to compute date range from preset
// "7d" means: 7 complete days backwards ending yesterday (e.g., Jan 5-11 if today is Jan 12)
function computeDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);  // Last complete day
  let startDate: Date;
  
  switch (preset) {
    case '7d':
      startDate = subDays(yesterday, 6);  // 6 days before yesterday + yesterday = 7 days
      break;
    case '14d':
      startDate = subDays(yesterday, 13); // 13 + 1 = 14 days
      break;
    case '30d':
      startDate = subDays(yesterday, 29); // 29 + 1 = 30 days
      break;
    case '60d':
      startDate = subDays(yesterday, 59);
      break;
    case '90d':
      startDate = subDays(yesterday, 89);
      break;
    case '6m':
      startDate = subMonths(yesterday, 6);
      break;
    case '1y':
      startDate = subYears(yesterday, 1);
      break;
    case 'custom':
    default:
      startDate = subDays(yesterday, 29);
  }
  
  return {
    from: startOfDay(startDate),
    to: endOfDay(yesterday),  // Ends at yesterday, not today
  };
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  const setDayFilter = useCallback((day: DayFilter) => {
    console.log('[FiltersContext] Setting dayFilter:', day);
    setFilters((prev) => ({ ...prev, dayFilter: day }));
  }, []);

  const setMediaType = useCallback((type: MediaType) => {
    console.log('[FiltersContext] Setting mediaType:', type);
    setFilters((prev) => ({ ...prev, mediaType: type }));
  }, []);

  const setDateRangePreset = useCallback((preset: DateRangePreset) => {
    console.log('[FiltersContext] Setting dateRangePreset:', preset);
    setFilters((prev) => ({ ...prev, dateRangePreset: preset }));
  }, []);

  const setCustomDateRange = useCallback((range: DateRange | undefined) => {
    console.log('[FiltersContext] Setting customDateRange:', range);
    setFilters((prev) => ({ 
      ...prev, 
      customDateRange: range || null,
      dateRangePreset: 'custom' 
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const resetFilters = useCallback(() => {
    console.log('[FiltersContext] Resetting filters');
    setFilters(defaultFilters);
  }, []);

  const getDateRangeFromPreset = useCallback(() => {
    // If custom preset and customDateRange is set, use it
    if (filters.dateRangePreset === 'custom' && filters.customDateRange?.from) {
      return filters.customDateRange;
    }
    return computeDateRangeFromPreset(filters.dateRangePreset);
  }, [filters.dateRangePreset, filters.customDateRange]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dayFilter !== 'all') count++;
    if (filters.mediaType !== 'all') count++;
    if (filters.dateRangePreset !== '30d') count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        setDayFilter,
        setMediaType,
        setDateRangePreset,
        setCustomDateRange,
        setSearchQuery,
        resetFilters,
        activeFiltersCount,
        getDateRangeFromPreset,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
