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
  searchQuery: string;
}

interface FiltersContextType {
  filters: FiltersState;
  setDayFilter: (day: DayFilter) => void;
  setMediaType: (type: MediaType) => void;
  setDateRangePreset: (preset: DateRangePreset) => void;
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
  searchQuery: '',
};

// Helper to compute date range from preset
function computeDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  let startDate: Date;
  
  switch (preset) {
    case '7d':
      startDate = subDays(now, 7);
      break;
    case '14d':
      startDate = subDays(now, 14);
      break;
    case '30d':
      startDate = subDays(now, 30);
      break;
    case '60d':
      startDate = subDays(now, 60);
      break;
    case '90d':
      startDate = subDays(now, 90);
      break;
    case '6m':
      startDate = subMonths(now, 6);
      break;
    case '1y':
      startDate = subYears(now, 1);
      break;
    case 'custom':
    default:
      startDate = subDays(now, 30);
  }
  
  return {
    from: startOfDay(startDate),
    to: endOfDay(now),
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

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const resetFilters = useCallback(() => {
    console.log('[FiltersContext] Resetting filters');
    setFilters(defaultFilters);
  }, []);

  const getDateRangeFromPreset = useCallback(() => {
    return computeDateRangeFromPreset(filters.dateRangePreset);
  }, [filters.dateRangePreset]);

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
