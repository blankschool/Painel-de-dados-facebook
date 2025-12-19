import React, { createContext, useContext, useState, useMemo } from 'react';

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
}

const defaultFilters: FiltersState = {
  dayFilter: 'all',
  mediaType: 'all',
  dateRangePreset: '30d',
  searchQuery: '',
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  const setDayFilter = (day: DayFilter) => {
    setFilters((prev) => ({ ...prev, dayFilter: day }));
  };

  const setMediaType = (type: MediaType) => {
    setFilters((prev) => ({ ...prev, mediaType: type }));
  };

  const setDateRangePreset = (preset: DateRangePreset) => {
    setFilters((prev) => ({ ...prev, dateRangePreset: preset }));
  };

  const setSearchQuery = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

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
