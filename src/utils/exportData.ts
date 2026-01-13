import type { DateRange } from "react-day-picker";
import type { IgDashboardResponse, DailyInsightRow, ProfileSnapshot } from "@/hooks/useDashboardData";
import type { FiltersState } from "@/contexts/FiltersContext";
import type { IgMediaItem } from "@/utils/ig";
import { getComputedNumber, getEngagement, getReach, getSaves, getShares, getViews } from "@/utils/ig";
import { getBestPostPerDay } from "@/lib/dashboardHelpers";

type ExportSummary = {
  total_posts: number;
  total_reach: number;
  total_views: number;
  total_engagement: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_shares: number;
  avg_er: number | null;
  avg_reach: number | null;
};

type ApiMetadata = {
  api_version: string;
  token_type: string;
  from_cache: boolean;
  cache_age_hours: number | undefined;
  snapshot_date: string;
  duration_ms: number | undefined;
  request_id: string | undefined;
};

type ConsolidatedMetrics = {
  reach: number;
  impressions: number;
  profile_views: number;
};

export type ExportPayload = {
  exported_at: string;
  filters: {
    date_range_preset: FiltersState["dateRangePreset"];
    day_filter: FiltersState["dayFilter"];
    media_type: FiltersState["mediaType"];
    search_query: string;
    timezone: string;
    period_from: string | null;
    period_to: string | null;
  };
  profile: IgDashboardResponse["profile"] | null;
  summary: ExportSummary;
  media_filtered: IgMediaItem[];
  media_best_per_day: IgMediaItem[];
  stories: IgDashboardResponse["stories"] | null | undefined;
  stories_aggregate: IgDashboardResponse["stories_aggregate"] | null | undefined;
  demographics: IgDashboardResponse["demographics"] | null | undefined;
  online_followers: IgDashboardResponse["online_followers"] | null | undefined;
  account_insights: Record<string, number> | undefined;
  previous_period_insights: Record<string, number> | undefined;
  comparison_metrics: Record<string, { current: number; previous: number; change: number; changePercent: number }> | undefined;
  messages: IgDashboardResponse["messages"] | null | undefined;
  // Novos campos para exportação completa
  daily_insights: DailyInsightRow[];
  previous_daily_insights: DailyInsightRow[];
  profile_snapshots: ProfileSnapshot[];
  top_posts_by_score: IgMediaItem[];
  top_posts_by_reach: IgMediaItem[];
  top_reels_by_views: IgMediaItem[];
  top_reels_by_score: IgMediaItem[];
  media_type_distribution: Record<string, number> | undefined;
  consolidated_metrics: ConsolidatedMetrics;
  api_metadata: ApiMetadata;
};

function formatDateOnly(date: Date | undefined | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function matchesDayFilter(dayOfWeek: number, filter: FiltersState["dayFilter"]): boolean {
  switch (filter) {
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekends":
      return dayOfWeek === 0 || dayOfWeek === 6;
    case "best":
    case "all":
    default:
      return true;
  }
}

export function filterMediaForExport(
  media: IgMediaItem[],
  filters: FiltersState,
  dateRange: DateRange | undefined,
): IgMediaItem[] {
  if (!media || media.length === 0) return [];
  let filtered = [...media];

  if (dateRange?.from || dateRange?.to) {
    const startDate = dateRange.from ? new Date(dateRange.from) : null;
    const endDate = dateRange.to ? new Date(dateRange.to) : null;
    filtered = filtered.filter((item) => {
      if (!item.timestamp) return false;
      const itemDate = new Date(item.timestamp);
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  }

  if (filters.dayFilter !== "all") {
    filtered = filtered.filter((item) => {
      if (!item.timestamp) return false;
      const itemDate = new Date(item.timestamp);
      return matchesDayFilter(itemDate.getDay(), filters.dayFilter);
    });
  }

  if (filters.mediaType !== "all") {
    filtered = filtered.filter((item) => {
      if (filters.mediaType === "REELS") {
        return item.media_product_type === "REELS" || item.media_product_type === "REEL";
      }
      return item.media_type === filters.mediaType;
    });
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter((item) => {
      const caption = item.caption?.toLowerCase() || "";
      const id = item.id?.toLowerCase() || "";
      return caption.includes(query) || id.includes(query);
    });
  }

  return filtered;
}

function filterStoriesByDateRange(stories: IgDashboardResponse["stories"], dateRange: DateRange | undefined) {
  if (!stories || !Array.isArray(stories)) return stories;
  if (!dateRange?.from && !dateRange?.to) return stories;

  const startDate = dateRange.from ? new Date(dateRange.from) : null;
  const endDate = dateRange.to ? new Date(dateRange.to) : null;

  return stories.filter((story) => {
    const timestamp = (story as { timestamp?: string }).timestamp;
    if (!timestamp) return false;
    const dt = new Date(timestamp);
    if (startDate && dt < startDate) return false;
    if (endDate && dt > endDate) return false;
    return true;
  });
}

export function buildExportPayload(params: {
  data: IgDashboardResponse;
  filters: FiltersState;
  dateRange: DateRange | undefined;
  timezone: string;
}): ExportPayload {
  const { data, filters, dateRange, timezone } = params;
  const media = data.media ?? [];
  const mediaFiltered = filterMediaForExport(media, filters, dateRange);
  const mediaBestPerDay = getBestPostPerDay(mediaFiltered, "engagement", timezone);

  const totalLikes = mediaFiltered.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = mediaFiltered.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);
  const totalSaves = mediaFiltered.reduce((sum, item) => sum + (getSaves(item) ?? 0), 0);
  const totalShares = mediaFiltered.reduce((sum, item) => sum + (getShares(item) ?? 0), 0);
  const totalReach = mediaFiltered.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalViews = mediaFiltered.reduce((sum, item) => sum + (getViews(item) ?? 0), 0);
  const totalEngagement = mediaFiltered.reduce((sum, item) => sum + getEngagement(item), 0);

  const avgErValues = mediaFiltered
    .map((item) => getComputedNumber(item, "er"))
    .filter((value): value is number => typeof value === "number");
  const avgEr = avgErValues.length ? avgErValues.reduce((sum, v) => sum + v, 0) / avgErValues.length : null;
  const avgReach = mediaFiltered.length ? Math.round(totalReach / mediaFiltered.length) : null;

  const summary: ExportSummary = {
    total_posts: mediaFiltered.length,
    total_reach: totalReach,
    total_views: totalViews,
    total_engagement: totalEngagement,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_saves: totalSaves,
    total_shares: totalShares,
    avg_er: avgEr,
    avg_reach: avgReach,
  };

  return {
    exported_at: new Date().toISOString(),
    filters: {
      date_range_preset: filters.dateRangePreset,
      day_filter: filters.dayFilter,
      media_type: filters.mediaType,
      search_query: filters.searchQuery,
      timezone,
      period_from: formatDateOnly(dateRange?.from),
      period_to: formatDateOnly(dateRange?.to),
    },
    profile: data.profile ?? null,
    summary,
    media_filtered: mediaFiltered,
    media_best_per_day: mediaBestPerDay,
    stories: filterStoriesByDateRange(data.stories, dateRange),
    stories_aggregate: data.stories_aggregate,
    demographics: data.demographics,
    online_followers: data.online_followers,
    account_insights: data.account_insights,
    previous_period_insights: data.previous_period_insights,
    comparison_metrics: data.comparison_metrics,
    messages: data.messages,
    // Novos campos para exportação completa
    daily_insights: data.daily_insights ?? [],
    previous_daily_insights: data.previous_daily_insights ?? [],
    profile_snapshots: data.profile_snapshots ?? [],
    top_posts_by_score: data.top_posts_by_score ?? [],
    top_posts_by_reach: data.top_posts_by_reach ?? [],
    top_reels_by_views: data.top_reels_by_views ?? [],
    top_reels_by_score: data.top_reels_by_score ?? [],
    media_type_distribution: data.media_type_distribution,
    consolidated_metrics: {
      reach: data.consolidated_reach ?? 0,
      impressions: data.consolidated_impressions ?? 0,
      profile_views: data.consolidated_profile_views ?? 0,
    },
    api_metadata: {
      api_version: data.api_version ?? 'v24.0',
      token_type: data.token_type ?? 'unknown',
      from_cache: data.from_cache ?? false,
      cache_age_hours: data.cache_age_hours,
      snapshot_date: data.snapshot_date ?? '',
      duration_ms: data.duration_ms,
      request_id: data.request_id,
    },
  };
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildExportFileBaseName(payload: ExportPayload): string {
  const username = payload.profile?.username || "instagram";
  const from = payload.filters.period_from ?? "all";
  const to = payload.filters.period_to ?? "all";
  return `${sanitizeFilePart(username)}_${from}_${to}`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function flattenObject(value: unknown, prefix = "", out: Record<string, unknown> = {}) {
  if (value === null || value === undefined) {
    out[prefix] = value;
    return out;
  }
  if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value);
    return out;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        flattenObject(val, nextKey, out);
      } else {
        out[nextKey] = val;
      }
    }
    return out;
  }
  out[prefix] = value;
  return out;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((col) => escapeCsvValue(row[col])).join(","));
  return [header, ...lines].join("\n");
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

export function exportJson(payload: ExportPayload, baseName: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(`${baseName}_export.json`, blob);
}

export function exportCsvBundle(payload: ExportPayload, baseName: string) {
  const metaRows = [
    {
      exported_at: payload.exported_at,
      period_from: payload.filters.period_from,
      period_to: payload.filters.period_to,
      date_range_preset: payload.filters.date_range_preset,
      day_filter: payload.filters.day_filter,
      media_type: payload.filters.media_type,
      search_query: payload.filters.search_query || "",
      timezone: payload.filters.timezone,
      account: payload.profile?.username || "",
    },
  ];

  const summaryRows = [payload.summary];
  const profileRows = payload.profile ? [payload.profile] : [];
  const mediaRows = payload.media_filtered.map((item) => flattenObject(item));
  const bestPerDayRows = payload.media_best_per_day.map((item) => flattenObject(item));

  const storiesRows = Array.isArray(payload.stories)
    ? payload.stories.map((story) => flattenObject(story as Record<string, unknown>))
    : [];

  const demographicsRows = payload.demographics
    ? Object.entries(payload.demographics as Record<string, Record<string, number>>).flatMap(([key, values]) =>
        Object.entries(values || {}).map(([dimension, value]) => ({
          breakdown: key,
          dimension,
          value,
        })),
      )
    : [];

  const onlineRows = payload.online_followers
    ? Object.entries(payload.online_followers).map(([hour, value]) => ({
        hour,
        value,
      }))
    : [];

  // Download existing CSVs
  downloadCsv(`${baseName}_meta.csv`, metaRows);
  downloadCsv(`${baseName}_summary.csv`, summaryRows);
  if (profileRows.length) downloadCsv(`${baseName}_profile.csv`, profileRows);
  if (mediaRows.length) downloadCsv(`${baseName}_media.csv`, mediaRows);
  if (bestPerDayRows.length) downloadCsv(`${baseName}_media_best_per_day.csv`, bestPerDayRows);
  if (storiesRows.length) downloadCsv(`${baseName}_stories.csv`, storiesRows);
  if (demographicsRows.length) downloadCsv(`${baseName}_demographics.csv`, demographicsRows);
  if (onlineRows.length) downloadCsv(`${baseName}_online_followers.csv`, onlineRows);

  // NEW: Daily Insights
  if (payload.daily_insights.length) {
    downloadCsv(`${baseName}_daily_insights.csv`, payload.daily_insights as Record<string, unknown>[]);
  }

  // NEW: Previous Daily Insights
  if (payload.previous_daily_insights.length) {
    downloadCsv(`${baseName}_previous_daily_insights.csv`, payload.previous_daily_insights as Record<string, unknown>[]);
  }

  // NEW: Profile Snapshots (followers over time)
  if (payload.profile_snapshots.length) {
    downloadCsv(`${baseName}_profile_snapshots.csv`, payload.profile_snapshots as Record<string, unknown>[]);
  }

  // NEW: Top Posts by Score
  if (payload.top_posts_by_score.length) {
    downloadCsv(`${baseName}_top_posts_by_score.csv`, payload.top_posts_by_score.map((item) => flattenObject(item)));
  }

  // NEW: Top Posts by Reach
  if (payload.top_posts_by_reach.length) {
    downloadCsv(`${baseName}_top_posts_by_reach.csv`, payload.top_posts_by_reach.map((item) => flattenObject(item)));
  }

  // NEW: Top Reels by Views
  if (payload.top_reels_by_views.length) {
    downloadCsv(`${baseName}_top_reels_by_views.csv`, payload.top_reels_by_views.map((item) => flattenObject(item)));
  }

  // NEW: Top Reels by Score
  if (payload.top_reels_by_score.length) {
    downloadCsv(`${baseName}_top_reels_by_score.csv`, payload.top_reels_by_score.map((item) => flattenObject(item)));
  }

  // NEW: Media Type Distribution
  if (payload.media_type_distribution) {
    const distRows = Object.entries(payload.media_type_distribution).map(([type, count]) => ({
      media_type: type,
      count,
    }));
    downloadCsv(`${baseName}_media_type_distribution.csv`, distRows);
  }

  // NEW: Consolidated Metrics
  downloadCsv(`${baseName}_consolidated_metrics.csv`, [payload.consolidated_metrics]);

  // NEW: Comparison Metrics
  if (payload.comparison_metrics && Object.keys(payload.comparison_metrics).length) {
    const compRows = Object.entries(payload.comparison_metrics).map(([metric, values]) => ({
      metric,
      current: values.current,
      previous: values.previous,
      change: values.change,
      change_percent: values.changePercent,
    }));
    downloadCsv(`${baseName}_comparison_metrics.csv`, compRows);
  }

  // NEW: Account Insights
  if (payload.account_insights && Object.keys(payload.account_insights).length) {
    const insightRows = Object.entries(payload.account_insights).map(([metric, value]) => ({
      metric,
      value,
    }));
    downloadCsv(`${baseName}_account_insights.csv`, insightRows);
  }

  // NEW: Previous Period Insights
  if (payload.previous_period_insights && Object.keys(payload.previous_period_insights).length) {
    const prevInsightRows = Object.entries(payload.previous_period_insights).map(([metric, value]) => ({
      metric,
      value,
    }));
    downloadCsv(`${baseName}_previous_period_insights.csv`, prevInsightRows);
  }

  // NEW: API Metadata
  downloadCsv(`${baseName}_api_metadata.csv`, [payload.api_metadata]);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportPdf(payload: ExportPayload, baseName: string) {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank");
  if (!win) return;

  const periodLabel = payload.filters.period_from && payload.filters.period_to
    ? `${payload.filters.period_from} — ${payload.filters.period_to}`
    : "Período completo";

  const profileName = payload.profile?.name || payload.profile?.username || "Instagram";
  const summary = payload.summary;
  const consolidated = payload.consolidated_metrics;

  const topByReach = [...payload.media_filtered]
    .sort((a, b) => (getReach(b) ?? -1) - (getReach(a) ?? -1))
    .slice(0, 10);

  const topByEngagement = [...payload.media_filtered]
    .sort((a, b) => getEngagement(b) - getEngagement(a))
    .slice(0, 10);

  const renderTopRows = (rows: IgMediaItem[]) =>
    rows
      .map((item) => {
        const caption = item.caption ? escapeHtml(item.caption.slice(0, 80)) : "";
        return `
          <tr>
            <td>${escapeHtml(item.id)}</td>
            <td>${item.timestamp ? escapeHtml(item.timestamp.slice(0, 10)) : ""}</td>
            <td>${escapeHtml(item.media_type || "")}</td>
            <td>${getReach(item) ?? 0}</td>
            <td>${getEngagement(item)}</td>
            <td>${caption}</td>
          </tr>
        `;
      })
      .join("");

  // Render comparison metrics
  const renderComparisonRows = () => {
    if (!payload.comparison_metrics) return "";
    return Object.entries(payload.comparison_metrics)
      .map(([metric, values]) => `
        <tr>
          <td>${escapeHtml(metric)}</td>
          <td>${values.current.toLocaleString()}</td>
          <td>${values.previous.toLocaleString()}</td>
          <td style="color: ${values.change >= 0 ? '#16a34a' : '#dc2626'}">${values.change >= 0 ? '+' : ''}${values.change.toLocaleString()}</td>
          <td style="color: ${values.changePercent >= 0 ? '#16a34a' : '#dc2626'}">${values.changePercent >= 0 ? '+' : ''}${values.changePercent.toFixed(1)}%</td>
        </tr>
      `)
      .join("");
  };

  // Render media type distribution
  const renderMediaTypeDistribution = () => {
    if (!payload.media_type_distribution) return "";
    return Object.entries(payload.media_type_distribution)
      .map(([type, count]) => `
        <div class="card">
          <div class="label">${escapeHtml(type)}</div>
          <div class="value">${count}</div>
        </div>
      `)
      .join("");
  };

  // Render top reels
  const renderTopReels = (reels: IgMediaItem[]) =>
    reels.slice(0, 5).map((item) => {
      const caption = item.caption ? escapeHtml(item.caption.slice(0, 60)) : "";
      return `
        <tr>
          <td>${item.timestamp ? escapeHtml(item.timestamp.slice(0, 10)) : ""}</td>
          <td>${getViews(item)?.toLocaleString() ?? 0}</td>
          <td>${getReach(item)?.toLocaleString() ?? 0}</td>
          <td>${getEngagement(item).toLocaleString()}</td>
          <td>${caption}</td>
        </tr>
      `;
    }).join("");

  win.document.open();
  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(baseName)}_export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          h2 { margin: 24px 0 8px; font-size: 16px; }
          .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 18px; font-weight: 600; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #f9fafb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
          .filters { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .page-break { page-break-before: always; margin-top: 32px; }
        </style>
      </head>
      <body>
        <h1>Instagram Account Report</h1>
        <div class="meta">
          ${escapeHtml(profileName)} · ${escapeHtml(periodLabel)} · Exportado em ${escapeHtml(payload.exported_at.slice(0, 19).replace("T", " "))}
        </div>

        <div class="filters">
          <div class="card">
            <div class="label">Filtro de Dia</div>
            <div class="value">${escapeHtml(payload.filters.day_filter)}</div>
          </div>
          <div class="card">
            <div class="label">Tipo de Mídia</div>
            <div class="value">${escapeHtml(payload.filters.media_type)}</div>
          </div>
          <div class="card">
            <div class="label">Busca</div>
            <div class="value">${escapeHtml(payload.filters.search_query || "—")}</div>
          </div>
          <div class="card">
            <div class="label">Timezone</div>
            <div class="value">${escapeHtml(payload.filters.timezone)}</div>
          </div>
        </div>

        <h2>Métricas Consolidadas da Conta</h2>
        <div class="grid">
          <div class="card"><div class="label">Alcance Total</div><div class="value">${consolidated.reach.toLocaleString()}</div></div>
          <div class="card"><div class="label">Impressões</div><div class="value">${consolidated.impressions.toLocaleString()}</div></div>
          <div class="card"><div class="label">Visitas ao Perfil</div><div class="value">${consolidated.profile_views.toLocaleString()}</div></div>
        </div>

        <h2>Resumo de Posts</h2>
        <div class="grid">
          <div class="card"><div class="label">Posts</div><div class="value">${summary.total_posts}</div></div>
          <div class="card"><div class="label">Alcance</div><div class="value">${summary.total_reach.toLocaleString()}</div></div>
          <div class="card"><div class="label">Visualizações</div><div class="value">${summary.total_views.toLocaleString()}</div></div>
          <div class="card"><div class="label">Engajamento</div><div class="value">${summary.total_engagement.toLocaleString()}</div></div>
          <div class="card"><div class="label">Curtidas</div><div class="value">${summary.total_likes.toLocaleString()}</div></div>
          <div class="card"><div class="label">Comentários</div><div class="value">${summary.total_comments.toLocaleString()}</div></div>
          <div class="card"><div class="label">Salvamentos</div><div class="value">${summary.total_saves.toLocaleString()}</div></div>
          <div class="card"><div class="label">Compartilhamentos</div><div class="value">${summary.total_shares.toLocaleString()}</div></div>
          <div class="card"><div class="label">ER Médio</div><div class="value">${summary.avg_er?.toFixed(2) ?? "--"}%</div></div>
          <div class="card"><div class="label">Alcance Médio</div><div class="value">${summary.avg_reach?.toLocaleString() ?? "--"}</div></div>
        </div>

        ${payload.media_type_distribution ? `
        <h2>Distribuição por Tipo de Mídia</h2>
        <div class="grid-4">
          ${renderMediaTypeDistribution()}
        </div>
        ` : ''}

        ${payload.comparison_metrics && Object.keys(payload.comparison_metrics).length ? `
        <h2>Comparação com Período Anterior</h2>
        <table>
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Atual</th>
              <th>Anterior</th>
              <th>Variação</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${renderComparisonRows()}
          </tbody>
        </table>
        ` : ''}

        <h2 class="page-break">Top Posts por Alcance</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Tipo</th>
              <th>Alcance</th>
              <th>Engajamento</th>
              <th>Legenda</th>
            </tr>
          </thead>
          <tbody>
            ${renderTopRows(topByReach)}
          </tbody>
        </table>

        <h2>Top Posts por Engajamento</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Tipo</th>
              <th>Alcance</th>
              <th>Engajamento</th>
              <th>Legenda</th>
            </tr>
          </thead>
          <tbody>
            ${renderTopRows(topByEngagement)}
          </tbody>
        </table>

        ${payload.top_reels_by_views.length ? `
        <h2>Top Reels por Views</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Views</th>
              <th>Alcance</th>
              <th>Engajamento</th>
              <th>Legenda</th>
            </tr>
          </thead>
          <tbody>
            ${renderTopReels(payload.top_reels_by_views)}
          </tbody>
        </table>
        ` : ''}

        <div class="meta" style="margin-top: 32px; font-size: 10px; color: #9ca3af;">
          API: ${escapeHtml(payload.api_metadata.api_version)} · Token: ${escapeHtml(payload.api_metadata.token_type)} · 
          Cache: ${payload.api_metadata.from_cache ? 'Sim' : 'Não'}${payload.api_metadata.cache_age_hours ? ` (${payload.api_metadata.cache_age_hours.toFixed(1)}h)` : ''} · 
          Request ID: ${escapeHtml(payload.api_metadata.request_id || '—')}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}
