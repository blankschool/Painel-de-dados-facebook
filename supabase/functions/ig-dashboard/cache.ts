/**
 * Instagram Data Cache Module
 *
 * Manages caching of Instagram data in Supabase database to:
 * 1. Reduce API calls to Meta (avoid rate limits)
 * 2. Enable historical comparisons
 * 3. Speed up dashboard loading
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
export type CacheOptions = {
  maxAgeHours?: number; // How old can cached data be before refresh (default: 24 hours)
  forceRefresh?: boolean; // Force fetching from API regardless of cache
};

export type ProfileSnapshot = {
  account_id: string;
  business_id: string;
  snapshot_date: string; // YYYY-MM-DD
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
};

export type DailyInsight = {
  account_id: string;
  insight_date: string; // YYYY-MM-DD
  reach?: number;
  impressions?: number;
  profile_views?: number;
  website_clicks?: number;
  follower_count?: number;
};

export type PostCache = {
  account_id: string;
  media_id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string; // ISO timestamp
  like_count?: number;
  comments_count?: number;
  impressions?: number;
  reach?: number;
  engagement?: number;
  saved?: number;
  video_views?: number;
  plays?: number;
  engagement_rate?: number;
  insights_raw?: any;
  computed_raw?: any;
  last_fetched_at?: string;
};

/**
 * Check if cached data exists and is fresh
 */
export async function checkCacheStatus(
  supabase: SupabaseClient,
  accountId: string,
  options: CacheOptions = {}
): Promise<{
  hasCachedData: boolean;
  lastSync: string | null;
  cacheAge: number | null; // in hours
  shouldRefresh: boolean;
}> {
  const { data: metadata } = await supabase
    .from('instagram_cache_metadata')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (!metadata || !metadata.last_posts_sync) {
    return {
      hasCachedData: false,
      lastSync: null,
      cacheAge: null,
      shouldRefresh: true,
    };
  }

  const lastSyncDate = new Date(metadata.last_posts_sync);
  const now = new Date();
  const ageHours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
  const maxAge = options.maxAgeHours ?? 24;

  return {
    hasCachedData: true,
    lastSync: metadata.last_posts_sync,
    cacheAge: ageHours,
    shouldRefresh: options.forceRefresh || ageHours > maxAge,
  };
}

/**
 * Get cached posts for a date range
 */
export async function getCachedPosts(
  supabase: SupabaseClient,
  accountId: string,
  sinceDate: string,
  untilDate: string
): Promise<any[]> {
  console.log(`[cache] Getting cached posts for ${accountId} from ${sinceDate} to ${untilDate}`);

  const { data: posts, error } = await supabase
    .from('instagram_posts_cache')
    .select('*')
    .eq('account_id', accountId)
    .gte('timestamp', sinceDate + 'T00:00:00Z')
    .lte('timestamp', untilDate + 'T23:59:59Z')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[cache] Error getting cached posts:', error);
    return [];
  }

  console.log(`[cache] Found ${posts?.length || 0} cached posts`);
  return posts || [];
}

/**
 * Get cached daily insights for a date range
 */
export async function getCachedDailyInsights(
  supabase: SupabaseClient,
  accountId: string,
  sinceDate: string,
  untilDate: string
): Promise<DailyInsight[]> {
  console.log(`[cache] Getting cached daily insights from ${sinceDate} to ${untilDate}`);

  const { data: insights, error } = await supabase
    .from('instagram_daily_insights')
    .select('*')
    .eq('account_id', accountId)
    .gte('insight_date', sinceDate)
    .lte('insight_date', untilDate)
    .order('insight_date', { ascending: false });

  if (error) {
    console.error('[cache] Error getting cached insights:', error);
    return [];
  }

  console.log(`[cache] Found ${insights?.length || 0} days of cached insights`);
  return insights || [];
}

/**
 * Get latest profile snapshot
 */
export async function getCachedProfile(
  supabase: SupabaseClient,
  accountId: string
): Promise<ProfileSnapshot | null> {
  const { data: snapshot, error } = await supabase
    .from('instagram_profile_snapshots')
    .select('*')
    .eq('account_id', accountId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('[cache] Error getting cached profile:', error);
    return null;
  }

  return snapshot;
}

/**
 * Save profile snapshot
 */
export async function saveProfileSnapshot(
  supabase: SupabaseClient,
  accountId: string,
  businessId: string,
  profile: any
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const snapshot: ProfileSnapshot = {
    account_id: accountId,
    business_id: businessId,
    snapshot_date: today,
    username: profile.username,
    name: profile.name,
    biography: profile.biography,
    followers_count: profile.followers_count,
    follows_count: profile.follows_count,
    media_count: profile.media_count,
    profile_picture_url: profile.profile_picture_url,
    website: profile.website,
  };

  const { error } = await supabase
    .from('instagram_profile_snapshots')
    .upsert(snapshot, {
      onConflict: 'account_id,snapshot_date',
    });

  if (error) {
    console.error('[cache] Error saving profile snapshot:', error);
  } else {
    console.log('[cache] Profile snapshot saved');
  }
}

/**
 * Save daily insights
 */
export async function saveDailyInsights(
  supabase: SupabaseClient,
  accountId: string,
  insightsData: Record<string, number>,
  insightDate: string
): Promise<void> {
  const insight: DailyInsight = {
    account_id: accountId,
    insight_date: insightDate,
    reach: insightsData.reach,
    impressions: insightsData.impressions,
    profile_views: insightsData.profile_views,
    website_clicks: insightsData.website_clicks,
    follower_count: insightsData.follower_count,
  };

  const { error } = await supabase
    .from('instagram_daily_insights')
    .upsert(insight, {
      onConflict: 'account_id,insight_date',
    });

  if (error) {
    console.error('[cache] Error saving daily insight:', error);
  }
}

/**
 * Save posts to cache
 */
export async function savePosts(
  supabase: SupabaseClient,
  accountId: string,
  posts: any[]
): Promise<void> {
  if (!posts || posts.length === 0) {
    return;
  }

  console.log(`[cache] Saving ${posts.length} posts to cache`);

  const postsToCache: PostCache[] = posts.map((post) => ({
    account_id: accountId,
    media_id: post.id,
    caption: post.caption,
    media_type: post.media_type,
    media_product_type: post.media_product_type,
    media_url: post.media_url,
    permalink: post.permalink,
    thumbnail_url: post.thumbnail_url,
    timestamp: post.timestamp,
    like_count: post.like_count,
    comments_count: post.comments_count,
    impressions: post.insights?.impressions,
    reach: post.insights?.reach,
    engagement: post.insights?.engagement,
    saved: post.insights?.saved,
    video_views: post.insights?.video_views,
    plays: post.insights?.plays,
    engagement_rate: post.computed?.er,
    insights_raw: post.insights,
    computed_raw: post.computed,
    last_fetched_at: new Date().toISOString(),
  }));

  // Batch upsert - Supabase handles this efficiently
  const batchSize = 100;
  for (let i = 0; i < postsToCache.length; i += batchSize) {
    const batch = postsToCache.slice(i, i + batchSize);

    const { error } = await supabase
      .from('instagram_posts_cache')
      .upsert(batch, {
        onConflict: 'media_id',
      });

    if (error) {
      console.error(`[cache] Error saving batch ${i}-${i + batch.length}:`, error);
    } else {
      console.log(`[cache] Saved batch ${i + 1}-${Math.min(i + batchSize, postsToCache.length)}/${postsToCache.length}`);
    }
  }
}

/**
 * Update cache metadata
 */
export async function updateCacheMetadata(
  supabase: SupabaseClient,
  accountId: string,
  updates: {
    lastProfileSync?: boolean;
    lastInsightsSync?: boolean;
    lastPostsSync?: boolean;
    totalPostsCached?: number;
    oldestPostDate?: string;
    newestPostDate?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const metadata: any = {
    account_id: accountId,
  };

  if (updates.lastProfileSync) metadata.last_profile_sync = now;
  if (updates.lastInsightsSync) metadata.last_insights_sync = now;
  if (updates.lastPostsSync) metadata.last_posts_sync = now;
  if (updates.totalPostsCached !== undefined) metadata.total_posts_cached = updates.totalPostsCached;
  if (updates.oldestPostDate) metadata.oldest_post_date = updates.oldestPostDate;
  if (updates.newestPostDate) metadata.newest_post_date = updates.newestPostDate;

  const { error } = await supabase
    .from('instagram_cache_metadata')
    .upsert(metadata, {
      onConflict: 'account_id',
    });

  if (error) {
    console.error('[cache] Error updating cache metadata:', error);
  } else {
    console.log('[cache] Cache metadata updated');
  }
}

/**
 * Get consolidated metrics from cached daily insights
 */
export async function getConsolidatedMetricsFromCache(
  supabase: SupabaseClient,
  accountId: string,
  sinceDate: string,
  untilDate: string
): Promise<{
  reach: number;
  impressions: number;
  profile_views: number;
} | null> {
  const insights = await getCachedDailyInsights(supabase, accountId, sinceDate, untilDate);

  if (insights.length === 0) {
    return null;
  }

  const consolidated = insights.reduce(
    (acc, insight) => ({
      reach: acc.reach + (insight.reach || 0),
      impressions: acc.impressions + (insight.impressions || 0),
      profile_views: acc.profile_views + (insight.profile_views || 0),
    }),
    { reach: 0, impressions: 0, profile_views: 0 }
  );

  console.log('[cache] Consolidated metrics from cache:', consolidated);
  return consolidated;
}
