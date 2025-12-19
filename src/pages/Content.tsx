import { useMemo, useState } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach } from "@/utils/ig";
import { Image, Play, Clock, Grid2X2, Heart, MessageCircle, Bookmark, Eye, FileX } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, eachWeekOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContentTab = "overview" | "posts" | "reels" | "stories";

export default function Content() {
  const { data, loading, error } = useDashboardData();
  const allMedia = data?.media ?? [];
  const stories = data?.stories ?? [];
  const media = useFilteredMedia(allMedia);
  const [activeTab, setActiveTab] = useState<ContentTab>("overview");

  // Filter media by active tab
  const filteredByTab = useMemo(() => {
    if (activeTab === "posts") {
      return media.filter(m => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM");
    }
    if (activeTab === "reels") {
      return media.filter(m => m.media_product_type === "REELS" || m.media_product_type === "REEL");
    }
    return media;
  }, [media, activeTab]);

  // Check if we should show content grid (only for posts/reels tabs)
  const showContentGrid = activeTab === "posts" || activeTab === "reels";

  // Counts for stat cards
  const counts = useMemo(() => {
    const posts = media.filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM");
    const reels = media.filter((m) => m.media_product_type === "REELS" || m.media_product_type === "REEL");
    return {
      media: media.length,
      posts: posts.length,
      reels: reels.length,
      stories: stories.length,
    };
  }, [media, stories]);

  // Weekly chart data - DYNAMIC based on filtered data
  const weeklyChartData = useMemo(() => {
    const dataToChart = activeTab === "overview" ? media : filteredByTab;
    if (dataToChart.length === 0) return [];

    const dates = dataToChart
      .map(item => item.timestamp ? new Date(item.timestamp) : null)
      .filter(Boolean) as Date[];
    
    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
    
    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekPosts = dataToChart.filter(item => {
        if (!item.timestamp) return false;
        const postDate = new Date(item.timestamp);
        return postDate >= weekStart && postDate <= weekEnd;
      });

      const feedCount = weekPosts.filter(p => 
        p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM"
      ).length;
      
      const reelsCount = weekPosts.filter(p => 
        p.media_product_type === "REELS" || p.media_product_type === "REEL"
      ).length;

      return {
        week: format(weekStart, "dd/MM", { locale: ptBR }),
        weekFull: format(weekStart, "'Semana de' dd MMM", { locale: ptBR }),
        total: weekPosts.length,
        feed: feedCount,
        reels: reelsCount,
        reach: weekPosts.reduce((sum, p) => sum + (getReach(p) ?? 0), 0),
      };
    }).slice(-8);
  }, [media, filteredByTab, activeTab]);

  // Media type analysis
  const mediaTypes = useMemo(() => {
    const dataToAnalyze = activeTab === "overview" ? media : filteredByTab;
    const groups: Record<string, { reach: number; er: number; likes: number; comments: number; saves: number; count: number }> = {};
    
    for (const item of dataToAnalyze) {
      const key = item.media_product_type === "REELS" || item.media_product_type === "REEL" 
        ? "REELS" 
        : item.media_type === "CAROUSEL_ALBUM" 
        ? "CAROUSEL" 
        : item.media_type || "FEED";
      
      if (!groups[key]) groups[key] = { reach: 0, er: 0, likes: 0, comments: 0, saves: 0, count: 0 };
      groups[key].reach += getReach(item) ?? 0;
      groups[key].er += getComputedNumber(item, "er") ?? 0;
      groups[key].likes += item.like_count ?? 0;
      groups[key].comments += item.comments_count ?? 0;
      groups[key].saves += (item.computed?.saves as number) ?? 0;
      groups[key].count += 1;
    }

    const maxReach = Math.max(...Object.values(groups).map(g => g.reach), 1);

    return Object.entries(groups).map(([key, v]) => ({
      key,
      reach: v.reach,
      reachPercent: (v.reach / maxReach) * 100,
      er: v.count ? v.er / v.count : 0,
      likes: v.likes,
      comments: v.comments,
      saves: v.saves,
      count: v.count,
    })).sort((a, b) => b.reach - a.reach);
  }, [media, filteredByTab, activeTab]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof weeklyChartData[0] }> }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium text-foreground mb-2">{data.weekFull}</p>
        <div className="space-y-1 text-muted-foreground">
          <div className="flex justify-between gap-4">
            <span>Total:</span>
            <span className="font-medium text-foreground">{data.total} posts</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Feed:</span>
            <span>{data.feed}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Reels:</span>
            <span>{data.reels}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Alcance:</span>
            <span>{data.reach.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-secondary rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  const tabs: { id: ContentTab; label: string; count: number }[] = [
    { id: "overview", label: "Overview", count: counts.media },
    { id: "posts", label: "Posts", count: counts.posts },
    { id: "reels", label: "Reels", count: counts.reels },
    { id: "stories", label: "Stories", count: counts.stories },
  ];

  return (
    <>
      <FiltersBar showMediaType />

      <div className="content-area space-y-6">
        {/* Tabs with counts */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn flex items-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* STORIES TAB */}
        {activeTab === "stories" ? (
          <div className="space-y-6">
            {stories.length === 0 ? (
              <div className="card text-center py-16">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Nenhum Story ativo
                </p>
                <p className="text-sm text-muted-foreground">
                  Stories expiram após 24 horas. Publique novos stories para ver os dados aqui.
                </p>
              </div>
            ) : (
              <>
                {/* Stories Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {stories.map((story: Record<string, unknown>) => (
                    <div key={story.id as string} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-secondary group">
                      {story.media_url ? (
                        <img 
                          src={story.media_url as string} 
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Clock className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <div className="flex gap-3 text-white text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {((story.insights as Record<string, number>)?.impressions ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stories Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {(stories as Array<Record<string, unknown>>).reduce<number>((sum, s) => {
                        const insights = s.insights as Record<string, number> | undefined;
                        return sum + (insights?.impressions ?? 0);
                      }, 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm text-muted-foreground">Impressões</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {(stories as Array<Record<string, unknown>>).reduce<number>((sum, s) => {
                        const insights = s.insights as Record<string, number> | undefined;
                        return sum + (insights?.reach ?? 0);
                      }, 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm text-muted-foreground">Alcance</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {(stories as Array<Record<string, unknown>>).reduce<number>((sum, s) => {
                        const insights = s.insights as Record<string, number> | undefined;
                        return sum + (insights?.replies ?? 0);
                      }, 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm text-muted-foreground">Respostas</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{stories.length}</p>
                    <p className="text-sm text-muted-foreground">Stories Ativos</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Empty State */}
            {filteredByTab.length === 0 ? (
              <div className="card text-center py-16">
                <FileX className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Nenhum conteúdo encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                  Não há {activeTab === "posts" ? "posts" : activeTab === "reels" ? "reels" : "conteúdo"} no período selecionado.
                </p>
              </div>
            ) : (
              <>
                {/* Content Metrics + Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Stat Cards */}
                  <div className="space-y-3">
                    <button 
                      type="button"
                      onClick={() => setActiveTab("overview")}
                      className={`metrics-card flex-row p-4 w-full text-left transition-all ${activeTab === "overview" ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="metric-icon blue w-11 h-11">
                        <Grid2X2 className="w-5 h-5" />
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Media</span>
                        <span className="metric-value">{counts.media}</span>
                      </div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab("posts")}
                      className={`metrics-card flex-row p-4 w-full text-left transition-all ${activeTab === "posts" ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="metric-icon blue w-11 h-11">
                        <Image className="w-5 h-5" />
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Posts</span>
                        <span className="metric-value">{counts.posts}</span>
                      </div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab("reels")}
                      className={`metrics-card flex-row p-4 w-full text-left transition-all ${activeTab === "reels" ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="metric-icon blue w-11 h-11">
                        <Play className="w-5 h-5" />
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Reels</span>
                        <span className="metric-value">{counts.reels || "-"}</span>
                      </div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab("stories")}
                      className="metrics-card flex-row p-4 w-full text-left transition-all"
                    >
                      <div className="metric-icon blue w-11 h-11">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Stories</span>
                        <span className="metric-value">{counts.stories || "-"}</span>
                      </div>
                    </button>
                  </div>

                  {/* DYNAMIC CHART */}
                  <div className="card lg:col-span-3">
                    <div className="chart-header flex justify-between items-center">
                      <h3 className="card-title">Posted Content Over Time</h3>
                      <span className="text-xs text-muted-foreground">
                        {filteredByTab.length} itens no período
                      </span>
                    </div>
                    <div className="chart-legend mb-4">
                      <div className="legend-item">
                        <span className="legend-dot solid" />
                        {activeTab === "posts" ? "Posts" : activeTab === "reels" ? "Reels" : "Total"}
                      </div>
                    </div>
                    
                    {weeklyChartData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-muted-foreground">
                        Sem dados para exibir no período selecionado
                      </div>
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weeklyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="week" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11}
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="total"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorTotal)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Type Analysis Table */}
                <div className="card">
                  <div className="chart-header flex justify-between items-center">
                    <h3 className="card-title">Media Type Analysis</h3>
                    {activeTab !== "overview" && (
                      <span className="text-xs text-muted-foreground">
                        Filtrando: {activeTab}
                      </span>
                    )}
                  </div>
                  
                  {mediaTypes.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table w-full">
                        <thead>
                          <tr>
                            <th className="w-8">#</th>
                            <th>Tipo</th>
                            <th>Qtd</th>
                            <th>Alcance ▼</th>
                            <th>Taxa Eng.</th>
                            <th>Likes</th>
                            <th>Comments</th>
                            <th>Saves</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mediaTypes.map((row, idx) => (
                            <tr key={row.key} className={idx === 0 ? "bg-primary/5" : ""}>
                              <td className="text-muted-foreground">{idx + 1}.</td>
                              <td>
                                <span className="flex items-center gap-2 font-medium">
                                  {row.key === "REELS" && <Play className="w-4 h-4" />}
                                  {row.key === "IMAGE" && <Image className="w-4 h-4" />}
                                  {row.key === "CAROUSEL" && <Grid2X2 className="w-4 h-4" />}
                                  {row.key}
                                </span>
                              </td>
                              <td>{row.count}</td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{row.reach.toLocaleString("pt-BR")}</span>
                                  <div className="w-16 h-1.5 bg-secondary rounded overflow-hidden">
                                    <div 
                                      className="h-full bg-primary rounded" 
                                      style={{ width: `${row.reachPercent}%` }} 
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="text-primary font-medium">{formatPercent(row.er)}</td>
                              <td>{row.likes.toLocaleString("pt-BR")}</td>
                              <td>{row.comments.toLocaleString("pt-BR")}</td>
                              <td>{row.saves.toLocaleString("pt-BR")}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border font-medium">
                            <td></td>
                            <td>TOTAL</td>
                            <td>{mediaTypes.reduce((s, r) => s + r.count, 0)}</td>
                            <td>{mediaTypes.reduce((s, r) => s + r.reach, 0).toLocaleString("pt-BR")}</td>
                            <td>-</td>
                            <td>{mediaTypes.reduce((s, r) => s + r.likes, 0).toLocaleString("pt-BR")}</td>
                            <td>{mediaTypes.reduce((s, r) => s + r.comments, 0).toLocaleString("pt-BR")}</td>
                            <td>{mediaTypes.reduce((s, r) => s + r.saves, 0).toLocaleString("pt-BR")}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Content Grid - Show posts/reels thumbnails */}
                {showContentGrid && filteredByTab.length > 0 && (
                  <div className="card">
                    <div className="chart-header">
                      <h3 className="card-title">
                        {activeTab === "posts" ? "Posts" : "Reels"} ({filteredByTab.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {filteredByTab.slice(0, 12).map((item) => (
                        <div
                          key={item.id}
                          className="relative aspect-square rounded-lg overflow-hidden bg-secondary group cursor-pointer"
                        >
                          {item.media_url || item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url || item.media_url}
                              alt={item.caption?.slice(0, 50) || "Media"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {activeTab === "reels" ? (
                                <Play className="w-8 h-8 text-muted-foreground/50" />
                              ) : (
                                <Image className="w-8 h-8 text-muted-foreground/50" />
                              )}
                            </div>
                          )}
                          
                          {/* Reel indicator */}
                          {(item.media_product_type === "REELS" || item.media_product_type === "REEL") && (
                            <div className="absolute top-2 right-2 bg-black/60 rounded p-1">
                              <Play className="w-3 h-3 text-white" fill="white" />
                            </div>
                          )}
                          
                          {/* Hover overlay with metrics */}
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="grid grid-cols-2 gap-2 text-white text-xs p-2">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {(item.like_count ?? 0).toLocaleString("pt-BR")}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {(item.comments_count ?? 0).toLocaleString("pt-BR")}
                              </span>
                              {getReach(item) && (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {getReach(item)?.toLocaleString("pt-BR")}
                                </span>
                              )}
                              {(item.computed?.saves as number) && (
                                <span className="flex items-center gap-1">
                                  <Bookmark className="w-3 h-3" />
                                  {(item.computed?.saves as number).toLocaleString("pt-BR")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {filteredByTab.length > 12 && (
                      <div className="mt-4 text-center">
                        <span className="text-sm text-muted-foreground">
                          Mostrando 12 de {filteredByTab.length} itens
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {error && (
          <div className="p-4 text-destructive">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
