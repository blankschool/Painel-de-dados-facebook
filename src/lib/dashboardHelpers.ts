/**
 * Helper functions for dashboard calculations
 * Aligned with Instagram API v24.0
 */

/**
 * Calculate follower change percentage
 * @param current Current follower count
 * @param previous Previous follower count
 * @returns Percentage change
 */
export function calculateFollowerChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Convert UTC hour to local timezone
 * @param utcHour Hour in UTC (0-23)
 * @returns Hour in local timezone (0-23)
 */
export function convertUTCToLocal(utcHour: number): number {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour)
  );
  return utcDate.getHours();
}

/**
 * Find best time to post based on online followers data
 * @param onlineFollowers Object with keys like "0_14", "1_9", etc.
 * @returns { hour: number, dayOfWeek: number, value: number }
 */
export function findBestTimeFromOnlineFollowers(onlineFollowers: Record<string, number>) {
  let maxValue = 0;
  let bestHour = 0;
  let bestDay = 0;

  Object.entries(onlineFollowers).forEach(([key, value]) => {
    const [day, hour] = key.split('_').map(Number);
    if (value > maxValue) {
      maxValue = value;
      bestDay = day;
      bestHour = hour;
    }
  });

  // Convert hour from UTC to local
  const localHour = convertUTCToLocal(bestHour);

  return {
    hour: localHour,
    dayOfWeek: bestDay,
    value: maxValue,
  };
}

/**
 * Group posts by hour and calculate average engagement rate
 * @param posts Array of posts with timestamp and engagement data
 * @param followersCount Total followers for ER calculation
 * @returns Array of { hour: number, avgER: number, count: number }
 */
export function findBestTimeFromEngagement(
  posts: Array<{
    timestamp: string;
    like_count: number;
    comments_count: number;
    insights?: { saved?: number };
  }>,
  followersCount: number
) {
  const hourData: Record<
    number,
    { totalER: number; count: number }
  > = {};

  posts.forEach((post) => {
    const date = new Date(post.timestamp);
    const hour = date.getHours();

    const engagement =
      post.like_count +
      post.comments_count +
      (post.insights?.saved || 0);
    const er = followersCount > 0 ? (engagement / followersCount) * 100 : 0;

    if (!hourData[hour]) {
      hourData[hour] = { totalER: 0, count: 0 };
    }
    hourData[hour].totalER += er;
    hourData[hour].count += 1;
  });

  const result = Object.entries(hourData)
    .map(([hour, data]) => ({
      hour: Number(hour),
      avgER: data.totalER / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgER - a.avgER);

  return result[0] || { hour: 12, avgER: 0, count: 0 };
}

/**
 * Calculate stories completion rate
 * @param stories Array of stories ordered chronologically
 * @returns Completion rate percentage
 */
export function calculateStoriesCompletionRate(
  stories: Array<{ insights?: { views?: number } }>
): number {
  if (stories.length === 0) return 0;

  const firstStoryViews = stories[0]?.insights?.views || 0;
  const lastStoryViews = stories[stories.length - 1]?.insights?.views || 0;

  if (firstStoryViews === 0) return 0;
  return (lastStoryViews / firstStoryViews) * 100;
}

/**
 * Aggregate stories metrics
 * @param stories Array of stories with insights
 * @returns Aggregated metrics object
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
) {
  const aggregate = {
    total_stories: stories.length,
    total_views: 0,
    total_reach: 0,
    total_replies: 0,
    total_taps_back: 0,
    total_taps_forward: 0,
    total_exits: 0,
  };

  stories.forEach((story) => {
    if (story.insights) {
      aggregate.total_views += story.insights.views || 0;
      aggregate.total_reach += story.insights.reach || 0;
      aggregate.total_replies += story.insights.replies || 0;
      aggregate.total_taps_back += story.insights.taps_back || 0;
      aggregate.total_taps_forward += story.insights.taps_forward || 0;
      aggregate.total_exits += story.insights.exits || 0;
    }
  });

  const avg_completion_rate = calculateStoriesCompletionRate(stories);

  return {
    ...aggregate,
    avg_completion_rate,
  };
}

/**
 * Group media by type and calculate average ER
 * @param media Array of posts
 * @param followersCount Total followers
 * @returns Object with media types and their average ER
 */
export function calculateEngagementByMediaType(
  media: Array<{
    media_type: string;
    like_count: number;
    comments_count: number;
    insights?: { saved?: number };
  }>,
  followersCount: number
) {
  const typeData: Record<
    string,
    { totalER: number; count: number }
  > = {};

  media.forEach((post) => {
    const type = post.media_type;
    const engagement =
      post.like_count +
      post.comments_count +
      (post.insights?.saved || 0);
    const er = followersCount > 0 ? (engagement / followersCount) * 100 : 0;

    if (!typeData[type]) {
      typeData[type] = { totalER: 0, count: 0 };
    }
    typeData[type].totalER += er;
    typeData[type].count += 1;
  });

  return Object.entries(typeData).map(([type, data]) => ({
    type,
    avgER: data.totalER / data.count,
    count: data.count,
  }));
}

/**
 * Format number with appropriate suffix (K, M, B)
 * @param num Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format percentage
 * @param value Percentage value
 * @param decimals Number of decimal places
 * @returns Formatted string with %
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get day of week name in Portuguese
 * @param dayIndex 0 = Sunday, 1 = Monday, etc.
 * @returns Day name in Portuguese
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
 * Format time (24h format)
 * @param hour Hour (0-23)
 * @returns Formatted time string
 */
export function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}
