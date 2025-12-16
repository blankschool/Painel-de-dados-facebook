import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Step 2: Get connected account
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try Instagram first, then Facebook
    let account = null;
    const { data: igAccount } = await supabase
      .from('connected_accounts')
      .select('provider, provider_account_id, access_token')
      .eq('user_id', user.id)
      .eq('provider', 'instagram')
      .maybeSingle();

    if (igAccount) {
      account = igAccount;
    } else {
      const { data: fbAccount } = await supabase
        .from('connected_accounts')
        .select('provider, provider_account_id, access_token')
        .eq('user_id', user.id)
        .eq('provider', 'facebook')
        .maybeSingle();
      account = fbAccount;
    }

    if (!account) throw new Error('No Instagram account connected');
    
    const igUserId = account.provider_account_id;
    const accessToken = account.access_token;
    const provider = account.provider;
    console.log('[instagram-fetch-insights] Using account:', igUserId, 'provider:', provider);

    // Step 3: Fetch Profile Insights (user-level metrics)
    console.log('[instagram-fetch-insights] Fetching profile insights...');
    const profileMetrics = [
      'reach',
      'impressions',
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
      console.error('[instagram-fetch-insights] Profile insights error:', profileInsights.error);
      // Don't throw, continue with partial data
    } else {
      console.log('[instagram-fetch-insights] Profile insights fetched:', profileInsights.data?.length || 0, 'metrics');
    }

    // Step 4: Fetch Demographics (separate call, different structure)
    console.log('[instagram-fetch-insights] Fetching demographics...');
    const demoMetrics = 'follower_demographics,engaged_audience_demographics,reached_audience_demographics';
    const demoUrl = `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${demoMetrics}&period=lifetime&access_token=${accessToken}`;
    const demoRes = await fetch(demoUrl);
    const demographics = await demoRes.json();

    if (demographics.error) {
      console.error('[instagram-fetch-insights] Demographics error:', demographics.error);
    } else {
      console.log('[instagram-fetch-insights] Demographics fetched');
    }

    // Step 5: Fetch recent posts (up to 50)
    console.log('[instagram-fetch-insights] Fetching media...');
    const mediaUrl = `https://graph.facebook.com/v24.0/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${accessToken}`;
    const mediaRes = await fetch(mediaUrl);
    const mediaJson = await mediaRes.json();

    if (mediaJson.error) {
      console.error('[instagram-fetch-insights] Media fetch error:', mediaJson.error);
      throw new Error(mediaJson.error.message);
    }

    const posts = mediaJson.data || [];
    console.log('[instagram-fetch-insights] Posts fetched:', posts.length);

    // Step 6: Fetch insights for each post (in parallel batches)
    console.log('[instagram-fetch-insights] Fetching post insights...');
    const postMetrics = 'reach,impressions,engagement,saved,shares';
    
    const postsWithInsights = await Promise.all(posts.map(async (post: any) => {
      try {
        const piUrl = `https://graph.facebook.com/v24.0/${post.id}/insights?metric=${postMetrics}&access_token=${accessToken}`;
        const piRes = await fetch(piUrl);
        const piData = await piRes.json();

        if (piData.error) {
          console.warn('[instagram-fetch-insights] Post insight error for', post.id, ':', piData.error.message);
          return { ...post, insights: {} };
        }

        const insights = piData.data?.reduce((acc: any, m: any) => {
          acc[m.name] = m.values?.[0]?.value || 0;
          return acc;
        }, {}) || {};

        return { ...post, insights };
      } catch (err) {
        console.warn('[instagram-fetch-insights] Error fetching insight for post', post.id);
        return { ...post, insights: {} };
      }
    }));

    // Step 7: Save snapshot to database
    console.log('[instagram-fetch-insights] Saving snapshot...');
    const today = new Date().toISOString().split('T')[0];
    
    const { error: snapshotError } = await supabase.from('account_snapshots').upsert({
      user_id: user.id,
      instagram_user_id: igUserId,
      date: today,
      profile_insights: profileInsights.error ? null : profileInsights,
      demographics: demographics.error ? null : demographics,
      posts: postsWithInsights,
      created_at: new Date().toISOString(),
    }, {
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
      posts: postsWithInsights.slice(0, 25), // Limit response size
      total_posts: postsWithInsights.length,
      snapshot_date: today,
      duration_ms: duration,
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
      duration_ms: duration 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
