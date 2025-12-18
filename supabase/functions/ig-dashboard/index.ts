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
      typeof json === "object" && json && "error" in json
        ? JSON.stringify((json as { error?: unknown }).error)
        : text;
    throw new Error(`Graph API ${res.status}: ${msg}`);
  }
  return json;
}

async function fetchMediaInsights(
  accessToken: string, 
  mediaId: string, 
  mediaType: string, 
  mediaProductType?: string
): Promise<Record<string, number>> {
  // Different metrics available per media type - updated for Graph API v24.0
  // CAROUSEL_ALBUM posts have NO individual insights available via API
  
  if (mediaType === "CAROUSEL_ALBUM") {
    return {}; // Carousels don't have individual insights
  }
  
  // Determine if this is a Reel based on media_product_type
  const isReel = mediaProductType === "REELS" || mediaProductType === "REEL";
  
  let metrics: string;
  if (isReel) {
    // REELS-specific metrics (plays = views, shares available)
    metrics = "plays,reach,saved,shares,total_interactions";
  } else if (mediaType === "VIDEO") {
    // Feed VIDEO metrics (video_views = views)
    metrics = "reach,saved,video_views";
  } else {
    // IMAGE metrics
    metrics = "reach,saved";
  }
  
  try {
    const json = await graphGet(`/${mediaId}/insights`, accessToken, { metric: metrics });
    const data = (json as { data?: unknown }).data;
    if (!Array.isArray(data)) {
      console.log(`[ig-dashboard] No insights data for ${mediaId} (${mediaType}/${mediaProductType})`);
      return {};
    }
    const out: Record<string, number> = {};
    for (const item of data) {
      const name = typeof item === "object" && item && "name" in item ? (item as any).name : null;
      const values = typeof item === "object" && item && "values" in item ? (item as any).values : null;
      const lastValue = Array.isArray(values) && values.length > 0 ? values[values.length - 1]?.value : null;
      if (typeof name === "string" && typeof lastValue === "number") {
        out[name] = lastValue;
      }
    }
    
    // Normalize views: plays (reels) or video_views (feed videos) -> views
    if (out.plays) {
      out.views = out.plays;
    } else if (out.video_views) {
      out.views = out.video_views;
    }
    
    return out;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Log all errors for better debugging (remove error code filter)
    console.log(`[ig-dashboard] Insights error for ${mediaId} (${mediaType}/${mediaProductType}): ${errMsg.slice(0, 150)}`);
    return {};
  }
}

async function fetchStoryInsights(accessToken: string, storyId: string): Promise<Record<string, number>> {
  try {
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

    // Max posts to fetch (default 500, max 2000)
    const maxPosts = typeof body.maxPosts === "number" ? Math.max(1, Math.min(2000, body.maxPosts)) : 500;
    const maxStories = typeof body.maxStories === "number" ? Math.max(1, Math.min(50, body.maxStories)) : 25;

    console.log(`[ig-dashboard] Fetching data for businessId=${businessId}, maxPosts=${maxPosts}`);

    // Fetch profile
    const profileJson = await graphGet(`/${businessId}`, accessToken, {
      fields: "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website",
    });
    const profile = profileJson as InstagramProfile;
    console.log(`[ig-dashboard] Profile fetched: ${profile.username}, media_count=${profile.media_count}`);

    // Fetch ALL posts with pagination
    const allMedia: MediaItem[] = [];
    let nextUrl: string | null = null;
    const mediaFields = "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
    
    // First request
    const firstMediaJson = await graphGet(`/${businessId}/media`, accessToken, {
      fields: mediaFields,
      limit: "100", // Fetch 100 per page
    });
    
    const firstMediaData = (firstMediaJson as { data?: unknown; paging?: { next?: string } }).data;
    if (Array.isArray(firstMediaData)) {
      allMedia.push(...(firstMediaData as MediaItem[]));
    }
    nextUrl = (firstMediaJson as { paging?: { next?: string } }).paging?.next || null;
    
    // Pagination loop - fetch until we hit maxPosts or no more pages
    while (nextUrl && allMedia.length < maxPosts) {
      console.log(`[ig-dashboard] Fetching more posts... current count: ${allMedia.length}`);
      const pageJson = await graphGetWithUrl(nextUrl);
      const pageData = (pageJson as { data?: unknown; paging?: { next?: string } }).data;
      if (Array.isArray(pageData) && pageData.length > 0) {
        allMedia.push(...(pageData as MediaItem[]));
      } else {
        break;
      }
      nextUrl = (pageJson as { paging?: { next?: string } }).paging?.next || null;
    }
    
    // Trim to maxPosts if we got more
    const mediaItems = allMedia.slice(0, maxPosts);
    console.log(`[ig-dashboard] Total posts fetched: ${mediaItems.length}`);

    // Fetch stories
    const storiesJson = await graphGet(`/${businessId}/stories`, accessToken, {
      fields: "id,media_type,media_url,permalink,timestamp",
      limit: String(maxStories),
    });
    const storiesData = (storiesJson as { data?: unknown }).data;
    const storyItems: StoryItem[] = Array.isArray(storiesData) ? (storiesData as any) : [];
    console.log(`[ig-dashboard] Stories fetched: ${storyItems.length}`);

    // Fetch per-item insights (batch in groups to avoid rate limits)
    const INSIGHTS_BATCH_SIZE = 50;
    const mediaWithInsights: MediaItem[] = [];
    let insightsSuccessCount = 0;
    let insightsErrorCount = 0;
    
    // Log media type and product type distribution
    const mediaTypeCounts = mediaItems.reduce((acc, m) => {
      const key = m.media_product_type ? `${m.media_type}/${m.media_product_type}` : m.media_type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[ig-dashboard] Media types (type/product): ${JSON.stringify(mediaTypeCounts)}`);
    
    for (let i = 0; i < mediaItems.length; i += INSIGHTS_BATCH_SIZE) {
      const batch = mediaItems.slice(i, i + INSIGHTS_BATCH_SIZE);
      console.log(`[ig-dashboard] Fetching insights batch ${Math.floor(i/INSIGHTS_BATCH_SIZE) + 1}/${Math.ceil(mediaItems.length/INSIGHTS_BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (m) => {
          const insights = await fetchMediaInsights(accessToken, m.id, m.media_type, m.media_product_type);
          if (Object.keys(insights).length > 0) {
            insightsSuccessCount++;
          } else if (m.media_type !== "CAROUSEL_ALBUM") {
            insightsErrorCount++;
          }
          const engagement = (m.like_count ?? 0) + (m.comments_count ?? 0) + (insights.saved ?? 0);
          return { ...m, insights: { ...insights, engagement } };
        }),
      );
      mediaWithInsights.push(...batchResults);
    }
    
    console.log(`[ig-dashboard] Insights fetch complete: ${insightsSuccessCount} success, ${insightsErrorCount} failed/empty (carousels excluded)`);

    const storiesWithInsights = await Promise.all(
      storyItems.map(async (s) => {
        const insights = await fetchStoryInsights(accessToken, s.id);
        const completionRate =
          insights.impressions && insights.exits
            ? Math.round((1 - insights.exits / insights.impressions) * 100)
            : 0;
        return { ...s, insights: { ...insights, completion_rate: completionRate } };
      }),
    );

    // Aggregate stories metrics
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

    // Demographics - fetch each breakdown separately to handle partial failures
    let demographics: Record<string, unknown> = {};
    const breakdownTypes = ["age", "gender", "country", "city"];
    
    for (const breakdownType of breakdownTypes) {
      try {
        console.log(`[ig-dashboard] Fetching demographics breakdown: ${breakdownType}`);
        const demoJson = await graphGet(`/${businessId}/insights`, accessToken, {
          metric: "follower_demographics",
          period: "lifetime",
          metric_type: "total_value",
          breakdown: breakdownType,
          timeframe: "this_month",
        });
        
        const demoData = (demoJson as { data?: unknown[] }).data;
        if (Array.isArray(demoData) && demoData.length > 0) {
          const metric = demoData[0] as { total_value?: { breakdowns?: unknown[] } };
          if (metric.total_value?.breakdowns) {
            const breakdowns = metric.total_value.breakdowns as Array<{
              dimension_keys?: string[];
              results?: Array<{ dimension_values?: string[]; value?: number }>;
            }>;
            
            for (const breakdown of breakdowns) {
              const results = breakdown.results || [];
              const values: Record<string, number> = {};
              
              for (const result of results) {
                const key = result.dimension_values?.join(".") || result.dimension_values?.[0] || "";
                if (key && result.value) {
                  values[key] = result.value;
                }
              }
              
              if (Object.keys(values).length > 0) {
                demographics[`audience_${breakdownType}`] = values;
                console.log(`[ig-dashboard] Demographics ${breakdownType} fetched: ${Object.keys(values).length} entries`);
              }
            }
          }
        }
      } catch (err) {
        console.log(`[ig-dashboard] Demographics ${breakdownType} fetch failed:`, err);
      }
    }
    
    // Fallback: try engaged_audience_demographics if follower_demographics failed
    if (Object.keys(demographics).length === 0) {
      console.log(`[ig-dashboard] Trying fallback: engaged_audience_demographics`);
      for (const breakdownType of breakdownTypes) {
        try {
          const demoJson = await graphGet(`/${businessId}/insights`, accessToken, {
            metric: "engaged_audience_demographics",
            period: "lifetime",
            metric_type: "total_value",
            breakdown: breakdownType,
            timeframe: "this_month",
          });
          
          const demoData = (demoJson as { data?: unknown[] }).data;
          if (Array.isArray(demoData) && demoData.length > 0) {
            const metric = demoData[0] as { total_value?: { breakdowns?: unknown[] } };
            if (metric.total_value?.breakdowns) {
              const breakdowns = metric.total_value.breakdowns as Array<{
                dimension_keys?: string[];
                results?: Array<{ dimension_values?: string[]; value?: number }>;
              }>;
              
              for (const breakdown of breakdowns) {
                const results = breakdown.results || [];
                const values: Record<string, number> = {};
                
                for (const result of results) {
                  const key = result.dimension_values?.join(".") || result.dimension_values?.[0] || "";
                  if (key && result.value) {
                    values[key] = result.value;
                  }
                }
                
                if (Object.keys(values).length > 0) {
                  demographics[`audience_${breakdownType}`] = values;
                  console.log(`[ig-dashboard] Engaged demographics ${breakdownType} fetched: ${Object.keys(values).length} entries`);
                }
              }
            }
          }
        } catch (err) {
          console.log(`[ig-dashboard] Engaged demographics ${breakdownType} fetch failed:`, err);
        }
      }
    }
    
    console.log(`[ig-dashboard] Demographics final result:`, Object.keys(demographics));

    // Online followers
    let onlineFollowers: Record<string, number> = {};
    try {
      const onlineJson = await graphGet(`/${businessId}/insights`, accessToken, {
        metric: "online_followers",
        period: "lifetime",
      });
      const onlineData = (onlineJson as { data?: unknown[] }).data;
      if (Array.isArray(onlineData) && onlineData.length > 0) {
        const metric = onlineData[0] as { values?: Array<{ value?: Record<string, number> }> };
        if (metric.values && metric.values.length > 0) {
          onlineFollowers = metric.values[0].value || {};
        }
      }
      console.log(`[ig-dashboard] Online followers fetched:`, Object.keys(onlineFollowers).length > 0);
    } catch (err) {
      console.log(`[ig-dashboard] Online followers fetch failed:`, err);
      onlineFollowers = {};
    }

    // Calculate media type distribution
    const mediaTypeDistribution = mediaWithInsights.reduce((acc, m) => {
      const type = m.media_type || "UNKNOWN";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duration = Date.now() - startedAt;
    console.log(`[ig-dashboard] Request completed in ${duration}ms`);
    
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
