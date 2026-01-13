import { useMemo, useCallback, useState } from 'react';
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

export type DailyInsightRow = {
  insight_date: string;
  reach?: number;
  impressions?: number;
  accounts_engaged?: number;
  profile_views?: number;
  follower_count?: number;
  website_clicks?: number;
  email_contacts?: number;
  phone_call_clicks?: number;
  text_message_clicks?: number;
  get_directions_clicks?: number;
};

export type ProfileSnapshot = {
  snapshot_date: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

export type IgDashboardResponse = {
  success: boolean;
  error?: string;
  request_id?: string;
  snapshot_date?: string;
  provider?: string;
  token_type?: 'IGAA' | 'EAA' | 'unknown';
  api_endpoint?: string;
  api_version?: string;
  from_cache?: boolean;
  cache_age_hours?: number;
  duration_ms?: number;
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
  account_insights?: Record<string, number>;
  previous_period_insights?: Record<string, number>;
  consolidated_reach?: number;
  consolidated_impressions?: number;
  consolidated_profile_views?: number;
  comparison_metrics?: Record<string, { current: number; previous: number; change: number; changePercent: number }>;
  daily_insights?: DailyInsightRow[];
  previous_daily_insights?: DailyInsightRow[];
  profile_snapshots?: ProfileSnapshot[];
  media_type_distribution?: Record<string, number>;
  messages?: string[];
};

// Use format() to get local date string, avoiding UTC timezone issues
function toYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function useDashboardData() {
  const { getDateRangeFromPreset, filters } = useFilters();
  const { selectedAccount } = useAuth();
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  const body = useMemo(() => {
    const dateRange = getDateRangeFromPreset();
    const since = dateRange.from ? toYmd(dateRange.from) : undefined;
    const until = dateRange.to ? toYmd(dateRange.to) : undefined;
    const timezone = selectedAccount?.timezone || 'America/Sao_Paulo';

    console.log(`[useDashboardData] Preset: ${filters.dateRangePreset}, Since: ${since}, Until: ${until}, Timezone: ${timezone}`);

    return {
      since,
      until,
      accountId: selectedAccount?.id,
      timezone,
    };
  }, [getDateRangeFromPreset, filters.dateRangePreset, selectedAccount?.id, selectedAccount?.timezone]);

  const query = useQuery({
    queryKey: ['ig-dashboard', body, forceRefreshKey],
    queryFn: async (): Promise<IgDashboardResponse> => {
      const isForceRefresh = forceRefreshKey > 0;
      const requestBody = isForceRefresh ? { ...body, forceRefresh: true } : body;
      
      console.log('[useDashboardData] Fetching data with body:', requestBody, 'forceRefresh:', isForceRefresh);
      const { data, error } = await supabase.functions.invoke('ig-dashboard', { body: requestBody });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch dashboard data');
      console.log(`[useDashboardData] Received ${data.media?.length ?? 0} media items (from_cache: ${data.from_cache})`);
      return data as IgDashboardResponse;
    },
    enabled: !!selectedAccount?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Force refresh: increment key to trigger new request with forceRefresh: true
  const forceRefresh = useCallback(() => {
    console.log('[useDashboardData] Force refresh triggered');
    setForceRefreshKey(k => k + 1);
  }, []);

  return {
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    data: query.data ?? null,
    refresh: query.refetch,
    forceRefresh,
  };
}
