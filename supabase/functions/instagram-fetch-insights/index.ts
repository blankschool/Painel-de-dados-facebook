import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Instagram Fetch Insights Edge Function - Graph API v24.0 (December 2025)
 * 
 * AVAILABLE METRICS (v24.0):
 * 
 * PROFILE INSIGHTS (metric_type=total_value):
 * - reach, views (replaces impressions), accounts_engaged, total_interactions
 * - likes, comments, shares, saves, replies
 * - profile_links_taps, follows_and_unfollows
 * 
 * DEMOGRAPHICS (period=lifetime):
 * - follower_demographics, engaged_audience_demographics, reached_audience_demographics
 * 
 * POST METRICS:
 * - reach, views, engagement, saved, shares
 * - ig_reels_avg_watch_time, clips_replays_count, ig_reels_video_view_total_time
 * - navigation, profile_visits, profile_activity
 * 
 * STORIES METRICS (/{story_id}/insights):
 * - impressions, reach, replies, taps_forward, taps_back, exits, navigation
 * 
 * DEPRECATED (use alternatives):
 * - impressions → use "views"
 * - profile_views → removed
 * - website_clicks → removed
 */

const allowedOrigins = [
  'https://insta-glow-up-39.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const isDevOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    const m = url.hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (m) {
      const secondOctet = Number(m[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }
    return false;
  } catch {
    return false;
  }
};

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = !!origin && (allowedOrigins.includes(origin) || isDevOrigin(origin));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

type SnapshotRow = {
  id: string;
  user_id: string;
  instagram_user_id: string;
  date: string;
  created_at: string | null;
  profile_insights: any | null;
  demographics: any | null;
  posts: any[] | null;
  stories: any | null;
  online_followers: any | null;
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, maxRetries = 5): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      const json = await res.clone().json();
      
      // Check for transient errors (code 2)
      if (json.error?.code === 2) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s, 8s, 16s
        console.log(`[instagram-fetch-insights] Transient error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      console.log(`[instagram-fetch-insights] Network error, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

const graphJsonOrThrow = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Graph API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

const fetchGraphJson = async (url: string) => {
  const res = await fetchWithRetry(url);
  return await graphJsonOrThrow(res);
};

const fetchGraphWithFallback = async (urls: string[], requestId: string, label: string) => {
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const data = await fetchGraphJson(url);
      if (data?.error) throw new Error(data.error.message || `${label} error`);
      return data;
    } catch (e) {
      lastErr = e;
      console.warn(`[instagram-fetch-insights][${requestId}] ${label} failed, trying fallback...`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
};

const buildResponseFromSnapshot = (snapshot: SnapshotRow, maxPostsResponse: number) => {
  const posts = Array.isArray(snapshot.posts) ? snapshot.posts : [];
  const storiesData = snapshot.stories?.data || [];
  const storiesAggregate = snapshot.stories?.aggregate || {
    total_stories: 0,
    total_impressions: 0,
    total_reach: 0,
    total_replies: 0,
    total_exits: 0,
    total_taps_forward: 0,
    total_taps_back: 0,
    avg_completion_rate: 0,
  };

  return {
    success: true,
    profile_insights: snapshot.profile_insights,
    demographics: snapshot.demographics,
    posts: posts.slice(0, maxPostsResponse),
    total_posts: posts.length,
    stories: storiesData,
    stories_aggregate: storiesAggregate,
    online_followers: snapshot.online_followers ?? snapshot.profile_insights?.online_followers ?? null,
    snapshot_date: snapshot.date,
    duration_ms: 0,
    provider: snapshot.profile_insights?.provider ?? null,
    username: snapshot.profile_insights?.username ?? null,
    messages: [],
    cached: true,
    cached_created_at: snapshot.created_at,
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  console.log(`[instagram-fetch-insights][${requestId}] Request started`);

  try {
    // Step 1: Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');
    console.log(`[instagram-fetch-insights][${requestId}] User authenticated:`, user.id);

    // Parse request body for specific account
    let targetAccountId: string | null = null;
    let requestedDate: string | null = null;
    let forceRefresh = false;
    let preferCache = true;
    let maxPostsResponse = 150;
    let cacheTtlMinutes = 60;
    try {
      const body = await req.json();
      targetAccountId = body.accountId || null;
      requestedDate = body.date || null;
      forceRefresh = Boolean(body.forceRefresh);
      preferCache = body.preferCache === undefined ? true : Boolean(body.preferCache);
      maxPostsResponse = clampInt(body.maxPosts, 1, 500, 150);
      cacheTtlMinutes = clampInt(body.cacheTtlMinutes, 0, 24 * 60, 60);
    } catch {
      // No body provided, use first available account
    }

    if (requestedDate && !isValidIsoDate(requestedDate)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid date (expected YYYY-MM-DD)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    // Step 2: Get connected account
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let account = null;
    if (targetAccountId) {
      const { data } = await supabase
        .from('connected_accounts')
        .select('provider, provider_account_id, access_token, account_username')
        .eq('user_id', user.id)
        .eq('id', targetAccountId)
        .maybeSingle();
      account = data;
    } else {
      // Try Instagram first, then Facebook
      const { data: igAccount } = await supabase
        .from('connected_accounts')
        .select('provider, provider_account_id, access_token, account_username')
        .eq('user_id', user.id)
        .eq('provider', 'instagram')
        .limit(1)
        .maybeSingle();

      if (igAccount) {
        account = igAccount;
      } else {
        const { data: fbAccount } = await supabase
          .from('connected_accounts')
          .select('provider, provider_account_id, access_token, account_username')
          .eq('user_id', user.id)
          .eq('provider', 'facebook')
          .limit(1)
          .maybeSingle();
        account = fbAccount;
      }
    }

    if (!account) throw new Error('No Instagram account connected');
    
    const igUserId = account.provider_account_id;
    const accessToken = account.access_token;
    const provider = account.provider;
    const username = account.account_username || null;
    console.log(`[instagram-fetch-insights][${requestId}] Using account:`, igUserId, 'provider:', provider);

    const today = new Date().toISOString().split('T')[0];
    const snapshotDate = requestedDate || today;
    const isToday = snapshotDate === today;

    if (preferCache) {
      const { data: existingSnapshot } = await supabase
        .from('account_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('instagram_user_id', igUserId)
        .eq('date', snapshotDate)
        .maybeSingle();

      const snapshot = existingSnapshot as unknown as SnapshotRow | null;
      if (snapshot && !forceRefresh) {
        const createdAtMs = snapshot.created_at ? new Date(snapshot.created_at).getTime() : 0;
        const ageMinutes = createdAtMs ? (Date.now() - createdAtMs) / 60000 : Number.POSITIVE_INFINITY;

        const shouldServeCached = !isToday || (cacheTtlMinutes > 0 && ageMinutes <= cacheTtlMinutes);
        if (shouldServeCached) {
          console.log(`[instagram-fetch-insights][${requestId}] Serving cached snapshot`, snapshotDate, `age=${Math.round(ageMinutes)}m`);
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            ...buildResponseFromSnapshot(snapshot, maxPostsResponse),
            duration_ms: duration,
            request_id: requestId,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
          });
        }
      }
    }

    // ============================================
    // Step 3: Fetch Profile Insights (v24.0 metrics)
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Fetching profile insights...`);
    
    const profileMetricsPrimary = [
      'reach',
      'views',
      'accounts_engaged',
      'total_interactions',
      'likes',
      'comments',
      'shares',
      'saves',
      'replies',
      'profile_links_taps',
      'follows_and_unfollows',
      'follower_count',
    ].join(',');
    const profileMetricsFallback = [
      'reach',
      'views',
      'accounts_engaged',
      'total_interactions',
      'follower_count',
    ].join(',');

    let profileInsights: any;
    try {
      profileInsights = await fetchGraphWithFallback([
        `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${profileMetricsPrimary}&period=day&metric_type=total_value&access_token=${accessToken}`,
        `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${profileMetricsFallback}&period=day&metric_type=total_value&access_token=${accessToken}`,
      ], requestId, 'Profile insights');
      console.log(`[instagram-fetch-insights][${requestId}] Profile insights fetched:`, profileInsights.data?.length || 0, 'metrics');
    } catch (e) {
      console.error(`[instagram-fetch-insights][${requestId}] Profile insights error:`, e instanceof Error ? e.message : e);
      profileInsights = { error: { message: e instanceof Error ? e.message : 'Profile insights failed' } };
    }

    // ============================================
    // Step 4: Fetch Demographics (v24.0 - requires metric_type=total_value)
    // Per API documentation: follower_demographics, engaged_audience_demographics
    // MUST be specified with parameter metric_type=total_value
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Fetching demographics...`);
    
    let demographics: any;
    try {
      demographics = await fetchGraphWithFallback([
        `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=follower_demographics,engaged_audience_demographics,reached_audience_demographics&period=lifetime&timeframe=last_30_days&metric_type=total_value&access_token=${accessToken}`,
        `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=follower_demographics&period=lifetime&timeframe=last_30_days&metric_type=total_value&access_token=${accessToken}`,
      ], requestId, 'Demographics');

      console.log(`[instagram-fetch-insights][${requestId}] Demographics fetched:`, demographics.data?.length || 0, 'metrics');
    } catch (e) {
      console.error(`[instagram-fetch-insights][${requestId}] Demographics error:`, e instanceof Error ? e.message : e);
      demographics = { error: { message: e instanceof Error ? e.message : 'Demographics failed' } };
    }

    if (demographics.error) {
      console.error(`[instagram-fetch-insights][${requestId}] Demographics error:`, JSON.stringify(demographics.error));
    }

    // ============================================
    // Step 5: Fetch all available posts (full pagination)
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Fetching media (all available)...`);
    const mediaFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    let allPosts: any[] = [];
    let mediaUrl: string | null = `https://graph.facebook.com/v24.0/${igUserId}/media?fields=${mediaFields}&limit=100&access_token=${accessToken}`;
    
    // Full pagination - fetch all available posts (API typically allows up to ~10k)
    const maxPages = 20; // Safety limit: 20 pages * 100 = 2000 posts max
    for (let i = 0; i < maxPages && mediaUrl; i++) {
      const mediaRes = await fetchWithRetry(mediaUrl);
      const mediaJson = await mediaRes.json();
      
      if (mediaJson.error) {
        console.error(`[instagram-fetch-insights][${requestId}] Media fetch error:`, mediaJson.error.message);
        break;
      }
      
      allPosts = [...allPosts, ...(mediaJson.data || [])];
      mediaUrl = mediaJson.paging?.next || null;
      
      console.log(`[instagram-fetch-insights][${requestId}] Page ${i + 1}: fetched ${mediaJson.data?.length || 0} posts (total: ${allPosts.length})`);
    }
    
    console.log(`[instagram-fetch-insights][${requestId}] Total posts fetched:`, allPosts.length);

    // ============================================
    // Step 6: Fetch insights for each post (parallel batches)
    // IMPORTANT: CAROUSEL_ALBUM does not support individual insights (API limitation)
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Fetching post insights...`);
    
    // Metrics vary by media type and by account/app permissions. Use fallbacks because
    // a single invalid metric can fail the whole request.
    const imageMetricsPrimary = 'reach,views,saved,shares,total_interactions';
    const imageMetricsFallback = 'reach,saved';
    const videoMetricsPrimary = 'reach,views,saved,shares,plays,total_interactions';
    const videoMetricsFallback = 'reach,views,saved';
    
    // Log first post to debug
    if (allPosts.length > 0) {
      console.log(`[instagram-fetch-insights][${requestId}] First post type:`, allPosts[0].media_type, 'id:', allPosts[0].id);
    }
    
    const postsWithInsights = await Promise.all(allPosts.map(async (post: any, index: number) => {
      try {
        // CAROUSEL_ALBUM does not support insights - skip API call
        if (post.media_type === 'CAROUSEL_ALBUM') {
          return { 
            ...post, 
            insights: { 
              _note: 'CAROUSEL_ALBUM insights not available via API',
              likes: post.like_count || 0,
              comments: post.comments_count || 0,
            } 
          };
        }
        
        const isVideo = post.media_type === 'VIDEO' || post.media_type === 'REELS';
        const metricsPrimary = isVideo ? videoMetricsPrimary : imageMetricsPrimary;
        const metricsFallback = isVideo ? videoMetricsFallback : imageMetricsFallback;

        let piData: any;
        try {
          piData = await fetchGraphWithFallback([
            `https://graph.facebook.com/v24.0/${post.id}/insights?metric=${metricsPrimary}&access_token=${accessToken}`,
            `https://graph.facebook.com/v24.0/${post.id}/insights?metric=${metricsFallback}&access_token=${accessToken}`,
          ], requestId, `Post insights ${post.id}`);
        } catch (e) {
          piData = { error: { message: e instanceof Error ? e.message : 'Post insights failed' } };
        }

        // Log first few posts for debugging
        if (index < 3) {
          console.log(`[instagram-fetch-insights][${requestId}] Post ${index} (${post.media_type}) insights response:`, 
            piData.error ? piData.error.message : `${piData.data?.length || 0} metrics`);
        }

        if (piData.error) {
          return { 
            ...post, 
            insights: {
              likes: post.like_count || 0,
              comments: post.comments_count || 0,
              engagement: (post.like_count || 0) + (post.comments_count || 0),
              _error: piData.error.message,
            } 
          };
        }

        const insights = piData.data?.reduce((acc: any, m: any) => {
          acc[m.name] = m.values?.[0]?.value || 0;
          return acc;
        }, {}) || {};
        
        // Add like/comment counts as additional metrics
        insights.likes = post.like_count || 0;
        insights.comments = post.comments_count || 0;
        insights.engagement = insights.total_interactions || (insights.likes + insights.comments + (insights.saved || 0) + (insights.shares || 0));

        return { ...post, insights };
      } catch (err: any) {
        return { 
          ...post, 
          insights: {
            likes: post.like_count || 0,
            comments: post.comments_count || 0,
            engagement: (post.like_count || 0) + (post.comments_count || 0),
            _error: err.message,
          } 
        };
      }
    }));

    // ============================================
    // Step 7: Fetch Stories (last 24 hours)
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Fetching stories...`);
    let storiesData: any[] = [];
    let storiesAggregate = {
      total_stories: 0,
      total_impressions: 0,
      total_reach: 0,
      total_replies: 0,
      total_exits: 0,
      total_taps_forward: 0,
      total_taps_back: 0,
      avg_completion_rate: 0,
    };

    try {
      const storiesUrl = `https://graph.facebook.com/v24.0/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`;
      const storiesJson = await fetchGraphJson(storiesUrl);

      if (!storiesJson.error && storiesJson.data?.length > 0) {
        console.log(`[instagram-fetch-insights][${requestId}] Active stories found:`, storiesJson.data.length);
        
        // Fetch insights for each story
        storiesData = await Promise.all(storiesJson.data.map(async (story: any) => {
          try {
            const storyMetrics = 'impressions,reach,replies,taps_forward,taps_back,exits';
            const siUrl = `https://graph.facebook.com/v24.0/${story.id}/insights?metric=${storyMetrics}&access_token=${accessToken}`;
            const siData = await fetchGraphJson(siUrl);

            if (siData.error) {
              return { ...story, insights: {} };
            }

            const insights = siData.data?.reduce((acc: any, m: any) => {
              acc[m.name] = m.values?.[0]?.value || 0;
              return acc;
            }, {}) || {};

            // Calculate completion rate
            if (insights.impressions > 0) {
              insights.completion_rate = Math.round((1 - (insights.exits || 0) / insights.impressions) * 100);
            } else {
              insights.completion_rate = 0;
            }

            return { ...story, insights };
          } catch {
            return { ...story, insights: {} };
          }
        }));

        // Calculate aggregates
        storiesAggregate.total_stories = storiesData.length;
        storiesData.forEach((story: any) => {
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
      } else {
        console.log(`[instagram-fetch-insights][${requestId}] No active stories or error:`, storiesJson.error?.message);
      }
    } catch (err) {
      console.error(`[instagram-fetch-insights][${requestId}] Stories fetch error:`, err);
    }

    // ============================================
    // Step 8: Fetch Online Followers
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Fetching online followers...`);
    let onlineFollowers = null;
    try {
      const onlineUrl = `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`;
      const onlineJson = await fetchGraphJson(onlineUrl);
      
      if (!onlineJson.error && onlineJson.data?.[0]?.values?.[0]?.value) {
        onlineFollowers = onlineJson.data[0].values[0].value;
      }
    } catch (err) {
      console.error(`[instagram-fetch-insights][${requestId}] Online followers error:`, err);
    }

    // ============================================
    // Step 9: Save snapshot to database
    // ============================================
    console.log(`[instagram-fetch-insights][${requestId}] Saving snapshot...`);
    
    // Build snapshot data matching table schema
    const snapshotData = {
      user_id: user.id,
      instagram_user_id: igUserId,
      date: snapshotDate,
      profile_insights: profileInsights.error ? null : {
        data: profileInsights.data,
        online_followers: onlineFollowers,
        username: username,
        provider: provider,
      },
      demographics: demographics.error ? null : demographics,
      posts: postsWithInsights,
      stories: {
        data: storiesData,
        aggregate: storiesAggregate,
      },
      online_followers: onlineFollowers,
    };

    // First try to update existing record
    const { data: existingSnapshot } = await supabase
      .from('account_snapshots')
      .select('id')
      .eq('user_id', user.id)
      .eq('instagram_user_id', igUserId)
      .eq('date', snapshotDate)
      .maybeSingle();

    if (existingSnapshot) {
      const { error: updateError } = await supabase
        .from('account_snapshots')
        .update(snapshotData)
        .eq('id', existingSnapshot.id);
      
      if (updateError) {
        console.error(`[instagram-fetch-insights][${requestId}] Snapshot update error:`, updateError);
      } else {
        console.log(`[instagram-fetch-insights][${requestId}] Snapshot updated for date:`, snapshotDate);
      }
    } else {
      const { error: insertError } = await supabase
        .from('account_snapshots')
        .insert(snapshotData);
      
      if (insertError) {
        console.error(`[instagram-fetch-insights][${requestId}] Snapshot insert error:`, insertError);
      } else {
        console.log(`[instagram-fetch-insights][${requestId}] Snapshot inserted for date:`, snapshotDate);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[instagram-fetch-insights][${requestId}] Complete! Duration:`, duration, 'ms');

    const postInsightErrorCount = postsWithInsights.reduce((count: number, p: any) => {
      return count + (p?.insights?._error ? 1 : 0);
    }, 0);

    const messages = [
      profileInsights?.error?.message ? `Profile insights unavailable: ${profileInsights.error.message}` : null,
      demographics?.error?.message ? 'Demographics require 100+ followers and may take up to 48h to appear.' : null,
      storiesData.length === 0 ? 'No active stories in the last 24 hours.' : null,
      postInsightErrorCount > 0 ? `Post insights failed for ${postInsightErrorCount} posts (see logs with request_id).` : null,
    ].filter(Boolean);

    return new Response(JSON.stringify({
      success: true,
      profile_insights: profileInsights.error ? null : profileInsights,
      demographics: demographics.error ? null : demographics,
      posts: postsWithInsights.slice(0, maxPostsResponse),
      total_posts: postsWithInsights.length,
      stories: storiesData,
      stories_aggregate: storiesAggregate,
      online_followers: onlineFollowers,
      snapshot_date: snapshotDate,
      duration_ms: duration,
      provider: provider,
      username: username,
      request_id: requestId,
      messages,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    console.error(`[instagram-fetch-insights][${requestId}] Error after`, duration, 'ms:', msg);
    
    return new Response(JSON.stringify({ 
      error: msg, 
      success: false,
      duration_ms: duration,
      request_id: requestId,
      help: 'Data may take up to 48h to be available. Ensure your account is Business or Creator type.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  }
});
