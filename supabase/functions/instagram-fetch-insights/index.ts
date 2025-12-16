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

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[instagram-fetch-insights] Request started');

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
    console.log('[instagram-fetch-insights] User authenticated:', user.id);

    // Parse request body for specific account
    let targetAccountId: string | null = null;
    try {
      const body = await req.json();
      targetAccountId = body.accountId || null;
    } catch {
      // No body provided, use first available account
    }

    // Step 2: Get connected account
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let account = null;
    if (targetAccountId) {
      const { data } = await supabase
        .from('connected_accounts')
        .select('provider, provider_account_id, access_token')
        .eq('user_id', user.id)
        .eq('id', targetAccountId)
        .maybeSingle();
      account = data;
    } else {
      // Try Instagram first, then Facebook
      const { data: igAccount } = await supabase
        .from('connected_accounts')
        .select('provider, provider_account_id, access_token')
        .eq('user_id', user.id)
        .eq('provider', 'instagram')
        .limit(1)
        .maybeSingle();

      if (igAccount) {
        account = igAccount;
      } else {
        const { data: fbAccount } = await supabase
          .from('connected_accounts')
          .select('provider, provider_account_id, access_token')
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
    console.log('[instagram-fetch-insights] Using account:', igUserId, 'provider:', provider);

    // ============================================
    // Step 3: Fetch Profile Insights (v24.0 metrics)
    // ============================================
    console.log('[instagram-fetch-insights] Fetching profile insights...');
    
    // Use "views" instead of deprecated "impressions"
    const profileMetrics = [
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
      'follows_and_unfollows'
    ].join(',');

    const insightsUrl = `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${profileMetrics}&period=day&metric_type=total_value&access_token=${accessToken}`;
    const insightsRes = await fetch(insightsUrl);
    const profileInsights = await insightsRes.json();

    if (profileInsights.error) {
      console.error('[instagram-fetch-insights] Profile insights error:', profileInsights.error.message);
    } else {
      console.log('[instagram-fetch-insights] Profile insights fetched:', profileInsights.data?.length || 0, 'metrics');
    }

    // ============================================
    // Step 4: Fetch Demographics
    // ============================================
    console.log('[instagram-fetch-insights] Fetching demographics...');
    const demoMetrics = 'follower_demographics,engaged_audience_demographics,reached_audience_demographics';
    const demoUrl = `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${demoMetrics}&period=lifetime&access_token=${accessToken}`;
    const demoRes = await fetch(demoUrl);
    const demographics = await demoRes.json();

    if (demographics.error) {
      console.error('[instagram-fetch-insights] Demographics error:', demographics.error.message);
      // Note: Demographics require 100+ followers
    } else {
      console.log('[instagram-fetch-insights] Demographics fetched');
    }

    // ============================================
    // Step 5: Fetch recent posts (up to 200)
    // ============================================
    console.log('[instagram-fetch-insights] Fetching media...');
    const mediaFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    let allPosts: any[] = [];
    let mediaUrl = `https://graph.facebook.com/v24.0/${igUserId}/media?fields=${mediaFields}&limit=50&access_token=${accessToken}`;
    
    // Pagination to get up to 200 posts
    for (let i = 0; i < 4 && mediaUrl; i++) {
      const mediaRes = await fetch(mediaUrl);
      const mediaJson = await mediaRes.json();
      
      if (mediaJson.error) {
        console.error('[instagram-fetch-insights] Media fetch error:', mediaJson.error.message);
        break;
      }
      
      allPosts = [...allPosts, ...(mediaJson.data || [])];
      mediaUrl = mediaJson.paging?.next || null;
      
      if (allPosts.length >= 200) break;
    }
    
    allPosts = allPosts.slice(0, 200);
    console.log('[instagram-fetch-insights] Posts fetched:', allPosts.length);

    // ============================================
    // Step 6: Fetch insights for each post (parallel batches)
    // ============================================
    console.log('[instagram-fetch-insights] Fetching post insights...');
    
    // Different metrics for different media types
    const imageMetrics = 'reach,views,engagement,saved,shares';
    const videoMetrics = 'reach,views,engagement,saved,shares,ig_reels_avg_watch_time,clips_replays_count,ig_reels_video_view_total_time';
    
    const postsWithInsights = await Promise.all(allPosts.map(async (post: any) => {
      try {
        const isVideo = post.media_type === 'VIDEO' || post.media_type === 'REELS';
        const metrics = isVideo ? videoMetrics : imageMetrics;
        
        const piUrl = `https://graph.facebook.com/v24.0/${post.id}/insights?metric=${metrics}&access_token=${accessToken}`;
        const piRes = await fetch(piUrl);
        const piData = await piRes.json();

        if (piData.error) {
          return { ...post, insights: {} };
        }

        const insights = piData.data?.reduce((acc: any, m: any) => {
          acc[m.name] = m.values?.[0]?.value || 0;
          return acc;
        }, {}) || {};

        return { ...post, insights };
      } catch {
        return { ...post, insights: {} };
      }
    }));

    // ============================================
    // Step 7: Fetch Stories (last 24 hours)
    // ============================================
    console.log('[instagram-fetch-insights] Fetching stories...');
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
      const storiesRes = await fetch(storiesUrl);
      const storiesJson = await storiesRes.json();

      if (!storiesJson.error && storiesJson.data?.length > 0) {
        console.log('[instagram-fetch-insights] Active stories found:', storiesJson.data.length);
        
        // Fetch insights for each story
        storiesData = await Promise.all(storiesJson.data.map(async (story: any) => {
          try {
            const storyMetrics = 'impressions,reach,replies,taps_forward,taps_back,exits';
            const siUrl = `https://graph.facebook.com/v24.0/${story.id}/insights?metric=${storyMetrics}&access_token=${accessToken}`;
            const siRes = await fetch(siUrl);
            const siData = await siRes.json();

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
        console.log('[instagram-fetch-insights] No active stories or error:', storiesJson.error?.message);
      }
    } catch (err) {
      console.error('[instagram-fetch-insights] Stories fetch error:', err);
    }

    // ============================================
    // Step 8: Fetch Online Followers
    // ============================================
    console.log('[instagram-fetch-insights] Fetching online followers...');
    let onlineFollowers = null;
    try {
      const onlineUrl = `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`;
      const onlineRes = await fetch(onlineUrl);
      const onlineJson = await onlineRes.json();
      
      if (!onlineJson.error && onlineJson.data?.[0]?.values?.[0]?.value) {
        onlineFollowers = onlineJson.data[0].values[0].value;
      }
    } catch (err) {
      console.error('[instagram-fetch-insights] Online followers error:', err);
    }

    // ============================================
    // Step 9: Save snapshot to database
    // ============================================
    console.log('[instagram-fetch-insights] Saving snapshot...');
    const today = new Date().toISOString().split('T')[0];
    
    const snapshotData = {
      user_id: user.id,
      instagram_user_id: igUserId,
      date: today,
      profile_insights: profileInsights.error ? null : {
        data: profileInsights.data,
        online_followers: onlineFollowers,
      },
      demographics: demographics.error ? null : demographics,
      posts: postsWithInsights,
      stories: storiesData,
      stories_aggregate: storiesAggregate,
      created_at: new Date().toISOString(),
    };

    const { error: snapshotError } = await supabase.from('account_snapshots').upsert(snapshotData, {
      onConflict: 'user_id,instagram_user_id,date'
    });

    if (snapshotError) {
      console.error('[instagram-fetch-insights] Snapshot save error:', snapshotError);
    } else {
      console.log('[instagram-fetch-insights] Snapshot saved for date:', today);
    }

    const duration = Date.now() - startTime;
    console.log('[instagram-fetch-insights] Complete! Duration:', duration, 'ms');

    return new Response(JSON.stringify({
      success: true,
      profile_insights: profileInsights.error ? null : profileInsights,
      demographics: demographics.error ? null : demographics,
      posts: postsWithInsights.slice(0, 50), // Limit response size
      total_posts: postsWithInsights.length,
      stories: storiesData,
      stories_aggregate: storiesAggregate,
      online_followers: onlineFollowers,
      snapshot_date: today,
      duration_ms: duration,
      provider: provider,
      messages: [
        demographics.error ? 'Demographics require 100+ followers and may take up to 48h to appear.' : null,
        storiesData.length === 0 ? 'No active stories in the last 24 hours.' : null,
      ].filter(Boolean),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    console.error('[instagram-fetch-insights] Error after', duration, 'ms:', msg);
    
    return new Response(JSON.stringify({ 
      error: msg, 
      success: false,
      duration_ms: duration,
      help: 'Data may take up to 48h to be available. Ensure your account is Business or Creator type.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
