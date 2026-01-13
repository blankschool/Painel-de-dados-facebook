/**
 * Instagram Daily Sync Edge Function
 * 
 * Runs daily to collect account-level metrics (reach, impressions, accounts_engaged, etc.)
 * that can only be retrieved from the Instagram API for the last 30 days.
 * 
 * This enables Minter.io-like historical data by collecting and storing daily metrics.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dual API base URLs for token type support
const FB_GRAPH_BASE = "https://graph.facebook.com/v24.0";
const IG_GRAPH_BASE = "https://graph.instagram.com/v24.0";

type TokenType = 'IGAA' | 'EAA' | 'unknown';

function detectTokenType(token: string): TokenType {
  if (token.startsWith('IGAA') || token.startsWith('IGQV') || token.startsWith('IG')) {
    return 'IGAA';
  }
  if (token.startsWith('EAA')) {
    return 'EAA';
  }
  return 'unknown';
}

function getGraphBase(tokenType: TokenType): string {
  return tokenType === 'IGAA' ? IG_GRAPH_BASE : FB_GRAPH_BASE;
}

async function decryptToken(storedToken: string): Promise<string> {
  if (storedToken.startsWith('ENCRYPTED:')) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Cannot decrypt token: ENCRYPTION_KEY not configured');
    }

    try {
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
    } catch (error) {
      console.error('[ig-daily-sync] Decryption error:', error);
      throw new Error('Failed to decrypt access token');
    }
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
    // Not base64
  }

  return storedToken;
}

async function graphGet(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
  graphBase: string = FB_GRAPH_BASE
): Promise<unknown> {
  const url = new URL(`${graphBase}${path}`);
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
    const msg = typeof json === "object" && json && "error" in json
      ? JSON.stringify((json as { error?: unknown }).error)
      : text;
    throw new Error(`Graph API ${res.status}: ${msg}`);
  }

  return json;
}

type InsightValue = { value?: unknown; end_time?: string };
type DailyInsightsMap = Record<string, Record<string, number>>;

// Maximum reasonable values for daily metrics (to catch cumulative values being stored as daily)
const MAX_DAILY_VALUES: Record<string, number> = {
  reach: 500000,      // Max 500k reach per day
  impressions: 1000000, // Max 1M impressions per day
  profile_views: 100000,
  accounts_engaged: 100000,
  website_clicks: 50000,
  follower_count: 10000000, // 10M max followers
};

function addDailyInsightValues(
  map: DailyInsightsMap,
  metricName: string,
  values: InsightValue[] = [],
) {
  for (const entry of values) {
    const value = typeof entry?.value === "number" && Number.isFinite(entry.value) ? entry.value : null;
    if (value === null) continue;
    const endTime = typeof entry?.end_time === "string" ? entry.end_time : null;
    if (!endTime) continue;
    const dateKey = new Date(endTime).toISOString().slice(0, 10);
    
    // Validate value is within reasonable daily range
    const maxValue = MAX_DAILY_VALUES[metricName];
    if (maxValue && value > maxValue) {
      console.warn(`[ig-daily-sync] ⚠ Suspicious ${metricName} value ${value} for ${dateKey} exceeds max ${maxValue} - skipping`);
      continue;
    }
    
    if (!map[dateKey]) map[dateKey] = {};
    map[dateKey][metricName] = value;
    console.log(`[ig-daily-sync] Added ${metricName}=${value} for ${dateKey}`);
  }
}

function mapDailyInsights(map: DailyInsightsMap) {
  return Object.entries(map)
    .map(([insight_date, metrics]) => ({ insight_date, ...metrics }))
    .sort((a, b) => a.insight_date.localeCompare(b.insight_date));
}

type DailyInsightRecord = {
  insight_date: string;
  reach?: number;
  impressions?: number;
  accounts_engaged?: number;
  profile_views?: number;
  website_clicks?: number;
  follower_count?: number;
  email_contacts?: number;
  phone_call_clicks?: number;
  text_message_clicks?: number;
  get_directions_clicks?: number;
};

async function syncAccountDailyInsights(
  supabase: any,
  account: {
    id: string;
    provider_account_id: string;
    access_token: string;
    account_username?: string;
  },
  daysBack: number = 2  // Default to last 2 days for daily sync
): Promise<{ success: boolean; days: number; error?: string }> {
  const accountId = account.id;
  const businessId = account.provider_account_id;
  
  console.log(`[ig-daily-sync] Syncing account ${account.account_username || accountId} (${daysBack} days back)`);

  try {
    const accessToken = await decryptToken(account.access_token);
    const tokenType = detectTokenType(accessToken);
    const graphBase = getGraphBase(tokenType);

    // Calculate date range
    const until = new Date();
    const since = new Date(until.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const sinceDate = since.toISOString().split('T')[0];
    const untilDate = until.toISOString().split('T')[0];

    console.log(`[ig-daily-sync] Fetching metrics from ${sinceDate} to ${untilDate}`);

    const dailyMap: DailyInsightsMap = {};
    const totals: Record<string, number> = {};

    const collectMetrics = (payload: unknown) => {
      const values = (payload as { data?: unknown[] }).data;
      if (!Array.isArray(values)) return;
      for (const metric of values) {
        const metricData = metric as { name?: string; values?: InsightValue[] };
        if (metricData.name && metricData.values) {
          const lastValue = [...metricData.values].reverse().find((v) => typeof v.value === "number")?.value;
          if (metricData.name === 'follower_count') {
            if (typeof lastValue === 'number') {
              totals[metricData.name] = lastValue;
            }
          } else {
            const total = metricData.values.reduce((sum, v) => sum + (typeof v.value === "number" ? v.value : 0), 0);
            totals[metricData.name] = total;
          }
          addDailyInsightValues(dailyMap, metricData.name, metricData.values);
        }
      }
    };

    // Try to fetch metrics with retry on alternate endpoint
    const fetchMetricsWithRetry = async (metrics: string[], label: string) => {
      const endpoints = [
        { base: graphBase, name: tokenType === 'IGAA' ? 'graph.instagram.com' : 'graph.facebook.com' },
        { base: tokenType === 'IGAA' ? FB_GRAPH_BASE : IG_GRAPH_BASE, name: tokenType === 'IGAA' ? 'graph.facebook.com' : 'graph.instagram.com' },
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[ig-daily-sync] Fetching ${label} from ${endpoint.name}...`);
          const json = await graphGet(`/${businessId}/insights`, accessToken, {
            metric: metrics.join(','),
            period: 'day',
            since: sinceDate,
            until: untilDate,
          }, endpoint.base);
          
          // Log raw response for debugging
          const responseData = (json as { data?: unknown[] }).data;
          console.log(`[ig-daily-sync] ${label} raw response: ${Array.isArray(responseData) ? responseData.length : 0} metrics`);
          
          if (Array.isArray(responseData)) {
            for (const metric of responseData) {
              const m = metric as { name?: string; values?: unknown[] };
              console.log(`[ig-daily-sync]   ${m.name}: ${m.values?.length ?? 0} values`);
            }
          }
          
          collectMetrics(json);
          console.log(`[ig-daily-sync] ✓ ${label} fetched successfully from ${endpoint.name}`);
          return true;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.log(`[ig-daily-sync] ⚠ ${label} failed on ${endpoint.name}: ${errMsg}`);
          // Continue to next endpoint
        }
      }
      console.log(`[ig-daily-sync] ✗ ${label} failed on all endpoints`);
      return false;
    };

    // Fetch all metric types with retry logic
    console.log(`[ig-daily-sync] Token type: ${tokenType}, Primary endpoint: ${graphBase}`);
    await fetchMetricsWithRetry(['reach', 'profile_views'], 'reach/profile_views');
    await fetchMetricsWithRetry(['impressions'], 'impressions');
    await fetchMetricsWithRetry(['accounts_engaged'], 'accounts_engaged');
    await fetchMetricsWithRetry(['follower_count'], 'follower_count');
    await fetchMetricsWithRetry(
      ['website_clicks', 'text_message_clicks', 'email_contacts', 'phone_call_clicks', 'get_directions_clicks'],
      'contact_clicks'
    );
    
    // Log summary of collected data
    console.log(`[ig-daily-sync] Collected metrics for ${Object.keys(dailyMap).length} days:`);
    for (const [date, metrics] of Object.entries(dailyMap)) {
      console.log(`[ig-daily-sync]   ${date}: ${Object.keys(metrics).join(', ')}`);
    }

    const dailyInsights = mapDailyInsights(dailyMap) as DailyInsightRecord[];

    if (dailyInsights.length === 0) {
      console.log(`[ig-daily-sync] No daily insights collected for ${account.account_username}`);
      return { success: true, days: 0 };
    }

    // Also fetch current follower count from profile for the latest day
    try {
      const profileJson = await graphGet(`/${businessId}`, accessToken, {
        fields: "followers_count",
      }, graphBase) as { followers_count?: number };
      
      if (typeof profileJson.followers_count === "number") {
        const latestDate = dailyInsights[dailyInsights.length - 1]?.insight_date;
        const latestRow = dailyInsights.find(r => r.insight_date === latestDate);
        if (latestRow) {
          latestRow.follower_count = profileJson.followers_count;
        }
      }
    } catch (err) {
      console.log(`[ig-daily-sync] Failed to fetch profile followers:`, err);
    }

    // Upsert daily insights to database
    const rows = dailyInsights.map((row) => ({
      account_id: accountId,
      insight_date: row.insight_date,
      reach: row.reach ?? null,
      impressions: row.impressions ?? null,
      accounts_engaged: row.accounts_engaged ?? null,
      profile_views: row.profile_views ?? null,
      website_clicks: row.website_clicks ?? null,
      follower_count: row.follower_count ?? null,
      email_contacts: row.email_contacts ?? null,
      phone_call_clicks: row.phone_call_clicks ?? null,
      text_message_clicks: row.text_message_clicks ?? null,
      get_directions_clicks: row.get_directions_clicks ?? null,
    }));

    const { error: upsertError } = await supabase
      .from('instagram_daily_insights')
      .upsert(rows, { onConflict: 'account_id,insight_date' });

    if (upsertError) {
      console.error(`[ig-daily-sync] Failed to upsert insights:`, upsertError);
      return { success: false, days: 0, error: upsertError.message };
    }

    // Update cache metadata
    const { error: metaError } = await supabase
      .from('instagram_cache_metadata')
      .upsert({
        account_id: accountId,
        last_insights_sync: new Date().toISOString(),
      }, { onConflict: 'account_id' });

    if (metaError) {
      console.log(`[ig-daily-sync] Failed to update cache metadata:`, metaError);
    }

    console.log(`[ig-daily-sync] ✓ Saved ${rows.length} daily insight rows for ${account.account_username}`);
    return { success: true, days: rows.length };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ig-daily-sync] Error syncing ${account.account_username}:`, errorMsg);
    return { success: false, days: 0, error: errorMsg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    // Parse request body for optional parameters
    let daysBack = 2; // Default for scheduled runs
    let accountId: string | null = null;
    let backfill = false;

    try {
      const body = await req.json();
      if (typeof body.daysBack === 'number') daysBack = Math.min(30, Math.max(1, body.daysBack));
      if (typeof body.accountId === 'string') accountId = body.accountId;
      if (body.backfill === true) {
        backfill = true;
        daysBack = 30; // Max backfill is 30 days (API limitation)
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log(`[ig-daily-sync] Starting sync (daysBack=${daysBack}, backfill=${backfill}, accountId=${accountId || 'all'})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all connected accounts (or specific one)
    let query = supabase
      .from('connected_accounts')
      .select('id, provider_account_id, access_token, account_username')
      .in('provider', ['facebook', 'instagram']);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No connected accounts to sync',
          accounts_synced: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ig-daily-sync] Found ${accounts.length} account(s) to sync`);

    // Sync each account
    const results: Array<{ account: string; success: boolean; days: number; error?: string }> = [];

    for (const account of accounts) {
      const result = await syncAccountDailyInsights(supabase, account, daysBack);
      results.push({
        account: account.account_username || account.id,
        ...result,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalDays = results.reduce((sum, r) => sum + r.days, 0);
    const duration = Date.now() - startedAt;

    console.log(`[ig-daily-sync] Completed: ${successCount}/${results.length} accounts synced, ${totalDays} total day rows, ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        accounts_synced: successCount,
        total_accounts: results.length,
        total_days_synced: totalDays,
        duration_ms: duration,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[ig-daily-sync] Fatal error:', errorMsg);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
