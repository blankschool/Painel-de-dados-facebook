import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDateRange } from '@/contexts/DateRangeContext';
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

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function useDashboardData() {
  const { dateRange } = useDateRange();

  const body = useMemo(() => {
    // Keep the payload minimal for now; the edge function can later accept date range.
    // We still include it for forward compatibility.
    const since = dateRange?.from ? toYmd(dateRange.from) : undefined;
    const until = dateRange?.to ? toYmd(dateRange.to) : undefined;
    const businessId = import.meta.env.VITE_IG_BUSINESS_ID as string | undefined;
    const maxInsightsPostsEnv = Number(import.meta.env.VITE_MAX_INSIGHTS_POSTS ?? '');
    const maxInsightsPosts = Number.isFinite(maxInsightsPostsEnv) && maxInsightsPostsEnv > 0 ? maxInsightsPostsEnv : 500;
    return { since, until, maxInsightsPosts, ...(businessId ? { businessId } : {}) };
  }, [dateRange?.from, dateRange?.to]);

  const query = useQuery({
    queryKey: ['ig-dashboard', body],
    queryFn: async (): Promise<IgDashboardResponse> => {
      const { data, error } = await supabase.functions.invoke('ig-dashboard', { body });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch dashboard data');
      return data as IgDashboardResponse;
    },
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
