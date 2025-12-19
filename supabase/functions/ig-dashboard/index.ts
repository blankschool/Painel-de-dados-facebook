import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = [
  "https://insta-glow-up-39.lovable.app",
  "https://lovable.dev",
  "http://localhost:5173",
  "http://localhost:8080",
];

const isLovableOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return (
      url.hostname === "lovable.dev" ||
      url.hostname.endsWith(".lovable.dev") ||
      url.hostname.endsWith(".lovable.app") ||
      url.hostname.endsWith(".lovableproject.com")
    );
  } catch {
    return false;
  }
};

const isDevOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
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
  const isAllowed = !!origin && (allowedOrigins.includes(origin) || isLovableOrigin(origin) || isDevOrigin(origin));

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dev-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

type DashboardRequest = {
  businessId?: string;
  maxPosts?: number;
  maxStories?: number;
  maxInsightsPosts?: number;
  since?: string;
  until?: string;
};

type InstagramProfile = {
  id: string;
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
};

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

type StoryItem = {
  id: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  timestamp: string;
  insights?: Record<string, number>;
};

const GRAPH_BASE = "https://graph.facebook.com/v24.0";

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url);
  const text = await res.text();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json ? JSON.stringify((json as { error?: unknown }).error) : text;
    throw new Error(`Graph API ${res.status}: ${msg}`);
  }

  return json;
}

async function graphGetWithUrl(fullUrl: string): Promise<unknown> {
  const res = await fetch(fullUrl);
  const text = await res.text();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json ? JSON.stringify((json as { error?: unknown }).error) : text;
    throw new Error(`Graph API ${res.status}: ${msg}`);
  }

  return json;
}

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

async function fetchMediaInsights(
  accessToken: string,
  mediaId: string,
  mediaType: string,
  mediaProductType?: string,
): Promise<Record<string, number>> {
  const isReel = mediaProductType === "REELS" || mediaProductType === "REEL";
  const isCarousel = mediaType === "CAROUSEL_ALBUM";
  const isVideo = mediaType === "VIDEO";

  const candidates: string[] = [];

  if (isCarousel) {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "reach,saved,total_interactions",
      "reach,saved,shares",
      "reach,saved",
      "reach",
    );
  } else if (isReel) {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved,total_interactions",
      "views,reach,saved",
      "views,reach",
      "reach,saved,shares",
      "reach,saved",
      "reach",
    );
  } else if (isVideo) {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "views,reach",
      "reach,saved,shares",
      "reach,saved",
      "reach",
    );
  } else {
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "views,reach,saved,total_interactions",
      "views,reach,saved,shares",
      "views,reach,saved",
      "views,reach",
      "reach,saved,shares",
      "reach,saved",
      "reach",
    );
  }

  for (const metric of candidates) {
    try {
      const json = await graphGet(`/${mediaId}/insights`, accessToken, { metric });
      const raw = parseInsightsResponse(json);
      const normalized = normalizeMediaInsights(raw);

      if (Object.keys(normalized).length > 0) {
        console.log(
          `[ig-dashboard] Insights SUCCESS media=${mediaId} metric=${metric} keys=${Object.keys(normalized).join(",")}`,
        );
        return normalized;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[ig-dashboard] Insights attempt failed media=${mediaId} metric=${metric}: ${errMsg.slice(0, 180)}`);
      continue;
    }
  }

  console.log(`[ig-dashboard] Insights EMPTY for media=${mediaId} type=${mediaType} product=${mediaProductType}`);
  return {};
}

type MetricPick = { value: number | null; source: string | null };

function pickMetric(raw: Record<string, number>, keys: string[]): MetricPick {
  for (const key of keys) {
    const value = asNumber((raw as Record<string, unknown>)[key]);
    if (value !== null) return { value, source: key };
  }
  return { value: null, source: null };
}

type ComputedMetrics = {
  likes: number;
  comments: number;
  saves: number | null;
  shares: number | null;
  reach: number | null;
  views: number | null;
  views_source: string | null;
  total_interactions: number | null;
  engagement: number;
  score: number;
  er: number | null;
  reach_rate: number | null;
  views_rate: number | null;
  interactions_per_1000_reach: number | null;
  has_insights: boolean;
  is_partial: boolean;
  missing_metrics: string[];
};

function computeMediaMetrics(
  media: MediaItem,
  insightsRaw: Record<string, number>,
  followersCount: number | null,
): {
  normalizedInsights: Record<string, number>;
  computed: ComputedMetrics;
} {
  const likes = media.like_count ?? 0;
  const comments = media.comments_count ?? 0;

  const savesPick = pickMetric(insightsRaw, ["saved", "saves"]);
  const reachPick = pickMetric(insightsRaw, ["reach"]);
  const viewsPick = pickMetric(insightsRaw, ["views"]);
  const sharesPick = pickMetric(insightsRaw, ["shares"]);
  const totalInteractionsPick = pickMetric(insightsRaw, ["total_interactions", "engagement"]);

  const saves = savesPick.value;
  const reach = reachPick.value;
  const views = viewsPick.value;
  const shares = sharesPick.value;

  const engagement = likes + comments + (saves ?? 0) + (shares ?? 0);
  const score = likes * 1 + comments * 2 + (saves ?? 0) * 3 + (shares ?? 0) * 4;

  const followers = typeof followersCount === "number" && followersCount > 0 ? followersCount : null;

  const er = followers ? (engagement / followers) * 100 : null;
  const reachRate = followers && typeof reach === "number" ? (reach / followers) * 100 : null;
  const viewsRate = typeof reach === "number" && reach > 0 && typeof views === "number" ? (views / reach) * 100 : null;
  const interactionsPer1000Reach = typeof reach === "number" && reach > 0 ? (engagement / reach) * 1000 : null;

  const expectsViews = true;

  const missingMetrics = ["saves", "shares", "reach", ...(expectsViews ? ["views"] : [])].filter((k) => {
    if (k === "saves") return saves === null;
    if (k === "shares") return shares === null;
    if (k === "reach") return reach === null;
    if (k === "views") return views === null;
    return false;
  });

  const hasInsights = Object.keys(insightsRaw).length > 0;

  const normalizedInsights: Record<string, number> = { ...insightsRaw, engagement };
  if (typeof reach === "number") normalizedInsights.reach = reach;
  if (typeof saves === "number") {
    normalizedInsights.saved = saves;
    normalizedInsights.saves = (insightsRaw.saves ?? saves) as number;
  }
  if (typeof views === "number") normalizedInsights.views = views;
  if (typeof shares === "number") normalizedInsights.shares = shares;
  if (typeof totalInteractionsPick.value === "number")
    normalizedInsights.total_interactions = totalInteractionsPick.value;

  const computed: ComputedMetrics = {
    likes,
    comments,
    saves,
    shares,
    reach,
    views,
    views_source: viewsPick.source,
    total_interactions: totalInteractionsPick.value,
    engagement,
    score,
    er,
    reach_rate: reachRate,
    views_rate: viewsRate,
    interactions_per_1000_reach: interactionsPer1000Reach,
    has_insights: hasInsights,
    is_partial: missingMetrics.length > 0,
    missing_metrics: missingMetrics,
  };

  return { normalizedInsights, computed };
}

async function fetchStoryInsights(accessToken: string, storyId: string): Promise<Record<string, number>> {
  try {
    const json = await graphGet(`/${storyId}/insights`, accessToken, {
      metric: "views,reach,replies,exits,taps_forward,taps_back",
    });
    const raw = parseInsightsResponse(json);
    return raw;
  } catch {
    try {
      const json = await graphGet(`/${storyId}/insights`, accessToken, {
        metric: "impressions,reach,replies,exits,taps_forward,taps_back",
      });
      const raw = parseInsightsResponse(json);
      if (raw.impressions && !raw.views) {
        raw.views = raw.impressions;
      }
      return raw;
    } catch {
      return {};
    }
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const requestId = crypto.randomUUID();
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
      console.error('[ig-dashboard] Auth error:', authError?.message || 'No user');
      throw new Error('Unauthorized');
    }
    console.log('[ig-dashboard] User authenticated:', user.id);

    // Fetch connected account from database
    const { data: connectedAccount, error: accountError } = await supabaseAuth
      .from('connected_accounts')
      .select('provider_account_id, access_token')
      .eq('user_id', user.id)
      .eq('provider', 'facebook')
      .maybeSingle();

    if (accountError) {
      console.error('[ig-dashboard] Error fetching connected account:', accountError);
      throw new Error('Failed to fetch connected account');
    }

    if (!connectedAccount) {
      console.error('[ig-dashboard] No connected account found for user:', user.id);
      throw new Error('No Instagram account connected. Please connect your account first.');
    }

    const body = (await req.json().catch(() => ({}))) as DashboardRequest;

    const businessId = connectedAccount.provider_account_id;
    const accessToken = connectedAccount.access_token;

    console.log(`[ig-dashboard] Fetching data for businessId=${businessId} (user=${user.id})`);

    const maxPosts = typeof body.maxPosts === "number" ? Math.max(1, Math.min(2000, body.maxPosts)) : 500;
    const maxStories = typeof body.maxStories === "number" ? Math.max(1, Math.min(50, body.maxStories)) : 25;
    const maxInsightsPosts =
      typeof body.maxInsightsPosts === "number"
        ? Math.max(0, Math.min(maxPosts, Math.floor(body.maxInsightsPosts)))
        : 200;

    console.log(
      `[ig-dashboard] Fetching data for businessId=${businessId}, maxPosts=${maxPosts}, maxInsightsPosts=${maxInsightsPosts}`,
    );

    const profileJson = await graphGet(`/${businessId}`, accessToken, {
      fields: "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website",
    });
    const profile = profileJson as InstagramProfile;

    const allMedia: MediaItem[] = [];
    let nextUrl: string | null = null;

    const mediaFields =
      "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";

    const firstMediaJson = await graphGet(`/${businessId}/media`, accessToken, {
      fields: mediaFields,
      limit: "100",
    });

    const firstMediaData = (firstMediaJson as { data?: unknown; paging?: { next?: string } }).data;
    if (Array.isArray(firstMediaData)) allMedia.push(...(firstMediaData as MediaItem[]));
    nextUrl = (firstMediaJson as { paging?: { next?: string } }).paging?.next || null;

    while (nextUrl && allMedia.length < maxPosts) {
      const pageJson = await graphGetWithUrl(nextUrl);
      const pageData = (pageJson as { data?: unknown; paging?: { next?: string } }).data;

      if (Array.isArray(pageData) && pageData.length > 0) {
        allMedia.push(...(pageData as MediaItem[]));
      } else {
        break;
      }

      nextUrl = (pageJson as { paging?: { next?: string } }).paging?.next || null;
    }

    const mediaItems = allMedia.slice(0, maxPosts);

    const storiesJson = await graphGet(`/${businessId}/stories`, accessToken, {
      fields: "id,media_type,media_url,permalink,timestamp",
      limit: String(maxStories),
    });
    const storiesData = (storiesJson as { data?: unknown }).data;
    const storyItems: StoryItem[] = Array.isArray(storiesData) ? (storiesData as StoryItem[]) : [];

    const INSIGHTS_BATCH_SIZE = 50;
    const mediaWithInsights: MediaItem[] = [];

    for (let i = 0; i < mediaItems.length; i += INSIGHTS_BATCH_SIZE) {
      const batch = mediaItems.slice(i, i + INSIGHTS_BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (m, j) => {
          const absoluteIndex = i + j;
          const insights =
            absoluteIndex < maxInsightsPosts
              ? await fetchMediaInsights(accessToken, m.id, m.media_type, m.media_product_type)
              : {};

          const followersCount = asNumber(profile.followers_count);
          const { normalizedInsights, computed } = computeMediaMetrics(m, insights, followersCount);

          return { ...m, insights: normalizedInsights, computed };
        }),
      );

      mediaWithInsights.push(...batchResults);
    }

    const storiesWithInsights = await Promise.all(
      storyItems.map(async (s) => {
        const insights = await fetchStoryInsights(accessToken, s.id);
        const views = insights.views ?? insights.impressions ?? 0;
        const exits = insights.exits ?? 0;
        const completionRate = views > 0 ? Math.round((1 - exits / views) * 100) : 0;
        return { ...s, insights: { ...insights, views, completion_rate: completionRate } };
      }),
    );

    type StoryInsightsData = {
      views?: number;
      impressions?: number;
      reach?: number;
      replies?: number;
      exits?: number;
      taps_forward?: number;
      taps_back?: number;
      completion_rate?: number;
    };

    const storiesAggregate = storiesWithInsights.reduce(
      (acc, s) => {
        const insights = (s.insights ?? {}) as StoryInsightsData;
        acc.total_stories += 1;
        acc.total_views += asNumber(insights.views) ?? asNumber(insights.impressions) ?? 0;
        acc.total_reach += asNumber(insights.reach) ?? 0;
        acc.total_replies += asNumber(insights.replies) ?? 0;
        acc.total_exits += asNumber(insights.exits) ?? 0;
        acc.total_taps_forward += asNumber(insights.taps_forward) ?? 0;
        acc.total_taps_back += asNumber(insights.taps_back) ?? 0;
        return acc;
      },
      {
        total_stories: 0,
        total_views: 0,
        total_impressions: 0,
        total_reach: 0,
        total_replies: 0,
        total_exits: 0,
        total_taps_forward: 0,
        total_taps_back: 0,
        avg_completion_rate: 0,
      },
    );

    storiesAggregate.total_impressions = storiesAggregate.total_views;

    if (storiesAggregate.total_views > 0) {
      storiesAggregate.avg_completion_rate = Math.round(
        (1 - storiesAggregate.total_exits / storiesAggregate.total_views) * 100,
      );
    }

    const demographics: Record<string, unknown> = {};
    const breakdownTypes = ["age", "gender", "country", "city"];

    for (const breakdownType of breakdownTypes) {
      try {
        const demoJson = await graphGet(`/${businessId}/insights`, accessToken, {
          metric: "follower_demographics",
          period: "lifetime",
          metric_type: "total_value",
          breakdown: breakdownType,
        });

        const demoData = (demoJson as { data?: unknown[] }).data;
        if (Array.isArray(demoData) && demoData.length > 0) {
          const metric = demoData[0] as { total_value?: { breakdowns?: unknown[] } };
          if (metric.total_value?.breakdowns) {
            const breakdowns = metric.total_value.breakdowns as Array<{
              results?: Array<{ dimension_values?: string[]; value?: number }>;
            }>;

            for (const breakdown of breakdowns) {
              const results = breakdown.results || [];
              const values: Record<string, number> = {};
              for (const result of results) {
                const key = result.dimension_values?.join(".") || result.dimension_values?.[0] || "";
                if (key && result.value) values[key] = result.value;
              }
              if (Object.keys(values).length > 0) demographics[`audience_${breakdownType}`] = values;
            }
          }
        }
      } catch (err) {
        console.log(`[ig-dashboard] Demographics ${breakdownType} fetch failed:`, err);
      }
    }

    if (Object.keys(demographics).length === 0) {
      for (const breakdownType of breakdownTypes) {
        try {
          const demoJson = await graphGet(`/${businessId}/insights`, accessToken, {
            metric: "engaged_audience_demographics",
            period: "lifetime",
            metric_type: "total_value",
            breakdown: breakdownType,
          });

          const demoData = (demoJson as { data?: unknown[] }).data;
          if (Array.isArray(demoData) && demoData.length > 0) {
            const metric = demoData[0] as { total_value?: { breakdowns?: unknown[] } };
            if (metric.total_value?.breakdowns) {
              const breakdowns = metric.total_value.breakdowns as Array<{
                results?: Array<{ dimension_values?: string[]; value?: number }>;
              }>;

              for (const breakdown of breakdowns) {
                const results = breakdown.results || [];
                const values: Record<string, number> = {};
                for (const result of results) {
                  const key = result.dimension_values?.join(".") || result.dimension_values?.[0] || "";
                  if (key && result.value) values[key] = result.value;
                }
                if (Object.keys(values).length > 0) demographics[`audience_${breakdownType}`] = values;
              }
            }
          }
        } catch (err) {
          console.log(`[ig-dashboard] Engaged demographics ${breakdownType} fetch failed:`, err);
        }
      }
    }

    const messages: string[] = [];
    if (mediaItems.length > maxInsightsPosts) {
      messages.push(
        `INSIGHTS_LIMIT: Buscamos insights detalhados apenas para os ${maxInsightsPosts} posts mais recentes.`,
      );
    }
    if (Object.keys(demographics).length === 0) {
      messages.push("DEMOGRAPHICS_EMPTY: Demografia indisponível para esta conta/permissões.");
    }

    const partialCount = mediaWithInsights.filter(
      (m) => m.computed?.has_insights === false || m.computed?.is_partial === true,
    ).length;
    if (partialCount > 0) {
      messages.push(`PARTIAL_METRICS: ${partialCount} itens com métricas parciais/indisponíveis.`);
    }

    let onlineFollowers: Record<string, number> = {};
    try {
      const onlineJson = await graphGet(`/${businessId}/insights`, accessToken, {
        metric: "online_followers",
        period: "lifetime",
      });
      const onlineData = (onlineJson as { data?: unknown[] }).data;
      if (Array.isArray(onlineData) && onlineData.length > 0) {
        const metric = onlineData[0] as { values?: Array<{ value?: Record<string, number> }> };
        if (metric.values && metric.values.length > 0) onlineFollowers = metric.values[0].value || {};
      }
    } catch (err) {
      console.log(`[ig-dashboard] Online followers fetch failed:`, err);
      onlineFollowers = {};
    }

    const mediaTypeDistribution = mediaWithInsights.reduce(
      (acc, m) => {
        const type = m.media_type || "UNKNOWN";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const duration = Date.now() - startedAt;

    const isReel = (m: MediaItem) => m.media_product_type === "REELS" || m.media_product_type === "REEL";

    const byScoreDesc = (a: MediaItem, b: MediaItem) => (b.computed?.score ?? -1) - (a.computed?.score ?? -1);

    const byReachDesc = (a: MediaItem, b: MediaItem) => (b.computed?.reach ?? -1) - (a.computed?.reach ?? -1);

    const byViewsDesc = (a: MediaItem, b: MediaItem) => (b.computed?.views ?? -1) - (a.computed?.views ?? -1);

    const nonReels = mediaWithInsights.filter((m) => !isReel(m));
    const reelsOnly = mediaWithInsights.filter((m) => isReel(m));

    const top_posts_by_score = [...nonReels].sort(byScoreDesc).slice(0, 20);
    const top_posts_by_reach = [...nonReels].sort(byReachDesc).slice(0, 20);
    const top_reels_by_views = [...reelsOnly].sort(byViewsDesc).slice(0, 20);
    const top_reels_by_score = [...reelsOnly].sort(byScoreDesc).slice(0, 20);

    const totalViews = mediaWithInsights.reduce((sum, m) => sum + (m.computed?.views ?? 0), 0);
    const totalReach = mediaWithInsights.reduce((sum, m) => sum + (m.computed?.reach ?? 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        duration_ms: duration,
        snapshot_date: new Date().toISOString().slice(0, 10),
        provider: "instagram_graph_api",
        api_version: "v24.0",
        profile,
        media: mediaWithInsights,
        posts: mediaWithInsights,
        total_posts: mediaWithInsights.length,
        total_views: totalViews,
        total_reach: totalReach,
        top_posts_by_score,
        top_posts_by_reach,
        top_reels_by_views,
        top_reels_by_score,
        media_type_distribution: mediaTypeDistribution,
        stories: storiesWithInsights,
        stories_aggregate: storiesAggregate,
        demographics,
        online_followers: onlineFollowers,
        messages,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ig-dashboard] Error:`, msg);
    
    const status = msg === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
