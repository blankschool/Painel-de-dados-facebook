import { useMemo, useState } from "react";
import { formatDateForGraph, getWeekdayInTimezone } from "@/utils/dateFormat";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach, getSaves, getViews, type IgMediaItem } from "@/utils/ig";
import { Users, Eye, Heart, MessageCircle, Bookmark, RefreshCw, Clock, Image as ImageIcon, Play, ExternalLink, Instagram, BarChart3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortToggle, SortDropdown, type SortOrder } from "@/components/ui/SortToggle";
import { PostDetailModal } from "@/components/PostDetailModal";
import { usePostClick } from "@/hooks/usePostClick";
import { useAuth } from "@/contexts/AuthContext";
import { useFilters } from "@/contexts/FiltersContext";
import { LogiKpiCard, LogiKpiGrid } from "@/components/dashboard/LogiKpiCard";
import { buildPostDailyMetrics } from "@/lib/dashboardHelpers";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const dayLabelsFull = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function formatCompact(value: number | null): string {
  if (value === null) return "--";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(".", ",")} mi`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".", ",")} mil`;
  return value.toLocaleString("pt-BR");
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  padding: "12px",
};

export default function Overview() {
  const { selectedAccount } = useAuth();
  const { getDateRangeFromPreset } = useFilters();
  const { data, loading, error, forceRefresh } = useDashboardData();
  const profile = data?.profile ?? null;
  const allMedia = data?.media ?? [];
  const accountInsights: Record<string, number> = data?.account_insights ?? {};

  // Apply filters to media using account's timezone
  const accountTimezone = selectedAccount?.timezone || 'America/Sao_Paulo';
  const media = useFilteredMedia(allMedia, accountTimezone);
  
  // Cache info for display
  const fromCache = (data as any)?.from_cache === true;
  const cacheAgeHours = (data as any)?.cache_age_hours as number | undefined;
  const { selectedPost, isModalOpen, handlePostClick, closeModal } = usePostClick("modal");

  // Sort states
  const [daySort, setDaySort] = useState<SortOrder>("desc");
  const [topContentSort, setTopContentSort] = useState<SortOrder>("desc");
  const [topContentSortBy, setTopContentSortBy] = useState<"er" | "reach" | "likes">("er");
  const [engagementSort, setEngagementSort] = useState<SortOrder>("desc");

  // Extract comparison metrics from API response
  const comparisonMetrics = data?.comparison_metrics;
  const dailyInsights = data?.daily_insights ?? [];
  const previousDailyInsights = data?.previous_daily_insights ?? [];

  // Debug logging
  console.log(`[Overview] All media: ${allMedia.length}, Filtered: ${media.length}`);
  console.log(`[Overview] Comparison metrics:`, comparisonMetrics);

  const totalViewsFromPosts = media.reduce((sum, item) => sum + (getViews(item) ?? 0), 0);
  const totalReachFromPosts = media.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);
  const totalSaves = media.reduce((sum, item) => sum + (getSaves(item) ?? 0), 0);
  const accountsEngaged = typeof accountInsights['accounts_engaged'] === "number" ? accountInsights['accounts_engaged'] : null;
  const accountReach = data?.consolidated_reach ?? totalReachFromPosts;
  const accountImpressions = data?.consolidated_impressions ?? totalViewsFromPosts;
  
  const latestFollowerCount = useMemo(() => {
    const lastDaily = dailyInsights.length ? dailyInsights[dailyInsights.length - 1] : null;
    if (lastDaily && typeof lastDaily.follower_count === "number") return lastDaily.follower_count;
    if (typeof accountInsights['follower_count'] === "number") return accountInsights['follower_count'];
    return profile?.followers_count ?? null;
  }, [dailyInsights, accountInsights, profile?.followers_count]);

  const accountEngagementRate = useMemo(() => {
    if (typeof accountsEngaged === "number" && typeof latestFollowerCount === "number" && latestFollowerCount > 0) {
      return (accountsEngaged / latestFollowerCount) * 100;
    }
    return null;
  }, [accountsEngaged, latestFollowerCount]);
  
  const avgReach = media.length ? Math.round(totalReachFromPosts / media.length) : null;

  // Content counts
  const counts = useMemo(() => {
    const posts = media.filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM");
    const reels = media.filter((m) => m.media_product_type === "REELS" || m.media_product_type === "REEL");
    return {
      posts: posts.length,
      reels: reels.length,
      stories: data?.stories?.length ?? 0,
    };
  }, [media, data?.stories?.length]);

  const dateRange = getDateRangeFromPreset();
  const postDailyMetrics = useMemo(
    () => buildPostDailyMetrics(media, dateRange, accountTimezone),
    [media, dateRange, accountTimezone],
  );

  // Performance over time data (prefer account daily insights, fallback to post metrics by day)
  const performanceData = useMemo(() => {
    if (dailyInsights.length > 0) {
      const current = dailyInsights;
      const previous = previousDailyInsights;
      const totalDays = current.length;
      return current.map((row, index) => ({
        date: row.insight_date,
        dateLabel: formatDateForGraph(row.insight_date, totalDays),
        reach: row.reach ?? 0,
        reachPrev: previous[index]?.reach ?? null,
      }));
    }

    if (postDailyMetrics.length === 0) return [];
    const totalDays = postDailyMetrics.length;
    return postDailyMetrics.map((row) => ({
      date: row.date,
      dateLabel: formatDateForGraph(row.date, totalDays),
      reach: row.reach,
      reachPrev: null,
    }));
  }, [dailyInsights, previousDailyInsights, postDailyMetrics]);

  const hasReachPrev = useMemo(
    () => performanceData.some((item) => typeof item.reachPrev === "number" && item.reachPrev > 0),
    [performanceData],
  );

  // Performance by day of week (with sorting)
  const dayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ reach: 0, posts: [] as IgMediaItem[] }));
    for (const item of media) {
      if (!item.timestamp) continue;
      const dayIndex = getWeekdayInTimezone(item.timestamp, accountTimezone);
      const reach = getReach(item) ?? 0;
      buckets[dayIndex].reach += reach;
      buckets[dayIndex].posts.push(item);
    }
    const rawData = buckets.map((bucket, idx) => ({
      day: dayLabels[idx],
      dayFull: dayLabelsFull[idx],
      value: bucket.reach,
      posts: bucket.posts,
      originalIndex: idx,
    }));

    // Sort based on preference
    const sorted = [...rawData].sort((a, b) => 
      daySort === "desc" ? b.value - a.value : a.value - b.value
    );
    return sorted;
  }, [media, daySort]);

  // Top content with sorting - respects current filters
  const topContent = useMemo(() => {
    return [...media]
      .map((item) => ({
        item,
        er: getComputedNumber(item, "er") ?? 0,
        reach: getReach(item) ?? 0,
        likes: item.like_count ?? 0,
      }))
      .sort((a, b) => {
        const aVal = a[topContentSortBy];
        const bVal = b[topContentSortBy];
        return topContentSort === "desc" ? bVal - aVal : aVal - bVal;
      });
    // No .slice() - show all filtered posts
  }, [media, topContentSort, topContentSortBy]);

  // Calculate max value for bar chart scaling
  const maxTopContentValue = useMemo(() => {
    if (topContent.length === 0) return 1;
    return Math.max(...topContent.map(row => 
      topContentSortBy === "er" ? row.er : 
      topContentSortBy === "reach" ? row.reach : 
      row.likes
    ));
  }, [topContent, topContentSortBy]);

  // Engagement breakdown with sorting
  const engagementData = useMemo(() => {
    const feedPosts = media.filter(m => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM");
    const reels = media.filter(m => m.media_product_type === "REELS" || m.media_product_type === "REEL");
    
    const feedEngagement = feedPosts.reduce((sum, item) => sum + (item.like_count ?? 0) + (item.comments_count ?? 0), 0);
    const reelsEngagement = reels.reduce((sum, item) => sum + (item.like_count ?? 0) + (item.comments_count ?? 0), 0);
    const totalEngagement = feedEngagement + reelsEngagement;
    
    const items = [
      { type: "FEED", value: feedEngagement, percentage: totalEngagement > 0 ? (feedEngagement / totalEngagement) * 100 : 50, posts: feedPosts },
      { type: "REELS", value: reelsEngagement, percentage: totalEngagement > 0 ? (reelsEngagement / totalEngagement) * 100 : 50, posts: reels },
    ];

    return items.sort((a, b) => engagementSort === "desc" ? b.value - a.value : a.value - b.value);
  }, [media, engagementSort]);

  // Handler for day of week bar click
  const handleDayBarClick = (data: { posts: IgMediaItem[] }) => {
    if (data.posts.length > 0) {
      const bestPost = [...data.posts].sort((a, b) => 
        (getReach(b) ?? 0) - (getReach(a) ?? 0)
      )[0];
      handlePostClick(bestPost);
    }
  };

  // Handler for engagement bar click
  const handleEngagementBarClick = (data: { posts: IgMediaItem[] }) => {
    if (data.posts.length > 0) {
      const bestPost = [...data.posts].sort((a, b) => 
        ((b.like_count ?? 0) + (b.comments_count ?? 0)) - ((a.like_count ?? 0) + (a.comments_count ?? 0))
      )[0];
      handlePostClick(bestPost);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Last update indicator */}
            {data && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {(data as any).from_cache 
                    ? `Cache (${((data as any).cache_age_hours ?? 0).toFixed(1)}h)`
                    : 'Atualizado agora'
                  }
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => forceRefresh()}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            {data?.token_type && (
              <Badge variant="outline" className="flex items-center gap-1.5 shrink-0">
                <Instagram className="w-3.5 h-3.5" />
                {data.token_type === 'IGAA' ? 'Instagram Business Login' : 'Facebook Login'}
              </Badge>
            )}
          </div>
        </div>
        <FiltersBar />
      </div>

      <div className="content-area space-y-6">
        {/* LogiChain-style KPI Cards */}
        <LogiKpiGrid columns={5}>
          <LogiKpiCard
            label="Seguidores"
            value={profile?.followers_count?.toLocaleString("pt-BR") ?? "--"}
            icon={<Users className="w-5 h-5" />}
            index={0}
            tooltip="Total de seguidores da conta"
          />
          <LogiKpiCard
            label="Alcance Total"
            value={formatCompact(accountReach)}
            icon={<Eye className="w-5 h-5" />}
            index={1}
            tooltip="Contas únicas alcançadas por posts, stories e anúncios no período"
          />
          <LogiKpiCard
            label="Taxa de Engajamento"
            value={formatPercent(accountEngagementRate)}
            icon={<Target className="w-5 h-5" />}
            index={2}
            tooltip="Percentual de seguidores que interagiram com posts, stories ou anúncios no período"
          />
          <LogiKpiCard
            label="Curtidas"
            value={formatCompact(totalLikes)}
            icon={<Heart className="w-5 h-5" />}
            index={3}
          />
          <LogiKpiCard
            label="Comentários"
            value={formatCompact(totalComments)}
            icon={<MessageCircle className="w-5 h-5" />}
            index={4}
          />
        </LogiKpiGrid>

        {/* Secondary KPI Row */}
        <LogiKpiGrid columns={4}>
          <LogiKpiCard
            label="Publicações"
            value={media.length.toString()}
            icon={<ImageIcon className="w-5 h-5" />}
            index={5}
            tooltip="Publicações no período selecionado"
          />
          <LogiKpiCard
            label="Visualizações"
            value={formatCompact(accountImpressions)}
            icon={<Play className="w-5 h-5" />}
            index={6}
            tooltip="Visualizações de posts, stories e anúncios no período"
          />
          <LogiKpiCard
            label="Salvamentos"
            value={formatCompact(totalSaves)}
            icon={<Bookmark className="w-5 h-5" />}
            index={7}
          />
          <LogiKpiCard
            label="Alcance Médio"
            value={formatCompact(avgReach)}
            icon={<BarChart3 className="w-5 h-5" />}
            index={8}
            tooltip="Média de alcance por publicação"
          />
        </LogiKpiGrid>

        {/* Performance Over Time Chart */}
        <div className="chart-section">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Desempenho ao Longo do Tempo</h3>
              <div className="chart-legend mt-2">
                <div className="legend-item">
                  <span className="legend-dot solid" /> Alcance
                </div>
                {hasReachPrev && (
                  <div className="legend-item">
                    <span className="legend-dot dashed" /> Alcance (mês anterior)
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="h-64">
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => formatCompact(value)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ fontWeight: 600, marginBottom: "4px", color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString("pt-BR"),
                      name === "reach" ? "Alcance" : "Alcance (mês anterior)",
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="reach"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--foreground))" }}
                    activeDot={{ r: 6, fill: "hsl(var(--foreground))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  />
                  {hasReachPrev && (
                    <Line
                      type="monotone"
                      dataKey="reachPrev"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Day of Week + Engagement Breakdown + Top Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Performance By Day Of Week */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Desempenho por Dia da Semana</h3>
              <SortToggle 
                sortOrder={daySort} 
                onToggle={() => setDaySort(o => o === "desc" ? "asc" : "desc")} 
              />
            </div>
            <div className="h-52">
              {dayData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => formatCompact(value)}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ fontWeight: 600, marginBottom: "4px", color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [value.toLocaleString("pt-BR"), "Alcance Total"]}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.dayFull || "";
                      }}
                      cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleDayBarClick(data)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </div>

          {/* Engagement Breakdown */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Detalhamento de Engajamento</h3>
              <SortToggle 
                sortOrder={engagementSort} 
                onToggle={() => setEngagementSort(o => o === "desc" ? "asc" : "desc")} 
              />
            </div>
            <div className="engagement-chart">
              {engagementData.map((item) => (
                <div 
                  key={item.type} 
                  className="engagement-bar-container group relative mt-3 first:mt-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleEngagementBarClick(item)}
                >
                  <span className="engagement-label">{item.type}</span>
                  <div className="engagement-bar-bg">
                    <div className="engagement-bar-fill transition-all duration-500" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">{item.percentage.toFixed(0)}%</span>
                  {/* Click hint */}
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg">
                      <span className="font-semibold">{item.value.toLocaleString("pt-BR")}</span> interações • Clique para ver
                    </div>
                  </div>
                </div>
              ))}
              <div className="engagement-scale mt-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <div className="engagement-stats">
                <div className="stat-box">
                  <div className="stat-icon">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="stat-label">Posts</span>
                  <span className="stat-value">{counts.posts}</span>
                </div>
                <div className="stat-box">
                  <div className="stat-icon">
                    <Play className="w-5 h-5" />
                  </div>
                  <span className="stat-label">Reels</span>
                  <span className="stat-value">{counts.reels || "-"}</span>
                </div>
                <div className="stat-box">
                  <div className="stat-icon">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="stat-label">Stories</span>
                  <span className="stat-value">{counts.stories || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Content - Shows all posts (1 per day) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="card-title">Conteúdos de Melhor Desempenho</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {media.length} {media.length === 1 ? 'publicação' : 'publicações'}
                </p>
              </div>
              <SortDropdown
                sortBy={topContentSortBy}
                sortOrder={topContentSort}
                options={[
                  { value: "er", label: "Engajamento" },
                  { value: "reach", label: "Alcance" },
                  { value: "likes", label: "Curtidas" },
                ]}
                onSortByChange={(v) => setTopContentSortBy(v as "er" | "reach" | "likes")}
                onSortOrderChange={() => setTopContentSort(o => o === "desc" ? "asc" : "desc")}
              />
            </div>
            <div className="top-content-list max-h-[400px] overflow-y-auto">
              <div className="top-content-header sticky top-0 bg-card z-10">
                <span></span>
                <span>Prévia</span>
                <span>{topContentSortBy === "er" ? "Taxa de engajamento" : topContentSortBy === "reach" ? "Alcance" : "Curtidas"} {topContentSort === "desc" ? "▼" : "▲"}</span>
              </div>
              {topContent.map((row, index) => {
                const currentValue = topContentSortBy === "er" ? row.er : 
                                     topContentSortBy === "reach" ? row.reach : 
                                     row.likes;
                const barWidth = maxTopContentValue > 0 ? (currentValue / maxTopContentValue) * 100 : 0;
                
                // Format post date
                const postDate = row.item.timestamp 
                  ? new Date(row.item.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                  : null;
                
                return (
                  <div 
                    onClick={() => handlePostClick(row.item)}
                    className="top-content-item hover:bg-accent/50 rounded-lg transition-colors cursor-pointer group" 
                    key={row.item.id ?? index}
                  >
                    <span className="item-rank">{index + 1}.</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div
                          className="item-preview teal"
                          style={
                            row.item.thumbnail_url || row.item.media_url
                              ? { backgroundImage: `url(${row.item.thumbnail_url || row.item.media_url})`, backgroundSize: "cover" }
                              : undefined
                          }
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      {postDate && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{postDate}</span>
                      )}
                    </div>
                    <div className="item-engagement">
                      <span className="engagement-value">
                        {topContentSortBy === "er" ? formatPercent(row.er) : 
                         topContentSortBy === "reach" ? formatCompact(row.reach) : 
                         row.likes.toLocaleString("pt-BR")}
                      </span>
                      <div className="engagement-bar-small">
                        <div className="engagement-bar-small-fill" style={{ width: `${Math.max(5, barWidth)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      <PostDetailModal post={selectedPost} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
