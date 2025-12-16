import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [data, setData] = useState<InsightsData | null>(null);

  const fetchInsights = useCallback(async (accountId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('instagram-fetch-insights', {
        body: accountId ? { accountId } : {},
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch insights';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    loading,
    error,
    data,
    fetchInsights,
    getStoredSnapshot,
  };
}
