import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { useDateRange } from '@/contexts/DateRangeContext';
import { isWithinInterval, parseISO } from 'date-fns';

export interface InsightsData {
  profile_insights: any;
  demographics: any;
  posts: any[];
  total_posts: number;
  stories: any[];
  stories_aggregate: {
    total_stories: number;
    total_impressions: number;
    total_reach: number;
    total_replies: number;
    total_exits: number;
    total_taps_forward: number;
    total_taps_back: number;
    avg_completion_rate: number;
  };
  online_followers: any;
  snapshot_date: string;
  messages: string[];
  provider: string;
}

export function useInsights() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<InsightsData | null>(null);
  const { selectedAccountId } = useAccount();
  const { dateRange } = useDateRange();

  // Filter posts by date range
  const data = useMemo(() => {
    if (!rawData) return null;
    if (!dateRange?.from || !dateRange?.to) return rawData;

    const filteredPosts = rawData.posts?.filter((post: any) => {
      if (!post.timestamp) return true;
      try {
        const postDate = parseISO(post.timestamp);
        return isWithinInterval(postDate, { start: dateRange.from!, end: dateRange.to! });
      } catch {
        return true;
      }
    }) || [];

    // Recalculate aggregates based on filtered posts
    const filteredStories = rawData.stories?.filter((story: any) => {
      if (!story.timestamp) return true;
      try {
        const storyDate = parseISO(story.timestamp);
        return isWithinInterval(storyDate, { start: dateRange.from!, end: dateRange.to! });
      } catch {
        return true;
      }
    }) || [];

    const storiesAggregate = {
      total_stories: filteredStories.length,
      total_impressions: 0,
      total_reach: 0,
      total_replies: 0,
      total_exits: 0,
      total_taps_forward: 0,
      total_taps_back: 0,
      avg_completion_rate: 0,
    };

    filteredStories.forEach((story: any) => {
      storiesAggregate.total_impressions += story.insights?.impressions || 0;
      storiesAggregate.total_reach += story.insights?.reach || 0;
      storiesAggregate.total_replies += story.insights?.replies || 0;
      storiesAggregate.total_exits += story.insights?.exits || 0;
      storiesAggregate.total_taps_forward += story.insights?.taps_forward || 0;
      storiesAggregate.total_taps_back += story.insights?.taps_back || 0;
    });

    if (storiesAggregate.total_impressions > 0) {
      storiesAggregate.avg_completion_rate = Math.round(
        (1 - storiesAggregate.total_exits / storiesAggregate.total_impressions) * 100
      );
    }

    return {
      ...rawData,
      posts: filteredPosts,
      total_posts: filteredPosts.length,
      stories: filteredStories,
      stories_aggregate: storiesAggregate,
    };
  }, [rawData, dateRange]);

  const fetchInsights = useCallback(async (accountId?: string) => {
    setLoading(true);
    setError(null);
    
    const targetAccountId = accountId || selectedAccountId;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('instagram-fetch-insights', {
        body: targetAccountId ? { accountId: targetAccountId } : {},
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setRawData(result);
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch insights';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  const getStoredSnapshot = useCallback(async (accountId: string, date?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      let query = supabase
        .from('account_snapshots')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('instagram_user_id', accountId);

      if (date) {
        query = query.eq('date', date);
      } else {
        query = query.order('date', { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching snapshot:', err);
      return null;
    }
  }, []);

  // Reset data when account changes
  const resetData = useCallback(() => {
    setRawData(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    data,
    unfilteredData: rawData,
    fetchInsights,
    getStoredSnapshot,
    resetData,
    selectedAccountId,
    dateRange,
  };
}
