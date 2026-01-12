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
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    insights?: { saved?: number };
  }>,
  followersCount: number
) {
  const hourData: Record<
    number,
    { totalER: number; count: number }
  > = {};

  posts.forEach((post) => {
    if (!post.timestamp) return;
    const date = new Date(post.timestamp);
    const hour = date.getHours();

    const engagement =
      (post.like_count || 0) +
      (post.comments_count || 0) +
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
    media_type?: string;
    like_count?: number;
    comments_count?: number;
    insights?: { saved?: number };
  }>,
  followersCount: number
) {
  const typeData: Record<
    string,
    { totalER: number; count: number }
  > = {};

  media.forEach((post) => {
    const type = post.media_type || 'OTHER';
    const engagement =
      (post.like_count || 0) +
      (post.comments_count || 0) +
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

/**
 * Get best performing post per day
 * Groups posts by day in the specified timezone and returns only the best performer from each day
 * @param posts Array of posts with timestamp and engagement data
 * @param metric Metric to use for ranking ('engagement', 'reach', or 'views')
 * @param timezone IANA timezone identifier (e.g., 'America/Sao_Paulo')
 * @returns Array of best posts, one per day, sorted by date (newest first)
 */
export function getBestPostPerDay<T extends {
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  insights?: Record<string, number>;
  computed?: Record<string, unknown>;
}>(
  posts: T[],
  metric: 'engagement' | 'reach' | 'views' = 'engagement',
  timezone: string = 'America/Sao_Paulo'
): T[] {
  if (!posts || posts.length === 0) return [];

  // Helper functions inline to avoid circular imports
  const getEngagement = (item: T): number => {
    const likes = item.like_count ?? 0;
    const comments = item.comments_count ?? 0;
    const saves = item.insights?.saved ?? item.insights?.saves ?? (item.computed?.saves as number) ?? 0;
    const shares = item.insights?.shares ?? (item.computed?.shares as number) ?? 0;
    return likes + comments + saves + shares;
  };

  const getReach = (item: T): number => {
    return (item.computed?.reach as number) ?? item.insights?.reach ?? 0;
  };

  const getViews = (item: T): number => {
    return (item.computed?.views as number) ?? item.insights?.views ?? item.insights?.impressions ?? 0;
  };

  // Group posts by day using the account's timezone
  const postsByDay = new Map<string, T[]>();

  posts.forEach(post => {
    if (!post.timestamp) return;
    
    const date = new Date(post.timestamp);
    // Format date in the specified timezone to get consistent day grouping
    const dayKey = date.toLocaleDateString('sv-SE', { timeZone: timezone });

    if (!postsByDay.has(dayKey)) {
      postsByDay.set(dayKey, []);
    }
    postsByDay.get(dayKey)!.push(post);
  });

  // Select the best post from each day
  const bestPosts: T[] = [];

  postsByDay.forEach((dayPosts) => {
    const sorted = [...dayPosts].sort((a, b) => {
      if (metric === 'engagement') {
        return getEngagement(b) - getEngagement(a);
      } else if (metric === 'reach') {
        return getReach(b) - getReach(a);
      } else {
        return getViews(b) - getViews(a);
      }
    });
    bestPosts.push(sorted[0]);
  });

  // Sort by date (newest first)
  return bestPosts.sort((a, b) => 
    new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
  );
}
