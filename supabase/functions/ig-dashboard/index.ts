import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  // Normalize metric name changes across Graph API versions.
  // - "saved" vs "saves"
  // - "plays" / "video_views" / "impressions" -> "views" (canonical field for display)
  // Keep canonical keys used by the frontend: views, reach, saved, shares, total_interactions, engagement.
  const saved = raw.saved ?? raw.saves;
  const views = raw.views ?? raw.video_views ?? raw.plays ?? raw.impressions;
  const reach = raw.reach;
  const shares = raw.shares;
  const total_interactions =
    raw.total_interactions ??
    // Some API versions expose "engagement" at media-level; treat it as interactions when present.
    raw.engagement;

  // Provide both aliases so older/newer frontends keep working.
  // Frontend uses "saved" today, but we also include "saves" for convenience.
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

  const candidates: string[] = [];

  if (isCarousel) {
    // Use only metrics that are widely supported by the API for media insights.
    candidates.push(
      "impressions,reach,saved,shares,total_interactions",
      "impressions,reach,saved,total_interactions",
      "reach,saved,total_interactions",
      "reach,saved",
      "impressions,reach",
      "reach",
    );
  } else if (isReel) {
    // reels: "plays" may be supported depending on API/account; keep fallbacks.
    candidates.push(
      "plays,reach,saved,shares,total_interactions",
      "impressions,reach,saved,shares,total_interactions",
      "plays,reach,saved",
      "impressions,reach,saved",
      "reach,saved",
      "impressions,reach",
      "reach",
    );
  } else if (mediaType === "VIDEO") {
    // vídeo feed: "video_views" is the common metric; use impressions as a fallback.
    candidates.push(
      "video_views,reach,saved,shares,total_interactions",
      "video_views,reach,saved,total_interactions",
      "impressions,reach,saved,shares,total_interactions",
      "video_views,reach,saved",
      "impressions,reach,saved",
      "reach,saved",
      "impressions,reach",
      "reach",
    );
  } else {
    // imagem (no video views; use impressions as an exposure proxy)
    candidates.push(
      "impressions,reach,saved,total_interactions",
      "impressions,reach,saved",
      "reach,saved",
      "impressions,reach",
      "reach",
    );
  }

  for (const metric of candidates) {
    try {
      const json = await graphGet(`/${mediaId}/insights`, accessToken, { metric });
      const raw = parseInsightsResponse(json);
      const normalized = normalizeMediaInsights(raw);
      if (Object.keys(normalized).length > 0) return normalized;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[ig-dashboard] Insights attempt failed media=${mediaId} metric=${metric}: ${errMsg.slice(0, 180)}`);
      continue;
    }
  }

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
  const viewsPick = pickMetric(insightsRaw, ["views", "plays", "video_views", "impressions"]);
  const sharesPick = pickMetric(insightsRaw, ["shares"]);
  const totalInteractionsPick = pickMetric(insightsRaw, ["total_interactions", "engagement"]);

  const saves = savesPick.value;
  const reach = reachPick.value;
  const views = viewsPick.value ?? reach;
  const shares = sharesPick.value;

  const engagement = likes + comments + (saves ?? 0) + (shares ?? 0);
  const score = likes * 1 + comments * 2 + (saves ?? 0) * 3 + (shares ?? 0) * 4;

  const followers = typeof followersCount === "number" && followersCount > 0 ? followersCount : null;

  const er = followers ? (engagement / followers) * 100 : null;
  const reachRate = followers && typeof reach === "number" ? (reach / followers) * 100 : null;
  const viewsRate = typeof reach === "number" && reach > 0 && typeof views === "number" ? (views / reach) * 100 : null;
  const interactionsPer1000Reach = typeof reach === "number" && reach > 0 ? (engagement / reach) * 1000 : null;

  const expectsViews =
    media.media_product_type === "REELS" ||
    media.media_product_type === "REEL" ||
    media.media_type === "VIDEO";

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
  if (typeof totalInteractionsPick.value === "number") normalizedInsights.total_interactions = totalInteractionsPick.value;

  const computed: ComputedMetrics = {
    likes,
    comments,
    saves,
    shares,
    reach,
    views,
    views_source: viewsPick.value !== null ? viewsPick.source : reach !== null ? "reach" : null,
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
      metric: "impressions,reach,replies,exits,taps_forward,taps_back",
    });
    const raw = parseInsightsResponse(json);
    return raw;
  } catch {
    return {};
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
    const body = (await req.json().catch(() => ({}))) as DashboardRequest;

    const businessId = body.businessId ?? Deno.env.get("IG_BUSINESS_ID") ?? "";
    const accessToken = Deno.env.get("IG_ACCESS_TOKEN") ?? "";
    if (!businessId || !accessToken) {
      throw new Error("Missing IG_BUSINESS_ID / IG_ACCESS_TOKEN secrets");
    }

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
        const impressions = insights.impressions ?? 0;
        const exits = insights.exits ?? 0;
        const completionRate = impressions > 0 ? Math.round((1 - exits / impressions) * 100) : 0;
        return { ...s, insights: { ...insights, completion_rate: completionRate } };
      }),
    );

    type StoryInsightsData = {
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
        acc.total_impressions += asNumber(insights.impressions) ?? 0;
        acc.total_reach += asNumber(insights.reach) ?? 0;
        acc.total_replies += asNumber(insights.replies) ?? 0;
        acc.total_exits += asNumber(insights.exits) ?? 0;
        acc.total_taps_forward += asNumber(insights.taps_forward) ?? 0;
        acc.total_taps_back += asNumber(insights.taps_back) ?? 0;
        return acc;
      },
      {
        total_stories: 0,
        total_impressions: 0,
        total_reach: 0,
        total_replies: 0,
        total_exits: 0,
        total_taps_forward: 0,
        total_taps_back: 0,
        avg_completion_rate: 0,
      },
    );

    if (storiesAggregate.total_impressions > 0) {
      storiesAggregate.avg_completion_rate = Math.round(
        (1 - storiesAggregate.total_exits / storiesAggregate.total_impressions) * 100,
      );
    }

    // Demographics e online_followers mantidos como estavam, sem mexer aqui
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
      messages.push(`INSIGHTS_LIMIT: Buscamos insights detalhados apenas para os ${maxInsightsPosts} posts mais recentes.`);
    }
    if (Object.keys(demographics).length === 0) {
      messages.push("DEMOGRAPHICS_EMPTY: Demografia indisponível para esta conta/permissões.");
    }

    const partialCount = mediaWithInsights.filter((m) => m.computed?.has_insights === false || m.computed?.is_partial === true).length;
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

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        duration_ms: duration,
        snapshot_date: new Date().toISOString().slice(0, 10),
        provider: "instagram_graph_api",
        profile,
        media: mediaWithInsights,
        posts: mediaWithInsights,
        total_posts: mediaWithInsights.length,
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
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
