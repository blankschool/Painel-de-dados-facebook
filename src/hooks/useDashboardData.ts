import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useFilters } from '@/contexts/FiltersContext';
import { useAuth } from '@/contexts/AuthContext';
import type { IgMediaItem } from '@/utils/ig';

export type StoriesAggregate = {
  total_stories: number;
  total_impressions: number;
  total_reach: number;
  total_replies: number;
  total_exits: number;
  total_taps_forward: number;
  total_taps_back: number;
  avg_completion_rate: number;
};

export type IgDashboardResponse = {
  success: boolean;
  error?: string;
  request_id?: string;
  snapshot_date?: string;
  provider?: string;
  token_type?: 'IGAA' | 'EAA' | 'unknown';
  api_endpoint?: string;
  profile?: {
    id: string;
    username?: string;
    name?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
    website?: string;
  } | null;
  media?: IgMediaItem[];
  posts?: IgMediaItem[];
  total_posts?: number;
  top_posts_by_score?: IgMediaItem[];
  top_posts_by_reach?: IgMediaItem[];
  top_reels_by_views?: IgMediaItem[];
  top_reels_by_score?: IgMediaItem[];
  stories?: unknown[];
  stories_aggregate?: StoriesAggregate;
  demographics?: Record<string, unknown>;
  online_followers?: Record<string, number>;
  messages?: string[];
};

// Use format() to get local date string, avoiding UTC timezone issues
function toYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function useDashboardData() {
  const { getDateRangeFromPreset, filters } = useFilters();
  const { selectedAccount } = useAuth();

  const body = useMemo(() => {
    const dateRange = getDateRangeFromPreset();
    const since = dateRange.from ? toYmd(dateRange.from) : undefined;
    const until = dateRange.to ? toYmd(dateRange.to) : undefined;

    console.log(`[useDashboardData] Preset: ${filters.dateRangePreset}, Since: ${since}, Until: ${until}, Account: ${selectedAccount?.account_username}`);

    return {
      since,
      until,
      accountId: selectedAccount?.id,
    };
  }, [getDateRangeFromPreset, filters.dateRangePreset, selectedAccount?.id, selectedAccount?.account_username]);

  const query = useQuery({
    queryKey: ['ig-dashboard', body],
    queryFn: async (): Promise<IgDashboardResponse> => {
      console.log('[useDashboardData] Fetching data with body:', body);
      const { data, error } = await supabase.functions.invoke('ig-dashboard', { body });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch dashboard data');
      console.log(`[useDashboardData] Received ${data.media?.length ?? 0} media items`);
      return data as IgDashboardResponse;
    },
    enabled: !!selectedAccount?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    data: query.data ?? null,
    refresh: query.refetch,
  };
}
