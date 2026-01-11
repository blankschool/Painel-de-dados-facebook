import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// Decrypt stored access tokens (same as ig-dashboard)
async function decryptToken(storedToken: string): Promise<string> {
  if (storedToken.startsWith('ENCRYPTED:')) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Cannot decrypt token: ENCRYPTION_KEY not configured');
    }

    const encryptedData = decodeBase64(storedToken.substring('ENCRYPTED:'.length));
    const iv = encryptedData.slice(0, 12);
    const encryptedContent = encryptedData.slice(12);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32)),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      encryptedContent,
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  if (/^(EAA|IG)/.test(storedToken)) {
    return storedToken;
  }

  try {
    const decodedBytes = decodeBase64(storedToken);
    const decoded = new TextDecoder().decode(decodedBytes);
    if (/^(EAA|IG)/.test(decoded) && decoded.length > 20) {
      return decoded;
    }
  } catch {
    // Ignore
  }

  return storedToken;
}

const allowedOrigins = [
  "https://insta-glow-up-39.lovable.app",
  "https://lovable.dev",
  "http://localhost:5173",
  "http://localhost:8080",
];

const isLovableOrigin = (origin: string) => {
  if (!origin) return false;
  return /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin);
};

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = !!origin && (allowedOrigins.includes(origin) || isLovableOrigin(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

// Instagram Graph API base URL - IGAA tokens ONLY work with graph.instagram.com
const GRAPH_BASE = "https://graph.instagram.com/v24.0";

type MediaItem = {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: Record<string, number>;
  computed?: ComputedMetrics;
};

type ComputedMetrics = {
  likes: number;
  comments: number;
  saves: number | null;
  shares: number | null;
  reach: number | null;
  views: number | null;
  total_interactions: number | null;
  engagement: number;
  score: number;
  er: number | null;
  has_insights: boolean;
};

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${GRAPH_BASE}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  url.searchParams.append('access_token', accessToken);

  console.log(`[igaa-dashboard] GET ${GRAPH_BASE}${path}?...`);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    console.error(`[igaa-dashboard] API error:`, data.error);
    throw new Error(data.error.message || 'Instagram API error');
  }

  return data;
}

// Parse insights response from Instagram API
function parseInsightsResponse(json: unknown): Record<string, number> {
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) return {};

  const out: Record<string, number> = {};
  for (const item of data) {
    const obj = typeof item === "object" && item ? (item as Record<string, unknown>) : null;
    const name = obj && typeof obj.name === "string" ? obj.name : null;
    const values = obj && Array.isArray(obj.values) ? obj.values : null;
    const lastValue = Array.isArray(values) && values.length > 0 ? values[values.length - 1]?.value : null;

    if (typeof name === "string" && typeof lastValue === "number") {
      out[name] = lastValue;
    }
  }
  return out;
}

// Normalize media insights to consistent keys
function normalizeMediaInsights(raw: Record<string, number>): Record<string, number> {
  const saved = raw.saved ?? raw.saves;
  const shares = raw.shares;
  const reach = raw.reach;
  const views = raw.views;
  const total_interactions = raw.total_interactions ?? raw.engagement;

  return {
    ...raw,
    ...(typeof views === "number" ? { views } : {}),
    ...(typeof reach === "number" ? { reach } : {}),
    ...(typeof saved === "number" ? { saved, saves: raw.saves ?? saved } : {}),
    ...(typeof shares === "number" ? { shares } : {}),
    ...(typeof total_interactions === "number" ? { total_interactions } : {}),
  };
}

// Fetch media insights with fallback metric combinations
// Valid metrics for Instagram Graph API: impressions, shares, comments, plays, likes, saved, replies, 
// total_interactions, navigation, follows, profile_visits, profile_activity, reach, 
// ig_reels_video_view_total_time, ig_reels_avg_watch_time, clips_replays_count, 
// ig_reels_aggregated_all_plays_count, views
async function fetchMediaInsights(
  accessToken: string,
  mediaId: string,
  mediaType: string,
  mediaProductType?: string,
): Promise<Record<string, number>> {
  const isReel = mediaProductType === "REELS" || mediaProductType === "REEL";
  const isCarousel = mediaType === "CAROUSEL_ALBUM";
  const isVideo = mediaType === "VIDEO";

  // Build metric candidates based on media type
  // Using only valid Instagram Graph API metrics
  const candidates: string[] = [];

  if (isReel) {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "views,reach",
      "reach,saved,shares",
      "reach,saved",
      "reach",
      "impressions,reach,saved",
      "impressions,reach",
    );
  } else if (isCarousel) {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "reach,saved,shares",
      "reach,saved",
      "reach",
      "impressions,reach,saved",
      "impressions,reach",
    );
  } else if (isVideo) {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "views,reach",
      "reach,saved,shares",
      "reach,saved",
      "reach",
      "impressions,reach,saved",
      "impressions,reach",
    );
  } else {
    // IMAGE type
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "reach,saved,shares",
      "reach,saved",
      "reach",
      "impressions,reach,saved",
      "impressions,reach",
      "likes,comments,saved",
    );
  }

  for (const metric of candidates) {
    try {
      const json = await graphGet(`/${mediaId}/insights`, accessToken, { metric });
      const raw = parseInsightsResponse(json);
      const normalized = normalizeMediaInsights(raw);

      if (Object.keys(normalized).length > 0) {
        console.log(
          `[igaa-dashboard] Insights SUCCESS media=${mediaId} metric=${metric} keys=${Object.keys(normalized).join(",")}`,
        );
        return normalized;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[igaa-dashboard] Insights attempt failed media=${mediaId} metric=${metric}: ${errMsg.slice(0, 120)}`);
      continue;
    }
  }

  console.log(`[igaa-dashboard] Insights EMPTY for media=${mediaId} type=${mediaType} product=${mediaProductType}`);
  return {};
}

// Compute media metrics from insights
function computeMediaMetrics(
  media: MediaItem,
  insightsRaw: Record<string, number>,
  followersCount: number | null,
): ComputedMetrics {
  const likes = media.like_count ?? 0;
  const comments = media.comments_count ?? 0;

  const saves = insightsRaw.saved ?? insightsRaw.saves ?? null;
  const reach = insightsRaw.reach ?? null;
  const views = insightsRaw.views ?? null;
  const shares = insightsRaw.shares ?? null;
  const total_interactions = insightsRaw.total_interactions ?? null;

  const engagement = likes + comments + (saves ?? 0) + (shares ?? 0);
  const score = likes * 1 + comments * 2 + (saves ?? 0) * 3 + (shares ?? 0) * 4;

  const followers = typeof followersCount === "number" && followersCount > 0 ? followersCount : null;
  const er = followers ? (engagement / followers) * 100 : null;

  const hasInsights = Object.keys(insightsRaw).length > 0;

  return {
    likes,
    comments,
    saves,
    shares,
    reach,
    views,
    total_interactions,
    engagement,
    score,
    er,
    has_insights: hasInsights,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const startedAt = Date.now();

  try {
    // Verify JWT and get user
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
      console.error('[igaa-dashboard] Auth error:', authError?.message || 'No user');
      throw new Error('Unauthorized');
    }

    console.log('[igaa-dashboard] User authenticated:', user.id);

    const body = await req.json().catch(() => ({}));
    const accountId = body.accountId;
    const maxInsightsPosts = body.maxInsightsPosts ?? 10;

    // Fetch connected account - only Instagram provider with IGAA token
    let accountQuery = supabaseAuth
      .from('connected_accounts')
      .select('id, provider, provider_account_id, access_token, account_username')
      .eq('user_id', user.id)
      .eq('provider', 'instagram');

    if (accountId) {
      accountQuery = accountQuery.eq('id', accountId);
    }

    const { data: connectedAccount, error: accountError } = await accountQuery.maybeSingle();

    if (accountError) {
      console.error('[igaa-dashboard] Error fetching connected account:', accountError);
      throw new Error('Failed to fetch connected account');
    }

    if (!connectedAccount) {
      console.error('[igaa-dashboard] No connected account found');
      throw new Error('No Instagram account connected. Please connect your account first.');
    }

    // Decrypt token
    const storedToken = connectedAccount.access_token;
    const accessToken = await decryptToken(storedToken);

    console.log('[igaa-dashboard] Token format:', {
      starts_with_igaa: accessToken.startsWith('IGAA'),
      starts_with_eaa: accessToken.startsWith('EAA'),
      length: accessToken.length,
    });

    // Check if this is an IGAA token
    const isIGAAToken = accessToken.startsWith('IGAA') || accessToken.startsWith('IG');

    if (!isIGAAToken) {
      console.log('[igaa-dashboard] Not an IGAA token, redirecting to regular ig-dashboard');
      return new Response(JSON.stringify({
        success: false,
        error: 'This dashboard is for IGAA tokens only. Please use the regular dashboard for EAA tokens.',
        use_regular_dashboard: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('[igaa-dashboard] IGAA token detected, fetching Instagram data...');

    const businessId = connectedAccount.provider_account_id;

    // Fetch profile using Instagram Graph API
    console.log('[igaa-dashboard] Fetching profile via Instagram Graph API...');
    const profile = await graphGet(`/${businessId}`, accessToken, {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website'
    });

    console.log('[igaa-dashboard] Profile fetched:', {
      id: profile.id,
      username: profile.username,
      followers: profile.followers_count,
    });

    // Fetch recent media with media_product_type for proper insight handling
    console.log('[igaa-dashboard] Fetching recent media...');
    const mediaResponse = await graphGet(`/${businessId}/media`, accessToken, {
      fields: 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
      limit: '25'
    });

    const media: MediaItem[] = mediaResponse.data || [];
    console.log('[igaa-dashboard] Fetched', media.length, 'media items');

    // Fetch insights for recent posts using proper fallback system
    const mediaWithInsights: MediaItem[] = [];
    const insightsToFetch = media.slice(0, maxInsightsPosts);

    for (const item of insightsToFetch) {
      const insightsRaw = await fetchMediaInsights(
        accessToken,
        item.id,
        item.media_type,
        item.media_product_type
      );

      const computed = computeMediaMetrics(item, insightsRaw, profile.followers_count ?? null);

      mediaWithInsights.push({
        ...item,
        insights: insightsRaw,
        computed,
      });
    }

    // Add remaining media without insights
    for (const item of media.slice(maxInsightsPosts)) {
      mediaWithInsights.push({
        ...item,
        insights: {},
        computed: computeMediaMetrics(item, {}, profile.followers_count ?? null),
      });
    }

    // Calculate summary stats
    const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
    const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
    const avgLikes = media.length > 0 ? Math.round(totalLikes / media.length) : 0;
    const avgComments = media.length > 0 ? Math.round(totalComments / media.length) : 0;

    // Calculate insights-based metrics
    const postsWithInsights = mediaWithInsights.filter(m => m.computed?.has_insights);
    const avgReach = postsWithInsights.length > 0
      ? Math.round(postsWithInsights.reduce((sum, m) => sum + (m.computed?.reach ?? 0), 0) / postsWithInsights.length)
      : null;
    const avgViews = postsWithInsights.length > 0
      ? Math.round(postsWithInsights.reduce((sum, m) => sum + (m.computed?.views ?? 0), 0) / postsWithInsights.length)
      : null;

    const duration = Date.now() - startedAt;
    console.log('[igaa-dashboard] Success! Duration:', duration, 'ms');

    return new Response(JSON.stringify({
      success: true,
      token_type: 'IGAA',
      profile: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        followers_count: profile.followers_count,
        follows_count: profile.follows_count,
        media_count: profile.media_count,
        profile_picture_url: profile.profile_picture_url,
        website: profile.website,
      },
      media: mediaWithInsights,
      summary: {
        total_posts: media.length,
        total_likes: totalLikes,
        total_comments: totalComments,
        avg_likes: avgLikes,
        avg_comments: avgComments,
        avg_reach: avgReach,
        avg_views: avgViews,
        posts_with_insights: postsWithInsights.length,
      },
      _metadata: {
        duration_ms: duration,
        media_fetched: media.length,
        insights_fetched: postsWithInsights.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startedAt;
    console.error(`[igaa-dashboard] Error:`, msg, 'Duration:', duration, 'ms');

    const status = msg === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({
      success: false,
      error: msg,
      token_type: 'IGAA',
    }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
