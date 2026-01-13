import type { DateRange } from "react-day-picker";

export type IgMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  insights?: Record<string, number>;
  computed?: Record<string, unknown>;
};

export function isReel(item: IgMediaItem): boolean {
  return item.media_product_type === "REELS" || item.media_product_type === "REEL" || item.media_type === "REELS";
}

export function isVideoNonReel(item: IgMediaItem): boolean {
  return (item.media_type === "VIDEO" || item.media_type === "REELS") && !isReel(item);
}

export function getComputedNumber(item: IgMediaItem, key: string): number | null {
  const value = item.computed?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getComputedBool(item: IgMediaItem, key: string): boolean | null {
  const value = item.computed?.[key];
  return typeof value === "boolean" ? value : null;
}

export function getInsightsNumber(item: IgMediaItem, key: string): number | null {
  const value = item.insights?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getSaves(item: IgMediaItem): number | null {
  const computed = getComputedNumber(item, "saves");
  if (computed !== null) return computed;
  const hasInsights = getComputedBool(item, "has_insights");
  if (hasInsights) return null;
  return getInsightsNumber(item, "saved") ?? getInsightsNumber(item, "saves") ?? null;
}

export function getShares(item: IgMediaItem): number | null {
  const computed = getComputedNumber(item, "shares");
  if (computed !== null) return computed;
  const hasInsights = getComputedBool(item, "has_insights");
  if (hasInsights) return null;
  return getInsightsNumber(item, "shares") ?? null;
}

export function getReach(item: IgMediaItem): number | null {
  const computed = getComputedNumber(item, "reach");
  if (computed !== null) return computed;
  const hasInsights = getComputedBool(item, "has_insights");
  if (hasInsights) return null;
  return getInsightsNumber(item, "reach") ?? null;
}

export function getViews(item: IgMediaItem): number | null {
  // Views and reach are distinct metrics - don't use reach as fallback
  const computed = getComputedNumber(item, "views");
  if (computed !== null) return computed;
  const hasInsights = getComputedBool(item, "has_insights");
  if (hasInsights) return null;
  return (
    getInsightsNumber(item, "views") ??
    getInsightsNumber(item, "plays") ??
    getInsightsNumber(item, "video_views") ??
    getInsightsNumber(item, "impressions") ??
    null
  );
}

export function getEngagement(item: IgMediaItem): number {
  const likes = item.like_count ?? 0;
  const comments = item.comments_count ?? 0;
  return likes + comments;
}

export function getScore(item: IgMediaItem): number {
  return getComputedNumber(item, "score") ?? 0;
}

export function getInteractions(item: IgMediaItem): number {
  const likes = item.like_count ?? 0;
  const comments = item.comments_count ?? 0;
  const saves = getSaves(item) ?? 0;
  const shares = getShares(item) ?? 0;
  return likes + comments + saves + shares;
}

export function filterMediaByDateRange(media: IgMediaItem[], range: DateRange | undefined): IgMediaItem[] {
  if (!range?.from && !range?.to) return media;
  const from = range?.from ? new Date(range.from) : null;
  const to = range?.to ? new Date(range.to) : null;
  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);

  return media.filter((item) => {
    if (!item.timestamp) return false;
    const t = new Date(item.timestamp);
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  });
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return "--";
  return `${value.toFixed(decimals)}%`;
}

export function formatNumberOrDash(value: number | null): string {
  if (value === null) return "--";
  return value.toLocaleString();
}
