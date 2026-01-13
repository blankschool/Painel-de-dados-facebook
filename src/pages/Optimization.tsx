import { useMemo, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useFilteredMedia } from '@/hooks/useFilteredMedia';
import { useAuth } from '@/contexts/AuthContext';
import { FiltersBar } from '@/components/layout/FiltersBar';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { HeatmapChart, convertOnlineFollowersToHeatmap, buildEngagementHeatmap } from '@/components/dashboard/HeatmapChart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, TrendingUp, Hash, Image as ImageIcon, Play, Loader2, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { isReel, getEngagement } from '@/utils/ig';
import type { IgMediaItem } from '@/utils/ig';

// Color palette for charts
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
const TYPE_COLORS: Record<string, string> = {
  'Foto': 'hsl(142, 76%, 36%)',
  'Carrossel': 'hsl(217, 91%, 60%)',
  'Reel': 'hsl(330, 81%, 60%)',
  'Vídeo': 'hsl(262, 83%, 58%)',
};

function getMediaTypeLabel(post: IgMediaItem): string {
  if (isReel(post)) return 'Reel';
  if (post.media_type === 'CAROUSEL_ALBUM') return 'Carrossel';
  if (post.media_type === 'VIDEO') return 'Vídeo';
  return 'Foto';
}

// Extract hashtags from caption
function extractHashtags(caption: string | undefined): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\w\u00C0-\u024F]+/g);
  return matches ? matches.map(h => h.toLowerCase()) : [];
}

const Optimization = () => {
  const { data, loading, forceRefresh } = useDashboardData();
  const { selectedAccount } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeHeatmap, setActiveHeatmap] = useState<'online' | 'engagement'>('online');

  const timezone = selectedAccount?.timezone || 'America/Sao_Paulo';
  const followersCount = data?.profile?.followers_count || 0;
  
  // Get media from dashboard data and apply filters
  const allMedia = data?.media || [];
  const media = useFilteredMedia(allMedia, timezone);

  const handleRefresh = async () => {
    setRefreshing(true);
    forceRefresh();
    setRefreshing(false);
  };

  // Convert online followers data to heatmap format
  const onlineHeatmapData = useMemo(() => {
    return convertOnlineFollowersToHeatmap(data?.online_followers);
  }, [data?.online_followers]);

  // Build engagement heatmap from posts
  const engagementHeatmapData = useMemo(() => {
    return buildEngagementHeatmap(media, timezone);
  }, [media, timezone]);

  // Calculate post type distribution
  const postTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = { 'Foto': 0, 'Carrossel': 0, 'Reel': 0, 'Vídeo': 0 };
    
    media.forEach((post) => {
      const type = getMediaTypeLabel(post);
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: media.length > 0 ? ((value / media.length) * 100).toFixed(1) : '0',
        fill: TYPE_COLORS[name] || COLORS[0],
      }));
  }, [media]);

  // Calculate engagement by post type
  const engagementByType = useMemo(() => {
    const typeData: Record<string, { total: number; count: number }> = {};
    
    media.forEach((post) => {
      const type = getMediaTypeLabel(post);
      const engagement = getEngagement(post);
      
      if (!typeData[type]) {
        typeData[type] = { total: 0, count: 0 };
      }
      typeData[type].total += engagement;
      typeData[type].count += 1;
    });

    return Object.entries(typeData)
      .map(([name, data]) => ({
        name,
        avgEngagement: data.count > 0 ? Math.round(data.total / data.count) : 0,
        totalEngagement: data.total,
        count: data.count,
        avgER: followersCount > 0 && data.count > 0
          ? ((data.total / data.count / followersCount) * 100).toFixed(2)
          : '0',
        fill: TYPE_COLORS[name] || COLORS[0],
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [media, followersCount]);

  // Analyze hashtags
  const hashtagAnalysis = useMemo(() => {
    const hashtagData: Record<string, { count: number; engagement: number; posts: number }> = {};
    
    media.forEach((post) => {
      const hashtags = extractHashtags(post.caption);
      const engagement = getEngagement(post);
      
      hashtags.forEach((tag) => {
        if (!hashtagData[tag]) {
          hashtagData[tag] = { count: 0, engagement: 0, posts: 0 };
        }
        hashtagData[tag].count += 1;
        hashtagData[tag].engagement += engagement;
        hashtagData[tag].posts += 1;
      });
    });

    // Top hashtags by total interactions
    const topByInteractions = Object.entries(hashtagData)
      .map(([tag, data]) => ({
        tag,
        interactions: data.engagement,
        uses: data.count,
        avgInteractions: Math.round(data.engagement / data.count),
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);

    // Most effective (highest avg interactions per use)
    const mostEffective = Object.entries(hashtagData)
      .filter(([_, data]) => data.count >= 2) // At least used twice
      .map(([tag, data]) => ({
        tag,
        interactions: data.engagement,
        uses: data.count,
        avgInteractions: Math.round(data.engagement / data.count),
      }))
      .sort((a, b) => b.avgInteractions - a.avgInteractions)
      .slice(0, 10);

    return { topByInteractions, mostEffective };
  }, [media]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalPosts = media.length;
    const totalEngagement = media.reduce((sum, post) => sum + getEngagement(post), 0);
    const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
    const avgER = followersCount > 0 && totalPosts > 0
      ? ((totalEngagement / totalPosts / followersCount) * 100).toFixed(2)
      : '0';

    return { totalPosts, totalEngagement, avgEngagement, avgER };
  }, [media, followersCount]);

  const hasOnlineData = Object.keys(onlineHeatmapData).length > 0;
  const hasEngagementData = Object.keys(engagementHeatmapData).length > 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Optimization</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sugestões de otimização baseadas nos dados do seu perfil.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.from_cache && data?.cache_age_hours !== undefined && (
            <div className="chip">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-muted-foreground">Cache</span>
              <strong className="font-semibold">
                {data.cache_age_hours < 1 
                  ? 'Atualizado agora' 
                  : `${data.cache_age_hours.toFixed(1)}h atrás`}
              </strong>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </section>

      <FiltersBar />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Posts Analisados"
          value={stats.totalPosts.toLocaleString()}
          icon={<ImageIcon className="w-4 h-4" />}
        />
        <MetricCard
          label="Engajamento Médio"
          value={stats.avgEngagement.toLocaleString()}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label="Taxa de Engajamento"
          value={`${stats.avgER}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label="Hashtags Encontradas"
          value={hashtagAnalysis.topByInteractions.length.toString()}
          icon={<Hash className="w-4 h-4" />}
        />
      </div>

      {/* Best Time to Post Section */}
      <ChartCard 
        title="Melhor Horário para Postar"
        subtitle="Heatmap mostrando os melhores horários baseado em seguidores online ou engajamento histórico"
      >
        <Tabs value={activeHeatmap} onValueChange={(v) => setActiveHeatmap(v as 'online' | 'engagement')}>
          <TabsList className="mb-4">
            <TabsTrigger value="online" className="gap-2">
              <Clock className="w-4 h-4" />
              Seguidores Online
            </TabsTrigger>
            <TabsTrigger value="engagement" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Engajamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online">
            {hasOnlineData ? (
              <HeatmapChart
                data={onlineHeatmapData}
                valueLabel="seguidores online"
                colorScheme="blue"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Dados de seguidores online não disponíveis.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta métrica requer uma conta Business/Creator conectada.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="engagement">
            {hasEngagementData ? (
              <HeatmapChart
                data={engagementHeatmapData}
                valueLabel="engajamento médio"
                colorScheme="green"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Nenhum post encontrado no período selecionado.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ChartCard>

      {/* Post Types Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post Type Distribution */}
        <ChartCard 
          title="Distribuição de Tipos de Post"
          subtitle="Proporção de cada tipo de conteúdo publicado"
        >
          {postTypeDistribution.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={postTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {postTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {postTypeDistribution.map((type) => (
                  <div key={type.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.fill }}
                      />
                      <span className="text-sm font-medium">{type.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {type.value} ({type.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum post encontrado
            </div>
          )}
        </ChartCard>

        {/* Most Engaging Post Types */}
        <ChartCard 
          title="Tipos de Post Mais Engajadores"
          subtitle="Engajamento médio por tipo de conteúdo"
        >
          {engagementByType.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementByType} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Engajamento médio: {data.avgEngagement.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ER médio: {data.avgER}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Posts: {data.count}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avgEngagement" radius={[0, 4, 4, 0]}>
                    {engagementByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de engajamento disponível
            </div>
          )}
        </ChartCard>
      </div>

      {/* Hashtag Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Hashtags by Interactions */}
        <ChartCard 
          title="Top Hashtags por Interações"
          subtitle="Hashtags que geraram mais engajamento total"
        >
          {hashtagAnalysis.topByInteractions.length > 0 ? (
            <div className="space-y-3">
              {hashtagAnalysis.topByInteractions.map((item, index) => (
                <div 
                  key={item.tag}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{item.tag}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {item.uses} {item.uses === 1 ? 'uso' : 'usos'}
                    </span>
                    <Badge variant="secondary" className="font-semibold">
                      {item.interactions.toLocaleString()} interações
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma hashtag encontrada nos posts
            </div>
          )}
        </ChartCard>

        {/* Most Effective Hashtags */}
        <ChartCard 
          title="Hashtags Mais Efetivas"
          subtitle="Hashtags com maior engajamento médio por uso (mín. 2 usos)"
        >
          {hashtagAnalysis.mostEffective.length > 0 ? (
            <div className="space-y-3">
              {hashtagAnalysis.mostEffective.map((item, index) => (
                <div 
                  key={item.tag}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{item.tag}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {item.uses} {item.uses === 1 ? 'uso' : 'usos'}
                    </span>
                    <Badge variant="outline" className="font-semibold text-green-600 dark:text-green-400 border-green-500/30">
                      ~{item.avgInteractions.toLocaleString()} /uso
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma hashtag com uso recorrente encontrada
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tips Section */}
      <ChartCard 
        title="Dicas de Otimização"
        subtitle="Recomendações baseadas na análise dos seus dados"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {engagementByType.length > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">Tipo de Conteúdo</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{engagementByType[0]?.name}</strong> é seu tipo de conteúdo 
                com maior engajamento médio ({engagementByType[0]?.avgER}% ER).
              </p>
            </div>
          )}

          {hasOnlineData && (
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold text-sm">Horário de Pico</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Seus seguidores estão mais ativos durante a semana. 
                Consulte o heatmap para horários específicos.
              </p>
            </div>
          )}

          {hashtagAnalysis.mostEffective.length > 0 && (
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-sm">Hashtags Efetivas</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{hashtagAnalysis.mostEffective[0]?.tag}</strong> gera 
                em média {hashtagAnalysis.mostEffective[0]?.avgInteractions.toLocaleString()} interações por uso.
              </p>
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default Optimization;
