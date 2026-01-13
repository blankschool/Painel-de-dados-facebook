/**
 * Dashboard helper functions for Instagram analytics
 * Aligned with Instagram Graph API standards
 */

import { addDays, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { IgMediaItem } from '@/utils/ig';
import { getEngagement, getReach, getSaves, getShares, getViews } from '@/utils/ig';
import { getDateKeyInTimezone } from '@/utils/dateFormat';

/**
 * Calculate percentage change in followers
 */
export function calculateFollowerChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Convert UTC hour to local timezone hour
 */
export function convertUTCToLocal(utcHour: number): number {
  const now = new Date();
  now.setUTCHours(utcHour, 0, 0, 0);
  return now.getHours();
}

/**
 * Find best time to post based on online followers data
 */
export function findBestTimeFromOnlineFollowers(
  onlineFollowers: Record<string, number>
): { bestHour: number; bestDay: string; localHour: number } | null {
  if (!onlineFollowers || Object.keys(onlineFollowers).length === 0) {
    return null;
  }

  let maxFollowers = 0;
  let bestHour = 0;
  let bestDay = '';

  for (const [hourStr, count] of Object.entries(onlineFollowers)) {
    if (count > maxFollowers) {
      maxFollowers = count;
      bestHour = parseInt(hourStr, 10);
      bestDay = 'today'; // Online followers is for current day
    }
  }

  return {
    bestHour,
    bestDay,
    localHour: convertUTCToLocal(bestHour),
  };
}

/**
 * Find best time to post based on engagement rates
 */
export function findBestTimeFromEngagement(
  posts: Array<{
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    insights?: { saved?: number };
  }>,
  followersCount: number
): { bestHour: number; avgEngagement: number } | null {
  if (!posts || posts.length === 0 || followersCount === 0) {
    return null;
  }

  const hourBuckets: Record<number, { total: number; count: number }> = {};

  for (const post of posts) {
    if (!post.timestamp) continue;
    const hour = new Date(post.timestamp).getHours();
    const engagement = (post.like_count ?? 0) + (post.comments_count ?? 0);
    const er = (engagement / followersCount) * 100;

    if (!hourBuckets[hour]) {
      hourBuckets[hour] = { total: 0, count: 0 };
    }
    hourBuckets[hour].total += er;
    hourBuckets[hour].count += 1;
  }

  let bestHour = 0;
  let maxAvgEngagement = 0;

  for (const [hourStr, data] of Object.entries(hourBuckets)) {
    const avg = data.total / data.count;
    if (avg > maxAvgEngagement) {
      maxAvgEngagement = avg;
      bestHour = parseInt(hourStr, 10);
    }
  }

  return {
    bestHour,
    avgEngagement: maxAvgEngagement,
  };
}

/**
 * Calculate stories completion rate
 */
export function calculateStoriesCompletionRate(
  stories: Array<{ insights?: { views?: number } }>
): number {
  if (!stories || stories.length < 2) return 100;

  const firstViews = stories[0]?.insights?.views ?? 0;
  const lastViews = stories[stories.length - 1]?.insights?.views ?? 0;

  if (firstViews === 0) return 0;
  return Math.round((lastViews / firstViews) * 100);
}

/**
 * Aggregate stories metrics
 */
export function aggregateStoriesMetrics(
  stories: Array<{
    insights?: {
      views?: number;
      reach?: number;
      replies?: number;
      taps_back?: number;
      taps_forward?: number;
      exits?: number;
    };
  }>
): {
  totalViews: number;
  totalReach: number;
  totalReplies: number;
  totalTapsBack: number;
  totalTapsForward: number;
  totalExits: number;
  avgCompletionRate: number;
} {
  const result = {
    totalViews: 0,
    totalReach: 0,
    totalReplies: 0,
    totalTapsBack: 0,
    totalTapsForward: 0,
    totalExits: 0,
    avgCompletionRate: 0,
  };

  for (const story of stories) {
    result.totalViews += story.insights?.views ?? 0;
    result.totalReach += story.insights?.reach ?? 0;
    result.totalReplies += story.insights?.replies ?? 0;
    result.totalTapsBack += story.insights?.taps_back ?? 0;
    result.totalTapsForward += story.insights?.taps_forward ?? 0;
    result.totalExits += story.insights?.exits ?? 0;
  }

  if (result.totalViews > 0) {
    result.avgCompletionRate = Math.round(
      (1 - result.totalExits / result.totalViews) * 100
    );
  }

  return result;
}

/**
 * Calculate engagement by media type
 */
export function calculateEngagementByMediaType(
  media: Array<{
    media_type?: string;
    like_count?: number;
    comments_count?: number;
    insights?: { saved?: number };
  }>,
  followersCount: number
): Record<string, { count: number; avgEngagement: number }> {
  const buckets: Record<string, { total: number; count: number }> = {};

  for (const item of media) {
    const type = item.media_type || 'UNKNOWN';
    const engagement = (item.like_count ?? 0) + (item.comments_count ?? 0);
    const er = followersCount > 0 ? (engagement / followersCount) * 100 : 0;

    if (!buckets[type]) {
      buckets[type] = { total: 0, count: 0 };
    }
    buckets[type].total += er;
    buckets[type].count += 1;
  }

  const result: Record<string, { count: number; avgEngagement: number }> = {};
  for (const [type, data] of Object.entries(buckets)) {
    result[type] = {
      count: data.count,
      avgEngagement: data.count > 0 ? data.total / data.count : 0,
    };
  }

  return result;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Format percentage with decimals
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get day name in Portuguese
 */
export function getDayName(dayIndex: number): string {
  const days = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
  return days[dayIndex] || '';
}

/**
 * Format time as HH:00
 */
export function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Get the best performing post for each day (optional helper)
 */
export function getBestPostPerDay<
  T extends {
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    insights?: Record<string, number>;
    computed?: Record<string, unknown>;
  }
>(
  posts: T[],
  metric: 'engagement' | 'reach' | 'views' = 'engagement',
  timezone: string = 'America/Sao_Paulo'
): T[] {
  if (!posts || posts.length === 0) return [];

  // Group posts by day (in the account's timezone)
  const dayBuckets: Record<string, T[]> = {};

  for (const post of posts) {
    if (!post.timestamp) continue;

    // Get day key in the specified timezone
    let dayKey: string;
    try {
      const date = new Date(post.timestamp);
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      dayKey = formatter.format(date);
    } catch {
      dayKey = post.timestamp.split('T')[0];
    }

    if (!dayBuckets[dayKey]) {
      dayBuckets[dayKey] = [];
    }
    dayBuckets[dayKey].push(post);
  }

  // For each day, pick the best post based on the metric
  const bestPosts: T[] = [];

  for (const dayPosts of Object.values(dayBuckets)) {
    const sorted = [...dayPosts].sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (metric === 'engagement') {
        aValue =
          (a.like_count ?? 0) +
          (a.comments_count ?? 0);
        bValue =
          (b.like_count ?? 0) +
          (b.comments_count ?? 0);
      } else if (metric === 'reach') {
        aValue =
          (a.computed?.reach as number) ??
          a.insights?.reach ??
          0;
        bValue =
          (b.computed?.reach as number) ??
          b.insights?.reach ??
          0;
      } else if (metric === 'views') {
        aValue =
          (a.computed?.views as number) ??
          a.insights?.views ??
          a.insights?.impressions ??
          0;
        bValue =
          (b.computed?.views as number) ??
          b.insights?.views ??
          b.insights?.impressions ??
          0;
      }

      return bValue - aValue; // Descending
    });

    if (sorted.length > 0) {
      bestPosts.push(sorted[0]);
    }
  }

  // Sort by date (newest first)
  return bestPosts.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });
}

export type PostDailyMetricsRow = {
  date: string;
  posts: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  views: number;
  engagement: number;
};

export function buildPostDailyMetrics(
  posts: IgMediaItem[],
  dateRange: DateRange | undefined,
  timezone: string = 'America/Sao_Paulo',
): PostDailyMetricsRow[] {
  if (!posts.length && !dateRange?.from) return [];

  const buckets = new Map<string, PostDailyMetricsRow>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const post of posts) {
    if (!post.timestamp) continue;
    const timestamp = new Date(post.timestamp);
    if (Number.isNaN(timestamp.getTime())) continue;

    if (!minDate || timestamp < minDate) minDate = timestamp;
    if (!maxDate || timestamp > maxDate) maxDate = timestamp;

    const key = getDateKeyInTimezone(timestamp, timezone);
    const row = buckets.get(key) ?? {
      date: key,
      posts: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      reach: 0,
      views: 0,
      engagement: 0,
    };

    row.posts += 1;
    row.likes += post.like_count ?? 0;
    row.comments += post.comments_count ?? 0;
    row.saves += getSaves(post) ?? 0;
    row.shares += getShares(post) ?? 0;
    row.reach += getReach(post) ?? 0;
    row.views += getViews(post) ?? 0;
    row.engagement += getEngagement(post);

    buckets.set(key, row);
  }

  const rangeStart = dateRange?.from ?? minDate;
  const rangeEnd = dateRange?.to ?? maxDate;
  if (!rangeStart || !rangeEnd) return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

  let cursor = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  while (cursor <= end) {
    const midday = new Date(cursor);
    midday.setHours(12, 0, 0, 0);
    const key = getDateKeyInTimezone(midday, timezone);
    if (!buckets.has(key)) {
      buckets.set(key, {
        date: key,
        posts: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
        reach: 0,
        views: 0,
        engagement: 0,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Format relative time (e.g., "há 2 horas")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'agora';
  }
  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }
  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }
  if (diffDays === 1) {
    return 'há 1 dia';
  }
  if (diffDays < 7) {
    return `há ${diffDays} dias`;
  }

  // Format as date for older
  return then.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}
