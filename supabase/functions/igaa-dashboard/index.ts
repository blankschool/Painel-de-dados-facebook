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

// Instagram Graph API base URL (works for IGAA tokens)
const GRAPH_BASE = "https://graph.instagram.com/v24.0";
const FB_GRAPH_BASE = "https://graph.facebook.com/v24.0";

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}, useFbGraph = false): Promise<any> {
  const base = useFbGraph ? FB_GRAPH_BASE : GRAPH_BASE;
  const url = new URL(`${base}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  url.searchParams.append('access_token', accessToken);

  console.log(`[igaa-dashboard] GET ${url.pathname}${url.search.substring(0, 100)}...`);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    console.error(`[igaa-dashboard] API error:`, data.error);
    throw new Error(data.error.message || 'Instagram API error');
  }

  return data;
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

    console.log('[igaa-dashboard] IGAA token detected, fetching Instagram Basic data...');

    const businessId = connectedAccount.provider_account_id;

    // Fetch basic profile using Facebook Graph API (works better with IGAA tokens)
    console.log('[igaa-dashboard] Fetching profile via Facebook Graph API...');
    const profile = await graphGet(`/${businessId}`, accessToken, {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website'
    }, true); // Use Facebook Graph API

    console.log('[igaa-dashboard] Profile fetched:', {
      id: profile.id,
      username: profile.username,
      followers: profile.followers_count,
    });

    // Fetch recent media
    console.log('[igaa-dashboard] Fetching recent media...');
    const mediaResponse = await graphGet(`/${businessId}/media`, accessToken, {
      fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
      limit: '25'
    }, true);

    const media = mediaResponse.data || [];
    console.log('[igaa-dashboard] Fetched', media.length, 'media items');

    // Try to fetch insights for recent posts (may not work with IGAA tokens in dev mode)
    const mediaWithInsights = [];
    for (const item of media.slice(0, 10)) { // Only first 10 to avoid rate limits
      try {
        const insights = await graphGet(`/${item.id}/insights`, accessToken, {
          metric: 'engagement,impressions,reach,saved'
        }, true);

        const insightsData: Record<string, number> = {};
        if (insights.data) {
          insights.data.forEach((metric: any) => {
            insightsData[metric.name] = metric.values?.[0]?.value || 0;
          });
        }

        mediaWithInsights.push({
          ...item,
          insights: insightsData,
        });
      } catch (error) {
        console.warn('[igaa-dashboard] Could not fetch insights for', item.id, ':', error instanceof Error ? error.message : 'Unknown error');
        // Add media without insights
        mediaWithInsights.push({
          ...item,
          insights: {},
        });
      }
    }

    // Add remaining media without insights
    mediaWithInsights.push(...media.slice(10));

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
        total_likes: media.reduce((sum: number, item: any) => sum + (item.like_count || 0), 0),
        total_comments: media.reduce((sum: number, item: any) => sum + (item.comments_count || 0), 0),
        avg_likes: media.length > 0 ? Math.round(media.reduce((sum: number, item: any) => sum + (item.like_count || 0), 0) / media.length) : 0,
        avg_comments: media.length > 0 ? Math.round(media.reduce((sum: number, item: any) => sum + (item.comments_count || 0), 0) / media.length) : 0,
      },
      _metadata: {
        duration_ms: duration,
        media_fetched: media.length,
        insights_fetched: mediaWithInsights.filter(m => m.insights && Object.keys(m.insights).length > 0).length,
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
