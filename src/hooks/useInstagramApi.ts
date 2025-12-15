import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramInsights {
  impressions?: { values: { value: number; end_time: string }[] };
  reach?: { values: { value: number; end_time: string }[] };
  profile_views?: { values: { value: number; end_time: string }[] };
  website_clicks?: { values: { value: number; end_time: string }[] };
  follower_count?: { values: { value: number; end_time: string }[] };
}

export interface AudienceDemographics {
  audience_city?: Record<string, number>;
  audience_country?: Record<string, number>;
  audience_gender_age?: Record<string, number>;
  audience_locale?: Record<string, number>;
}

export interface InstagramAccount {
  pageId: string;
  pageName: string;
  instagram: InstagramProfile;
}

export function useInstagramApi() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(() => {
    // First try localStorage (direct Instagram OAuth)
    const storedToken = localStorage.getItem('instagram_access_token');
    if (storedToken) return storedToken;
    
    // Fallback to Supabase session (Facebook OAuth)
    return session?.provider_token || null;
  }, [session]);

  const callInstagramApi = useCallback(async (action: string, params: Record<string, any> = {}) => {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      throw new Error('No access token available. Please sign in again.');
    }

    const { data, error } = await supabase.functions.invoke('instagram-api', {
      body: { action, accessToken, ...params },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  }, [getAccessToken]);

  const getInstagramAccounts = useCallback(async (): Promise<InstagramAccount[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_instagram_accounts');
      return data.accounts || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getUserProfile = useCallback(async (userId: string): Promise<InstagramProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_user_profile', { userId });
      return data.profile || null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getMedia = useCallback(async (userId: string): Promise<InstagramMedia[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_media', { userId });
      return data.media || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getMediaInsights = useCallback(async (mediaId: string): Promise<Record<string, number>> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_media_insights', { mediaId });
      return data.insights || {};
    } catch (err: any) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getUserInsights = useCallback(async (userId: string, period: string = 'day'): Promise<InstagramInsights> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_user_insights', { userId, period });
      return data.insights || {};
    } catch (err: any) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getAudienceDemographics = useCallback(async (userId: string): Promise<AudienceDemographics> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_audience_demographics', { userId });
      return data.demographics || {};
    } catch (err: any) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getOnlineFollowers = useCallback(async (userId: string): Promise<Record<string, number>> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_online_followers', { userId });
      return data.onlineFollowers || {};
    } catch (err: any) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  const getStories = useCallback(async (userId: string): Promise<any[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callInstagramApi('get_stories', { userId });
      return data.stories || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [callInstagramApi]);

  return {
    loading,
    error,
    getInstagramAccounts,
    getUserProfile,
    getMedia,
    getMediaInsights,
    getUserInsights,
    getAudienceDemographics,
    getOnlineFollowers,
    getStories,
  };
}
