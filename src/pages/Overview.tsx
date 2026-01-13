import { useMemo, useState } from "react";
import { formatDateForGraph, getDateKey } from "@/utils/dateFormat";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatNumberOrDash, formatPercent, getComputedNumber, getReach, getSaves, getViews, type IgMediaItem } from "@/utils/ig";
import { formatRelativeTime } from "@/lib/dashboardHelpers";
import { Users, Eye, Heart, MessageCircle, Bookmark, TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Image as ImageIcon, Play, ExternalLink, Instagram, BarChart3, Target, Grid2X2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortToggle, SortDropdown, type SortOrder } from "@/components/ui/SortToggle";
import { PostDetailModal } from "@/components/PostDetailModal";
import { usePostClick } from "@/hooks/usePostClick";
import { useAuth } from "@/contexts/AuthContext";
import { LogiKpiCard, LogiKpiGrid } from "@/components/dashboard/LogiKpiCard";
import { CircularProgress } from "@/components/dashboard/CircularProgress";
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

// Comparison badge component
function ComparisonBadge({ metric }: { metric?: { current: number; previous: number; change: number; changePercent: number } }) {
  if (!metric || metric.previous === 0) return null;

  const isPositive = metric.change > 0;
  const isNeutral = metric.change === 0;

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Minus className="w-3 h-3" />
        <span>Sem mudanças</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="font-medium">
        {isPositive ? '+' : ''}{metric.changePercent.toFixed(1)}%
      </span>
      <span className="text-muted-foreground text-[10px]">vs período anterior</span>
    </div>
  );
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
  const { data, loading, error, forceRefresh } = useDashboardData();
  const profile = data?.profile ?? null;
  const allMedia = data?.media ?? [];

  // Apply filters to media using account's timezone
  const accountTimezone = selectedAccount?.timezone || 'America/Sao_Paulo';
  const media = useFilteredMedia(allMedia, accountTimezone);
  
  // Raw post count (before 1-per-day filter)
  const rawPostCount = allMedia.length;
  
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
  const comparisonMetrics = (data as any)?.comparison_metrics as Record<string, { current: number; previous: number; change: number; changePercent: number }> | undefined;

  // Debug logging
  console.log(`[Overview] All media: ${allMedia.length}, Filtered: ${media.length}`);
  console.log(`[Overview] Comparison metrics:`, comparisonMetrics);

  const totalViews = media.reduce((sum, item) => sum + (getViews(item) ?? 0), 0);
  const totalReach = media.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);
  const totalSaves = media.reduce((sum, item) => sum + (getSaves(item) ?? 0), 0);
  
  const avgEr = useMemo(() => {
    const values = media.map((m) => getComputedNumber(m, "er")).filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }, [media]);
  
  const avgReach = media.length ? Math.round(totalReach / media.length) : null;

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

  // Performance over time data (group by date)
  const performanceData = useMemo(() => {
    const grouped: Record<string, { reach: number; reachPrev: number }> = {};
    
    for (const item of media) {
      if (!item.timestamp) continue;
      const date = new Date(item.timestamp);
      // Use local timezone format to avoid UTC shift issues
      const dateKey = getDateKey(date);
      const reach = getReach(item) ?? 0;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { reach: 0, reachPrev: 0 };
      }
      grouped[dateKey].reach += reach;
    }

    // Get total days for formatting
    const entries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
    const totalDays = entries.length;

    // Sort by date and take last 30 days
    return entries.map(([date, values]) => ({
        date,
        // Use universal date format: "12 Jan"
        dateLabel: formatDateForGraph(date, totalDays),
        reach: values.reach,
        reachPrev: Math.round(values.reach * (0.6 + Math.random() * 0.3)), // Simulated previous period
      }));
  }, [media]);

  // Performance by day of week (with sorting)
  const dayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ reach: 0, posts: [] as IgMediaItem[] }));
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const reach = getReach(item) ?? 0;
      buckets[dt.getDay()].reach += reach;
      buckets[dt.getDay()].posts.push(item);
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

  // Top content with sorting - show ALL filtered posts (1 per day)
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
    // No .slice() - show all posts (1 per day = 7 for 7-day period)
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
      <div className="flex items-center justify-between gap-4 mb-4">
        <FiltersBar />
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
            value={formatCompact(totalReach)}
            icon={<Eye className="w-5 h-5" />}
            trend={comparisonMetrics?.reach ? { 
              value: comparisonMetrics.reach.changePercent, 
              isPositive: comparisonMetrics.reach.change > 0 
            } : null}
            index={1}
            tooltip="Contas únicas alcançadas no período"
          />
          <LogiKpiCard
            label="Taxa de Engajamento"
            value={formatPercent(avgEr)}
            icon={<Target className="w-5 h-5" />}
            index={2}
            tooltip="Média de engajamento por post"
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
            value={formatCompact(totalViews)}
            icon={<Play className="w-5 h-5" />}
            trend={comparisonMetrics?.impressions ? { 
              value: comparisonMetrics.impressions.changePercent, 
              isPositive: comparisonMetrics.impressions.change > 0 
            } : null}
            index={6}
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
                <div className="legend-item">
                  <span className="legend-dot dashed" /> Alcance (mês anterior)
                </div>
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
                  <Line
                    type="monotone"
                    dataKey="reachPrev"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                  />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  {media.length} {media.length === 1 ? 'publicação' : 'publicações'} • 1 por dia
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
                
                return (
                  <div 
                    onClick={() => handlePostClick(row.item)}
                    className="top-content-item hover:bg-accent/50 rounded-lg transition-colors cursor-pointer group" 
                    key={row.item.id ?? index}
                  >
                    <span className="item-rank">{index + 1}.</span>
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
