import { useMemo, useState, useRef } from "react";
import { formatDateForGraph, getWeekdayInTimezone } from "@/utils/dateFormat";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach, getSaves, getViews, type IgMediaItem } from "@/utils/ig";
import { Users, Eye, Heart, MessageCircle, Bookmark, RefreshCw, Clock, Image as ImageIcon, Play, ExternalLink, Instagram, BarChart3, Target, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortToggle, SortDropdown, type SortOrder } from "@/components/ui/SortToggle";
import { PostDetailModal } from "@/components/PostDetailModal";
import { usePostClick } from "@/hooks/usePostClick";
import { useAuth } from "@/contexts/AuthContext";
import { useFilters } from "@/contexts/FiltersContext";
import { LogiKpiCard, LogiKpiGrid } from "@/components/dashboard/LogiKpiCard";
import { buildPostDailyMetrics } from "@/lib/dashboardHelpers";
import { cn } from "@/lib/utils";
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

  // Apply filters to media using account's timezone
  const accountTimezone = selectedAccount?.timezone || 'America/Sao_Paulo';
  const media = useFilteredMedia(allMedia, accountTimezone);
  
  // Cache info for display
  const fromCache = (data as any)?.from_cache === true;
  const cacheAgeHours = (data as any)?.cache_age_hours as number | undefined;
  const { selectedPost, isModalOpen, handlePostClick, closeModal } = usePostClick("modal");
  const topContentRef = useRef<HTMLDivElement>(null);

  // Sort states
  const [daySort, setDaySort] = useState<SortOrder>("desc");
  const [topContentSort, setTopContentSort] = useState<SortOrder>("desc");
  const [topContentSortBy, setTopContentSortBy] = useState<"er" | "reach" | "likes">("er");
  const [engagementSort, setEngagementSort] = useState<SortOrder>("desc");

  // Extract comparison metrics from API response
  const comparisonMetrics = data?.comparison_metrics;

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

  const dateRange = getDateRangeFromPreset();
  const postDailyMetrics = useMemo(
    () => buildPostDailyMetrics(media, dateRange, accountTimezone),
    [media, dateRange, accountTimezone],
  );

  // Performance over time data with month comparison
  const performanceData = useMemo(() => {
    if (postDailyMetrics.length === 0) return [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Get all media from the full data (not just filtered)
    const allMediaItems = data?.media ?? [];
    const allMetrics = buildPostDailyMetrics(allMediaItems, undefined, accountTimezone);
    
    // Group by day of month for current month
    const currentMonthData: Record<number, number> = {};
    const prevMonthData: Record<number, number> = {};
    
    allMetrics.forEach((row) => {
      const date = new Date(row.date);
      const dayOfMonth = date.getDate();
      
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        currentMonthData[dayOfMonth] = (currentMonthData[dayOfMonth] || 0) + row.reach;
      } else if (date.getMonth() === prevMonth && date.getFullYear() === prevYear) {
        prevMonthData[dayOfMonth] = (prevMonthData[dayOfMonth] || 0) + row.reach;
      }
    });
    
    // Create aligned data for comparison
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const result: Array<{ day: number; date: string; dateLabel: string; reach: number; reachPrev: number | null }> = [];
    
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const currentReach = currentMonthData[day] || 0;
      const prevReach = prevMonthData[day] || null;
      
      // Only include days that have data in either month
      if (currentReach > 0 || (prevReach !== null && prevReach > 0)) {
        result.push({
          day,
          date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          dateLabel: `${day}`,
          reach: currentReach,
          reachPrev: prevReach,
        });
      }
    }
    
    return result;
  }, [postDailyMetrics, data?.media, accountTimezone]);

  const hasReachPrev = performanceData.some(d => d.reachPrev !== null && d.reachPrev > 0);

  // Get month names for legend
  const monthNames = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('pt-BR', { month: 'short' });
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toLocaleDateString('pt-BR', { month: 'short' });
    return { current: currentMonth, prev: prevMonth };
  }, []);

  // Scroll to top content handler
  const scrollToTopContent = (sortBy?: 'reach' | 'er' | 'likes') => {
    if (sortBy) setTopContentSortBy(sortBy);
    topContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            value={formatCompact(totalReach)}
            icon={<Eye className="w-5 h-5" />}
            index={1}
            tooltip="Clique para ver posts ordenados por alcance"
            onClick={() => scrollToTopContent('reach')}
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
            index={6}
            tooltip="Visualizações de posts no período"
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
            tooltip="Clique para ver posts ordenados por alcance"
            onClick={() => scrollToTopContent('reach')}
          />
        </LogiKpiGrid>

        {/* Performance Over Time Chart */}
        <div className="chart-section">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Desempenho ao Longo do Tempo</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Comparação mês atual vs anterior</p>
              <div className="chart-legend mt-2">
                <div className="legend-item">
                  <span className="legend-dot solid" /> {monthNames.current}
                </div>
                {hasReachPrev && (
                  <div className="legend-item">
                    <span className="legend-dot dashed" /> {monthNames.prev}
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
              <div>
                <h3 className="card-title">Desempenho por Dia da Semana</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Alcance total por dia</p>
              </div>
              <SortToggle 
                sortOrder={daySort} 
                onToggle={() => setDaySort(o => o === "desc" ? "asc" : "desc")} 
              />
            </div>
            <div className="space-y-2">
              {dayData.some((d) => d.value > 0) ? (
                <>
                  {dayData.map((item, index) => {
                    const isBestDay = index === 0 && daySort === "desc";
                    const maxValue = Math.max(...dayData.map(d => d.value));
                    const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                    
                    return (
                      <div 
                        key={item.day}
                        onClick={() => handleDayBarClick(item)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-accent/50",
                          isBestDay && "ring-1 ring-primary/30 bg-accent/30"
                        )}
                      >
                        <span className={cn(
                          "w-10 text-xs font-medium",
                          isBestDay && "text-primary font-semibold"
                        )}>
                          {item.day}
                        </span>
                        <div className="flex-1 h-6 bg-secondary rounded-md overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              isBestDay 
                                ? "bg-gradient-to-r from-primary/80 to-primary" 
                                : "bg-muted-foreground/40"
                            )}
                            style={{ width: `${Math.max(5, percentage)}%` }}
                          />
                        </div>
                        <span className={cn(
                          "w-16 text-right text-xs font-medium",
                          isBestDay && "text-primary font-semibold"
                        )}>
                          {formatCompact(item.value)}
                        </span>
                        <span className="w-6 text-[10px] text-muted-foreground text-center">
                          ({item.posts.length})
                        </span>
                        {isBestDay && (
                          <Trophy className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="card-title">Detalhamento de Engajamento</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Feed vs Reels</p>
              </div>
              <SortToggle 
                sortOrder={engagementSort} 
                onToggle={() => setEngagementSort(o => o === "desc" ? "asc" : "desc")} 
              />
            </div>
            
            {/* Visual Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {engagementData.map((item) => (
                <div 
                  key={item.type}
                  onClick={() => handleEngagementBarClick(item)}
                  className="p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === "FEED" ? (
                      <ImageIcon className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-medium">{item.type === "FEED" ? "Feed" : "Reels"}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                  <div className="text-xl font-bold">{item.percentage.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">{formatCompact(item.value)} interações</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{item.posts.length} publicações</div>
                </div>
              ))}
            </div>

            {/* Comparison Bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
              {engagementData.map((item, i) => (
                <div 
                  key={item.type}
                  className={cn(
                    "h-full transition-all duration-500",
                    i === 0 ? "bg-primary" : "bg-muted-foreground/60"
                  )}
                  style={{ width: `${item.percentage}%` }}
                />
              ))}
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center p-2 rounded-lg bg-secondary/30">
                <ImageIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <span className="block text-xs text-muted-foreground">Posts</span>
                <span className="block text-sm font-semibold">{counts.posts}</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-secondary/30">
                <Play className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <span className="block text-xs text-muted-foreground">Reels</span>
                <span className="block text-sm font-semibold">{counts.reels || "-"}</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-secondary/30">
                <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <span className="block text-xs text-muted-foreground">Stories</span>
                <span className="block text-sm font-semibold">{counts.stories || "-"}</span>
              </div>
            </div>
          </div>

          {/* Top Performing Content - Shows all posts (1 per day) */}
          <div className="card" ref={topContentRef}>
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
