import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Centralized Graph API version - use v24.0 consistently
const GRAPH_API_VERSION = 'v24.0';

// Allowed origins for CORS
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

// Valid actions whitelist
const validActions = [
  'get_instagram_accounts',
  'get_user_profile',
  'get_media',
  'get_media_insights',
  'get_user_insights',
  'get_audience_demographics',
  'get_online_followers',
  'get_stories',
] as const;

// Valid periods for insights
const validPeriods = ['day', 'week', 'days_28', 'lifetime'] as const;

// Input validation functions
const isValidAction = (action: unknown): action is typeof validActions[number] => {
  return typeof action === 'string' && validActions.includes(action as typeof validActions[number]);
};

const isValidId = (id: unknown): boolean => {
  return typeof id === 'string' && /^\d+$/.test(id) && id.length <= 50;
};

const isValidMediaId = (id: unknown): boolean => {
  return typeof id === 'string' && /^[\d_]+$/.test(id) && id.length <= 100;
};

const isValidAccessToken = (token: unknown): boolean => {
  return typeof token === 'string' && token.length >= 20 && token.length <= 500;
};

const isValidPeriod = (period: unknown): period is typeof validPeriods[number] => {
  return typeof period === 'string' && validPeriods.includes(period as typeof validPeriods[number]);
};

const isValidMetrics = (metrics: unknown): boolean => {
  return typeof metrics === 'string' && metrics.length <= 200 && /^[a-z_,]+$/.test(metrics);
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action, accessToken, userId, mediaId, period, metrics } = body;

    // Validate action
    if (!isValidAction(action)) {
      throw new Error('Invalid action parameter');
    }

    // Validate access token
    if (!isValidAccessToken(accessToken)) {
      throw new Error('Invalid access token format');
    }

    // Validate optional parameters when present
    if (userId !== undefined && !isValidId(userId)) {
      throw new Error('Invalid userId format');
    }

    if (mediaId !== undefined && !isValidMediaId(mediaId)) {
      throw new Error('Invalid mediaId format');
    }

    if (period !== undefined && !isValidPeriod(period)) {
      throw new Error('Invalid period parameter');
    }

    if (metrics !== undefined && !isValidMetrics(metrics)) {
      throw new Error('Invalid metrics format');
    }

    const baseUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
    let response;
    let data;

    switch (action) {
      case 'get_instagram_accounts': {
        response = await fetch(
          `${baseUrl}/me/accounts?fields=id,name,instagram_business_account{id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website}&access_token=${accessToken}`
        );
        data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message);
        }

        const instagramAccounts = data.data
          ?.filter((page: any) => page.instagram_business_account)
          .map((page: any) => ({
            pageId: page.id,
            pageName: page.name,
            instagram: page.instagram_business_account
          })) || [];

        return new Response(JSON.stringify({ accounts: instagramAccounts }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_user_profile': {
        if (!userId) {
          throw new Error('userId is required for this action');
        }
        const fields = 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website';
        response = await fetch(
          `${baseUrl}/${userId}?fields=${fields}&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ profile: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_media': {
        if (!userId) {
          throw new Error('userId is required for this action');
        }
        const mediaFields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count';
        response = await fetch(
          `${baseUrl}/${userId}/media?fields=${mediaFields}&limit=25&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ media: data.data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_media_insights': {
        if (!mediaId) {
          throw new Error('mediaId is required for this action');
        }
        // v24.0 valid metrics: reach, saved, views, total_interactions (for video)
        // DEPRECATED: impressions, engagement, clips_replays_count
        const insightMetrics = metrics || 'reach,saved,views,total_interactions';
        response = await fetch(
          `${baseUrl}/${mediaId}/insights?metric=${insightMetrics}&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          // If metrics fail, try with minimal set (reach, saved work for images)
          const fallbackResponse = await fetch(
            `${baseUrl}/${mediaId}/insights?metric=reach,saved&access_token=${accessToken}`
          );
          const fallbackData = await fallbackResponse.json();
          if (!fallbackData.error) {
            data = fallbackData;
          } else {
            throw new Error(data.error.message);
          }
        }

        const insights: Record<string, number> = {};
        data.data?.forEach((item: any) => {
          insights[item.name] = item.values?.[0]?.value || 0;
        });

        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_user_insights': {
        if (!userId) {
          throw new Error('userId is required for this action');
        }
        const insightPeriod = period || 'day';
        // v24.0 valid metrics: reach, views, accounts_engaged, total_interactions, 
        // likes, comments, shares, saves, replies, profile_links_taps, follows_and_unfollows, follower_count
        // DEPRECATED: impressions (use views), profile_views, website_clicks
        const insightMetrics = metrics || 'reach,views,accounts_engaged,total_interactions,likes,comments,shares,saves,replies,profile_links_taps,follows_and_unfollows,follower_count';
        
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=${insightMetrics}&period=${insightPeriod}&metric_type=total_value&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const insights: Record<string, any> = {};
        data.data?.forEach((item: any) => {
          insights[item.name] = {
            values: item.values || [],
            title: item.title,
            description: item.description,
          };
        });

        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_audience_demographics': {
        if (!userId) {
          throw new Error('userId is required for this action');
        }
        // v24.0: Use new metric names with timeframe parameter
        // follower_demographics, engaged_audience_demographics, reached_audience_demographics
        // Timeframe required: last_14_days, last_30_days, last_90_days
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=follower_demographics,engaged_audience_demographics,reached_audience_demographics&period=lifetime&timeframe=last_30_days&metric_type=total_value&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          // Demographics may fail for accounts with <100 followers
          console.log('Demographics error:', data.error.message);
          return new Response(JSON.stringify({ 
            demographics: {},
            error: data.error.message,
            help: 'Demographics require 100+ followers and may take 48h to appear.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const demographics: Record<string, any> = {};
        data.data?.forEach((item: any) => {
          demographics[item.name] = item.total_value || item.values?.[0]?.value || {};
        });

        return new Response(JSON.stringify({ demographics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_online_followers': {
        if (!userId) {
          throw new Error('userId is required for this action');
        }
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const onlineFollowers = data.data?.[0]?.values?.[0]?.value || {};

        return new Response(JSON.stringify({ onlineFollowers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_stories': {
        if (!userId) {
          throw new Error('userId is required for this action');
        }
        response = await fetch(
          `${baseUrl}/${userId}/stories?fields=id,media_type,media_url,permalink,timestamp&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ stories: data.data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        // This should never happen due to validation above
        throw new Error('Invalid action');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in instagram-api function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error instanceof Error && errorMessage === 'Unauthorized' ? 401 : 500,
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' },
    });
  }
});