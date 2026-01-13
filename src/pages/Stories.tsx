import { useEffect, useState, useMemo } from 'react';
import { useDashboardData, type StoriesAggregate } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { TopStoriesGallery } from '@/components/dashboard/TopStoryCard';
import { HeatmapChart, buildEngagementHeatmap } from '@/components/dashboard/HeatmapChart';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  Eye,
  Users,
  UserCheck,
  UserX,
  MessageCircle,
  LogOut,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  Download,
  Play,
  Image as ImageIcon,
  Share2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  padding: '12px',
};

const COLORS = {
  photo: 'hsl(142, 76%, 36%)',
  video: 'hsl(262, 83%, 58%)',
  followers: 'hsl(217, 91%, 60%)',
  nonFollowers: 'hsl(330, 81%, 60%)',
};

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

const Stories = () => {
  const { data, loading, error, refresh, forceRefresh } = useDashboardData();
  const { selectedAccount } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'reach' | 'views' | 'replies' | 'completion'>('reach');

  const timezone = selectedAccount?.timezone || 'America/Sao_Paulo';

  useEffect(() => {
    if (data?.snapshot_date) setLastUpdated(new Date().toLocaleString('pt-BR'));
  }, [data?.snapshot_date]);

  const handleRefresh = async () => {
    forceRefresh();
    setLastUpdated(new Date().toLocaleString('pt-BR'));
  };

  const exportCSV = () => {
    if (!data?.stories?.length) return;
    
    const headers = ['ID', 'Timestamp', 'Type', 'Views', 'Reach', 'Replies', 'Shares', 'Exits', 'Taps Forward', 'Taps Back', 'Completion Rate'];
    const rows = (data.stories as any[]).map((s: any) => [
      s.id,
      s.timestamp,
      s.media_type,
      s.insights?.views || s.insights?.impressions || 0,
      s.insights?.reach || 0,
      s.insights?.replies || 0,
      s.insights?.shares || 0,
      s.insights?.exits || 0,
      s.insights?.taps_forward || 0,
      s.insights?.taps_back || 0,
      `${s.insights?.completion_rate || 0}%`,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stories-${data.snapshot_date}.csv`;
    a.click();
  };

  const stories = (data?.stories || []) as any[];
  const defaultAgg: StoriesAggregate = {
    total_stories: 0,
    total_impressions: 0,
    total_reach: 0,
    total_replies: 0,
    total_exits: 0,
    total_taps_forward: 0,
    total_taps_back: 0,
    avg_completion_rate: 0,
  };
  const agg: StoriesAggregate = data?.stories_aggregate ?? defaultAgg;

  // Calculate additional metrics
  const metrics = useMemo(() => {
    const photoStories = stories.filter((s: any) => s.media_type !== 'VIDEO');
    const videoStories = stories.filter((s: any) => s.media_type === 'VIDEO');
    
    const totalViews = stories.reduce((sum: number, s: any) => sum + (s.insights?.views || s.insights?.impressions || 0), 0);
    const photoViews = photoStories.reduce((sum: number, s: any) => sum + (s.insights?.views || s.insights?.impressions || 0), 0);
    const videoViews = videoStories.reduce((sum: number, s: any) => sum + (s.insights?.views || s.insights?.impressions || 0), 0);
    
    const totalShares = stories.reduce((sum: number, s: any) => sum + (s.insights?.shares || 0), 0);
    const totalProfileVisits = stories.reduce((sum: number, s: any) => sum + (s.insights?.profile_visits || 0), 0);
    
    // Follower vs non-follower reach (mock calculation - would need real API data)
    const followerReach = Math.round(agg.total_reach * 0.7);
    const nonFollowerReach = agg.total_reach - followerReach;
    
    // Reach rate (reach / followers)
    const followersCount = data?.profile?.followers_count || 1;
    const reachRate = (agg.total_reach / agg.total_stories / followersCount) * 100;
    const maxReachRate = Math.max(...stories.map((s: any) => ((s.insights?.reach || 0) / followersCount) * 100));
    
    // Full view rate (completion rate for all stories)
    const fullViewRates = stories.map((s: any) => s.insights?.completion_rate || 0).filter((r: number) => r > 0);
    const avgFullViewRate = fullViewRates.length > 0 ? fullViewRates.reduce((a: number, b: number) => a + b, 0) / fullViewRates.length : 0;
    const maxFullViewRate = fullViewRates.length > 0 ? Math.max(...fullViewRates) : 0;

    return {
      photoCount: photoStories.length,
      videoCount: videoStories.length,
      avgStoriesPerDay: agg.total_stories > 0 ? (agg.total_stories / 7).toFixed(1) : '0', // assuming 7 day window
      totalViews,
      avgViews: agg.total_stories > 0 ? Math.round(totalViews / agg.total_stories) : 0,
      photoViews,
      videoViews,
      totalShares,
      totalProfileVisits,
      followerReach,
      nonFollowerReach,
      reachRate: isFinite(reachRate) ? reachRate.toFixed(1) : '0',
      maxReachRate: isFinite(maxReachRate) ? maxReachRate.toFixed(1) : '0',
      avgFullViewRate: avgFullViewRate.toFixed(1),
      maxFullViewRate: maxFullViewRate.toFixed(1),
      exitRate: agg.total_impressions > 0 ? Math.round((agg.total_exits / agg.total_impressions) * 100) : 0,
      avgReach: agg.total_stories > 0 ? Math.round(agg.total_reach / agg.total_stories) : 0,
    };
  }, [stories, agg, data?.profile?.followers_count]);

  // Story count by type (daily) - for bar chart
  const storyCountByType = useMemo(() => {
    const grouped: Record<string, { date: string; photo: number; video: number }> = {};
    
    stories.forEach((story: any) => {
      if (!story.timestamp) return;
      const date = format(new Date(story.timestamp), 'dd/MM', { locale: ptBR });
      if (!grouped[date]) {
        grouped[date] = { date, photo: 0, video: 0 };
      }
      if (story.media_type === 'VIDEO') {
        grouped[date].video++;
      } else {
        grouped[date].photo++;
      }
    });
    
    return Object.values(grouped).slice(-7);
  }, [stories]);

  // Reach breakdown data
  const reachBreakdown = [
    { name: 'Seguidores', value: metrics.followerReach, fill: COLORS.followers },
    { name: 'Não Seguidores', value: metrics.nonFollowerReach, fill: COLORS.nonFollowers },
  ];

  // Actions chart data
  const actionsData = [
    { name: 'Avançar', value: agg.total_taps_forward, fill: 'hsl(var(--primary))' },
    { name: 'Voltar', value: agg.total_taps_back, fill: 'hsl(142, 76%, 36%)' },
    { name: 'Respostas', value: agg.total_replies, fill: 'hsl(217, 91%, 60%)' },
    { name: 'Shares', value: metrics.totalShares, fill: 'hsl(262, 83%, 58%)' },
    { name: 'Saídas', value: agg.total_exits, fill: 'hsl(0, 84%, 60%)' },
  ];

  // Build heatmap for best time to post stories
  const storyHeatmapData = useMemo(() => {
    const heatmap: Record<string, number> = {};
    const counts: Record<string, number> = {};
    
    stories.forEach((story: any) => {
      if (!story.timestamp) return;
      const date = new Date(story.timestamp);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        hour: 'numeric',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(date);
      const weekday = parts.find(p => p.type === 'weekday')?.value || 'Sun';
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      
      const dayMap: Record<string, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };
      
      const key = `${dayMap[weekday] ?? 0}_${hour}`;
      const reach = story.insights?.reach || 0;
      
      heatmap[key] = (heatmap[key] || 0) + reach;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    // Average
    Object.keys(heatmap).forEach(key => {
      if (counts[key] > 0) {
        heatmap[key] = Math.round(heatmap[key] / counts[key]);
      }
    });
    
    return heatmap;
  }, [stories, timezone]);

  // Rankings
  const topReach = [...stories].sort((a: any, b: any) => (b.insights?.reach || 0) - (a.insights?.reach || 0)).slice(0, 5);
  const topReplies = [...stories].sort((a: any, b: any) => (b.insights?.replies || 0) - (a.insights?.replies || 0)).slice(0, 5);
  const topCompletion = [...stories].sort((a: any, b: any) => (b.insights?.completion_rate || 0) - (a.insights?.completion_rate || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas completas de stories: views, alcance, interações e taxas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.from_cache && data?.cache_age_hours !== undefined && (
            <div className="chip">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-muted-foreground">Cache</span>
              <strong className="font-semibold">
                {data.cache_age_hours < 1 ? 'Atualizado agora' : `${data.cache_age_hours.toFixed(1)}h`}
              </strong>
            </div>
          )}
          <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {stories.length > 0 && (
            <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              CSV
            </Button>
          )}
        </div>
      </section>

      {loading && !data && (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="chart-card p-6 border-destructive/50">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {!loading && stories.length === 0 && (
        <div className="chart-card p-8 text-center">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum story ativo</h3>
          <p className="text-muted-foreground text-sm">
            Não há stories ativos nas últimas 24 horas.
          </p>
        </div>
      )}

      {data && stories.length > 0 && (
        <>
          {/* Primary KPIs */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            <MetricCard
              label="Stories"
              value={agg.total_stories.toString()}
              icon={<Layers className="w-4 h-4" />}
            />
            <MetricCard
              label="Fotos"
              value={metrics.photoCount.toString()}
              icon={<ImageIcon className="w-4 h-4" />}
            />
            <MetricCard
              label="Vídeos"
              value={metrics.videoCount.toString()}
              icon={<Play className="w-4 h-4" />}
            />
            <MetricCard
              label="Média/Dia"
              value={metrics.avgStoriesPerDay}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              label="Views Total"
              value={formatNumber(metrics.totalViews)}
              icon={<Eye className="w-4 h-4" />}
            />
            <MetricCard
              label="Alcance Total"
              value={formatNumber(agg.total_reach)}
              icon={<Users className="w-4 h-4" />}
            />
            <MetricCard
              label="Respostas"
              value={formatNumber(agg.total_replies)}
              icon={<MessageCircle className="w-4 h-4" />}
            />
            <MetricCard
              label="Shares"
              value={formatNumber(metrics.totalShares)}
              icon={<Share2 className="w-4 h-4" />}
            />
          </div>

          {/* Story Count + Views by Type */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Stories por Dia" subtitle="Foto vs Vídeo">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storyCountByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="photo" name="Fotos" fill={COLORS.photo} stackId="stack" />
                    <Bar dataKey="video" name="Vídeos" fill={COLORS.video} stackId="stack" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Views por Tipo" subtitle="Fotos vs Vídeos">
              <div className="flex items-center gap-6 h-56">
                <div className="flex-1 space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-sm">
                        <ImageIcon className="w-4 h-4" style={{ color: COLORS.photo }} />
                        Fotos
                      </span>
                      <span className="font-bold">{formatNumber(metrics.photoViews)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${metrics.totalViews > 0 ? (metrics.photoViews / metrics.totalViews) * 100 : 0}%`,
                          backgroundColor: COLORS.photo,
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-sm">
                        <Play className="w-4 h-4" style={{ color: COLORS.video }} />
                        Vídeos
                      </span>
                      <span className="font-bold">{formatNumber(metrics.videoViews)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${metrics.totalViews > 0 ? (metrics.videoViews / metrics.totalViews) * 100 : 0}%`,
                          backgroundColor: COLORS.video,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Reach breakdown + Actions */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Alcance por Tipo de Seguidor" subtitle="Seguidores vs Não Seguidores">
              <div className="flex items-center gap-6 h-56">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reachBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {reachBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {reachBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-semibold">{formatNumber(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Interações nos Stories" subtitle="Taps, respostas, shares e saídas">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {actionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Rates Row */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="chart-card p-4">
              <p className="text-sm text-muted-foreground">Reach Rate (Avg)</p>
              <p className="text-2xl font-bold text-primary">{metrics.reachRate}%</p>
              <p className="text-xs text-muted-foreground">Max: {metrics.maxReachRate}%</p>
            </div>
            <div className="chart-card p-4">
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold text-primary">{agg.avg_completion_rate}%</p>
              <p className="text-xs text-muted-foreground">Média de conclusão</p>
            </div>
            <div className="chart-card p-4">
              <p className="text-sm text-muted-foreground">Full View Rate</p>
              <p className="text-2xl font-bold text-primary">{metrics.avgFullViewRate}%</p>
              <p className="text-xs text-muted-foreground">Max: {metrics.maxFullViewRate}%</p>
            </div>
            <div className="chart-card p-4">
              <p className="text-sm text-muted-foreground">Exit Rate</p>
              <p className="text-2xl font-bold text-destructive">{metrics.exitRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa de saída</p>
            </div>
          </div>

          {/* Best Time Heatmap */}
          {Object.keys(storyHeatmapData).length > 0 && (
            <ChartCard title="Melhor Horário para Stories" subtitle="Baseado no alcance médio por horário">
              <HeatmapChart
                data={storyHeatmapData}
                valueLabel="alcance médio"
                colorScheme="purple"
              />
            </ChartCard>
          )}

          {/* Top Stories Gallery */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Maior Alcance" subtitle="Top 5 stories">
              <TopStoriesGallery stories={stories} maxItems={5} metric="reach" />
            </ChartCard>
            <ChartCard title="Mais Respostas" subtitle="Top 5 stories">
              <TopStoriesGallery stories={stories} maxItems={5} metric="replies" />
            </ChartCard>
            <ChartCard title="Maior Conclusão" subtitle="Top 5 stories">
              <TopStoriesGallery stories={stories} maxItems={5} metric="completion" />
            </ChartCard>
          </div>

          {/* Detailed Table */}
          <ChartCard title="Detalhes dos Stories" subtitle="Todas as métricas">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Views</th>
                    <th>Alcance</th>
                    <th>Respostas</th>
                    <th>Shares</th>
                    <th><ArrowRight className="w-3 h-3 inline" /> Avançar</th>
                    <th><ArrowLeft className="w-3 h-3 inline" /> Voltar</th>
                    <th>Saídas</th>
                    <th>Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  {stories.map((story: any) => (
                    <tr key={story.id}>
                      <td>
                        <a href={story.permalink} target="_blank" rel="noopener noreferrer">
                          {(story.thumbnail_url || story.media_url) ? (
                            <img src={story.thumbnail_url || story.media_url} alt="" className="w-10 h-14 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                              <Layers className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </a>
                      </td>
                      <td className="text-sm">{story.timestamp ? format(new Date(story.timestamp), 'dd/MM HH:mm') : '--'}</td>
                      <td>
                        <Badge variant="secondary" className={story.media_type === 'VIDEO' ? 'bg-purple-500/20 text-purple-600' : 'bg-green-500/20 text-green-600'}>
                          {story.media_type === 'VIDEO' ? 'Vídeo' : 'Foto'}
                        </Badge>
                      </td>
                      <td className="font-medium">{formatNumber(story.insights?.views || story.insights?.impressions)}</td>
                      <td className="font-medium">{formatNumber(story.insights?.reach)}</td>
                      <td>{formatNumber(story.insights?.replies)}</td>
                      <td>{formatNumber(story.insights?.shares)}</td>
                      <td>{formatNumber(story.insights?.taps_forward)}</td>
                      <td>{formatNumber(story.insights?.taps_back)}</td>
                      <td>{formatNumber(story.insights?.exits)}</td>
                      <td>
                        <span className={`font-medium ${(story.insights?.completion_rate || 0) >= 70 ? 'text-green-600' : ''}`}>
                          {story.insights?.completion_rate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Stories;
