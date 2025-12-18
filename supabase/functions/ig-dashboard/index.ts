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
    const name = typeof item === "object" && item && "name" in item ? (item as any).name : null;
    const values = typeof item === "object" && item && "values" in item ? (item as any).values : null;
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
  // - "plays" / "video_views" -> "views" (post-level "media views")
  // Keep canonical keys used by the frontend: views, reach, saved, shares, total_interactions, engagement.

  const saved = raw.saved ?? raw.saves ?? raw.carousel_album_saved ?? 0;

  const views = raw.views ?? raw.video_views ?? raw.plays ?? raw.carousel_album_video_views ?? 0;

  const reach = raw.reach ?? raw.carousel_album_reach ?? 0;

  const shares = raw.shares ?? 0;

  const total_interactions =
    raw.total_interactions ??
    // Some API versions expose "engagement" at media-level; treat it as interactions when present.
    raw.engagement ??
    0;

  // Provide both aliases so older/newer frontends keep working.
  // Frontend uses "saved" today, but we also include "saves" for convenience.
  return {
    ...raw,
    views,
    reach,
    saved,
    saves: raw.saves ?? saved,
    shares,
    total_interactions,
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
    // carrossel tem métricas específicas em vários casos
    candidates.push(
      "carousel_album_reach,carousel_album_saved,carousel_album_video_views,shares,total_interactions",
      "carousel_album_reach,carousel_album_saved,carousel_album_video_views",
      "carousel_album_reach,carousel_album_saved",
      "reach,saved,shares,total_interactions",
      "reach,saved",
    );
  } else if (isReel) {
    // reels: em alguns cenários vem views, em outros plays
    candidates.push(
      "views,reach,saved,shares,total_interactions",
      "plays,reach,saved,shares,total_interactions",
      "views,reach,saved",
      "plays,reach,saved",
      "reach,saved",
    );
  } else if (mediaType === "VIDEO") {
    // vídeo feed: pode retornar video_views e/ou views dependendo da versão/conta
    candidates.push(
      "video_views,views,reach,saved,shares,total_interactions",
      "video_views,reach,saved,shares,total_interactions",
      "views,reach,saved,shares,total_interactions",
      "video_views,reach,saved",
      "views,reach,saved",
      "reach,saved",
    );
  } else {
    // imagem
    candidates.push("reach,saved,shares,total_interactions", "reach,saved");
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

    console.log(`[ig-dashboard] Fetching data for businessId=${businessId}, maxPosts=${maxPosts}`);

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
    const storyItems: StoryItem[] = Array.isArray(storiesData) ? (storiesData as any) : [];

    const INSIGHTS_BATCH_SIZE = 50;
    const mediaWithInsights: MediaItem[] = [];

    for (let i = 0; i < mediaItems.length; i += INSIGHTS_BATCH_SIZE) {
      const batch = mediaItems.slice(i, i + INSIGHTS_BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (m) => {
          const insights = await fetchMediaInsights(accessToken, m.id, m.media_type, m.media_product_type);

          const saved = insights.saved ?? 0;
          const reach = insights.reach ?? 0;
          const views = insights.views ?? 0;
          const shares = insights.shares ?? 0;
          const totalInteractions = insights.total_interactions ?? 0;

          const engagement = (m.like_count ?? 0) + (m.comments_count ?? 0) + saved;

          return {
            ...m,
            insights: {
              ...insights,
              saved,
              reach,
              views,
              shares,
              total_interactions: totalInteractions,
              engagement,
            },
          };
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
    let demographics: Record<string, unknown> = {};
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
        media_type_distribution: mediaTypeDistribution,
        stories: storiesWithInsights,
        stories_aggregate: storiesAggregate,
        demographics,
        online_followers: onlineFollowers,
        messages: [],
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
