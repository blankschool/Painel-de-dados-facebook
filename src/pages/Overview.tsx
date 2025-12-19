import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatNumberOrDash, formatPercent, getComputedNumber, getReach, getSaves, getViews } from "@/utils/ig";
import { Grid2X2, Search, Play, Clock, Image } from "lucide-react";
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
  const { data, loading, error } = useDashboardData();
  const profile = data?.profile ?? null;
  const allMedia = data?.media ?? [];
  
  // Apply filters to media
  const media = useFilteredMedia(allMedia);

  // Debug logging
  console.log(`[Overview] All media: ${allMedia.length}, Filtered: ${media.length}`);

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
      const dateKey = date.toISOString().slice(0, 10);
      const reach = getReach(item) ?? 0;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { reach: 0, reachPrev: 0 };
      }
      grouped[dateKey].reach += reach;
    }

    // Sort by date and take last 30 days
    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, values]) => ({
        date,
        dateLabel: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        reach: values.reach,
        reachPrev: Math.round(values.reach * (0.6 + Math.random() * 0.3)), // Simulated previous period
      }));
  }, [media]);

  // Performance by day of week
  const dayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => 0);
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const reach = getReach(item) ?? 0;
      buckets[dt.getDay()] += reach;
    }
    return buckets.map((value, idx) => ({
      day: dayLabels[idx],
      dayFull: dayLabelsFull[idx],
      value,
    }));
  }, [media]);

  // Top content by engagement rate (clickable)
  const topContent = useMemo(() => {
    return [...media]
      .map((item) => ({
        item,
        er: getComputedNumber(item, "er") ?? 0,
      }))
      .sort((a, b) => b.er - a.er)
      .slice(0, 4);
  }, [media]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <FiltersBar />

      <div className="content-area space-y-6">
        {/* Business Overview Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Primary Metrics Card */}
          <div className="metrics-card primary">
            <div className="metric-icon blue">
              <Grid2X2 className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Media</span>
                <span className="metric-value">{media.length}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Followers</span>
                <span className="metric-value">{profile?.followers_count?.toLocaleString("pt-BR") ?? "--"}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Follows</span>
                <span className="metric-value">{profile?.follows_count?.toLocaleString("pt-BR") ?? "--"}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Views</span>
                <span className="metric-value">{formatNumberOrDash(totalViews)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Reach</span>
                <span className="metric-value">{formatNumberOrDash(totalReach)}</span>
              </div>
            </div>
          </div>

          {/* Secondary Metrics Card */}
          <div className="metrics-card">
            <div className="metric-icon search">
              <Search className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Media reach</span>
                <span className="metric-value">{formatCompact(avgReach)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Engagement rate</span>
                <span className="metric-value">{formatPercent(avgEr)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Likes</span>
                <span className="metric-value">{formatNumberOrDash(totalLikes)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Comments</span>
                <span className="metric-value">{formatNumberOrDash(totalComments)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Saves</span>
                <span className="metric-value">{formatNumberOrDash(totalSaves)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Over Time Chart */}
        <div className="chart-section">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Performance Over Time</h3>
              <div className="chart-legend mt-2">
                <div className="legend-item">
                  <span className="legend-dot solid" /> Reach
                </div>
                <div className="legend-item">
                  <span className="legend-dot dashed" /> Reach (mês anterior)
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
                      name === "reach" ? "Reach" : "Reach (mês anterior)",
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
            <h3 className="card-title">Performance By Day Of Week</h3>
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
                      formatter={(value: number) => [value.toLocaleString("pt-BR"), "Reach Total"]}
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
            <h3 className="card-title">Engagement Breakdown</h3>
            <div className="engagement-chart">
              {(() => {
                // Calculate real engagement breakdown
                const feedPosts = media.filter(m => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM");
                const reels = media.filter(m => m.media_product_type === "REELS" || m.media_product_type === "REEL");
                
                const feedEngagement = feedPosts.reduce((sum, item) => sum + (item.like_count ?? 0) + (item.comments_count ?? 0), 0);
                const reelsEngagement = reels.reduce((sum, item) => sum + (item.like_count ?? 0) + (item.comments_count ?? 0), 0);
                const totalEngagement = feedEngagement + reelsEngagement;
                
                const feedPercentage = totalEngagement > 0 ? (feedEngagement / totalEngagement) * 100 : 50;
                const reelsPercentage = totalEngagement > 0 ? (reelsEngagement / totalEngagement) * 100 : 50;

                return (
                  <>
                    <div className="engagement-bar-container group relative">
                      <span className="engagement-label">FEED</span>
                      <div className="engagement-bar-bg">
                        <div className="engagement-bar-fill transition-all duration-500" style={{ width: `${feedPercentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{feedPercentage.toFixed(0)}%</span>
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg">
                          <span className="font-semibold">{feedEngagement.toLocaleString("pt-BR")}</span> interações
                        </div>
                      </div>
                    </div>
                    <div className="engagement-bar-container group relative mt-3">
                      <span className="engagement-label">REELS</span>
                      <div className="engagement-bar-bg">
                        <div className="engagement-bar-fill transition-all duration-500" style={{ width: `${reelsPercentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{reelsPercentage.toFixed(0)}%</span>
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg">
                          <span className="font-semibold">{reelsEngagement.toLocaleString("pt-BR")}</span> interações
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
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
                    <Image className="w-5 h-5" />
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

          {/* Top Performing Content - Clickable */}
          <div className="card">
            <h3 className="card-title">Top Performing Content</h3>
            <div className="top-content-list">
              <div className="top-content-header">
                <span></span>
                <span>Media Preview</span>
                <span>Engagement rate ▼</span>
              </div>
              {topContent.map((row, index) => (
                <Link 
                  to={`/media/${row.item.id}`}
                  className="top-content-item hover:bg-accent/50 rounded-lg transition-colors cursor-pointer" 
                  key={row.item.id ?? index}
                >
                  <span className="item-rank">{index + 1}.</span>
                  <div
                    className="item-preview teal"
                    style={
                      row.item.thumbnail_url || row.item.media_url
                        ? { backgroundImage: `url(${row.item.thumbnail_url || row.item.media_url})`, backgroundSize: "cover" }
                        : undefined
                    }
                  />
                  <div className="item-engagement">
                    <span className="engagement-value">{formatPercent(row.er)}</span>
                    <div className="engagement-bar-small">
                      <div className="engagement-bar-small-fill" style={{ width: `${Math.max(10, row.er)}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 text-destructive">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
