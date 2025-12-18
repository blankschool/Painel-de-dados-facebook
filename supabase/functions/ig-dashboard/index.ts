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
  const isAllowed =
    !!origin && (allowedOrigins.includes(origin) || isLovableOrigin(origin) || isDevOrigin(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-dev-secret",
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

async function graphGet(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<unknown> {
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
      typeof json === "object" && json && "error" in json
        ? JSON.stringify((json as { error?: unknown }).error)
        : text;
    throw new Error(`Graph API ${res.status}: ${msg}`);
  }
  return json;
}

async function fetchMediaInsights(accessToken: string, mediaId: string): Promise<Record<string, number>> {
  const json = await graphGet(`/${mediaId}/insights`, accessToken, {
    metric: "impressions,reach,saved,shares,plays,video_views",
  });
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) return {};
  const out: Record<string, number> = {};
  for (const item of data) {
    const name = typeof item === "object" && item && "name" in item ? (item as any).name : null;
    const values = typeof item === "object" && item && "values" in item ? (item as any).values : null;
    const lastValue = Array.isArray(values) && values.length > 0 ? values[values.length - 1]?.value : null;
    if (typeof name === "string" && typeof lastValue === "number") out[name] = lastValue;
  }
  return out;
}

async function fetchStoryInsights(accessToken: string, storyId: string): Promise<Record<string, number>> {
  const json = await graphGet(`/${storyId}/insights`, accessToken, {
    metric: "impressions,reach,replies,exits,taps_forward,taps_back",
  });
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) return {};
  const out: Record<string, number> = {};
  for (const item of data) {
    const name = typeof item === "object" && item && "name" in item ? (item as any).name : null;
    const values = typeof item === "object" && item && "values" in item ? (item as any).values : null;
    const lastValue = Array.isArray(values) && values.length > 0 ? values[values.length - 1]?.value : null;
    if (typeof name === "string" && typeof lastValue === "number") out[name] = lastValue;
  }
  return out;
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

    const maxPosts = typeof body.maxPosts === "number" ? Math.max(1, Math.min(50, body.maxPosts)) : 25;
    const maxStories = typeof body.maxStories === "number"
      ? Math.max(1, Math.min(50, body.maxStories))
      : 25;

    const profileJson = await graphGet(`/${businessId}`, accessToken, {
      fields:
        "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website",
    });
    const profile = profileJson as InstagramProfile;

    const mediaJson = await graphGet(`/${businessId}/media`, accessToken, {
      fields:
        "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
      limit: String(maxPosts),
    });

    const mediaData = (mediaJson as { data?: unknown }).data;
    const mediaItems: MediaItem[] = Array.isArray(mediaData) ? (mediaData as any) : [];

    const storiesJson = await graphGet(`/${businessId}/stories`, accessToken, {
      fields: "id,media_type,media_url,permalink,timestamp",
      limit: String(maxStories),
    });
    const storiesData = (storiesJson as { data?: unknown }).data;
    const storyItems: StoryItem[] = Array.isArray(storiesData) ? (storiesData as any) : [];

    // Fetch per-item insights (best-effort; partial failures won't break the whole response).
    const mediaWithInsights = await Promise.all(
      mediaItems.map(async (m) => {
        try {
          const insights = await fetchMediaInsights(accessToken, m.id);
          const engagement = (m.like_count ?? 0) + (m.comments_count ?? 0) + (insights.saved ?? 0);
          return { ...m, insights: { ...insights, engagement } };
        } catch {
          const engagement = (m.like_count ?? 0) + (m.comments_count ?? 0);
          return { ...m, insights: { engagement } };
        }
      }),
    );

    const storiesWithInsights = await Promise.all(
      storyItems.map(async (s) => {
        try {
          const insights = await fetchStoryInsights(accessToken, s.id);
          const completionRate =
            insights.impressions && insights.exits
              ? Math.round((1 - insights.exits / insights.impressions) * 100)
              : 0;
          return { ...s, insights: { ...insights, completion_rate: completionRate } };
        } catch {
          return { ...s, insights: {} };
        }
      }),
    );

    // Aggregate stories metrics for UI compatibility.
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

    // Demographics + online followers (best effort; not all accounts have these metrics enabled).
    let demographics: Record<string, unknown> = {};
    let onlineFollowers: Record<string, number> = {};
    try {
      const demoJson = await graphGet(`/${businessId}/insights`, accessToken, {
        metric: "audience_gender_age,audience_country,audience_city,audience_locale",
        period: "lifetime",
      });
      demographics = demoJson as Record<string, unknown>;
    } catch {
      demographics = {};
    }
    try {
      const onlineJson = await graphGet(`/${businessId}/insights`, accessToken, {
        metric: "online_followers",
        period: "lifetime",
      });
      onlineFollowers = onlineJson as unknown as Record<string, number>;
    } catch {
      onlineFollowers = {};
    }

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
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

