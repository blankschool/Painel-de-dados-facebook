import { useEffect, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useFilteredMedia } from '@/hooks/useFilteredMedia';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { FiltersBar } from '@/components/layout/FiltersBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumberOrDash, formatPercent, getComputedNumber, getReach, getSaves, getScore, getShares, getViews, type IgMediaItem } from '@/utils/ig';
import {
  Grid3X3,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  TrendingUp,
  RefreshCw,
  Loader2,
  Download,
  AlertCircle,
  Play,
  Image,
  Images,
  ChevronDown,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const POSTS_PER_PAGE = 25;

const Posts = () => {
  const { data, loading, error, refresh } = useDashboardData();
  const allPosts = data?.posts ?? [];
  const posts = useFilteredMedia(allPosts);
  
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'engagement' | 'likes' | 'comments' | 'saves' | 'shares' | 'reach' | 'views' | 'er'>('score');
  const [displayCount, setDisplayCount] = useState(POSTS_PER_PAGE);

  // Initial fetch already handled by react-query; reset pagination when data changes.
  useEffect(() => {
    setDisplayCount(POSTS_PER_PAGE);
  }, [data?.snapshot_date]);

  const handleRefresh = async (forceRefresh = false) => {
    // `forceRefresh` kept for UI compatibility; edge function can support it later.
    await refresh();
    setLastUpdated(new Date().toLocaleString('pt-BR'));
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + POSTS_PER_PAGE);
  };

  const exportCSV = () => {
    if (!data?.posts?.length) return;
    const items = data.posts;
    
    const headers = [
      'id',
      'timestamp',
      'media_type',
      'media_product_type',
      'permalink',
      'likes',
      'comments',
      'saves',
      'shares',
      'reach',
      'views',
      'engagement',
      'er',
      'reach_rate',
      'views_rate',
      'interactions_per_1000_reach',
      'score',
    ];
    const rows = items.map((p: IgMediaItem) => [
      p.id,
      p.timestamp ?? '',
      p.media_type ?? '',
      p.media_product_type ?? '',
      p.permalink ?? '',
      p.like_count ?? 0,
      p.comments_count ?? 0,
      getSaves(p) ?? '',
      getShares(p) ?? '',
      getReach(p) ?? '',
      getViews(p) ?? '',
      getComputedNumber(p, 'engagement') ?? p.insights?.engagement ?? '',
      getComputedNumber(p, 'er') ?? '',
      getComputedNumber(p, 'reach_rate') ?? '',
      getComputedNumber(p, 'views_rate') ?? '',
      getComputedNumber(p, 'interactions_per_1000_reach') ?? '',
      getScore(p),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts-${data.snapshot_date}.csv`;
    a.click();
  };

  // Aggregate metrics
  const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const savesValues = posts.map(getSaves).filter((v): v is number => typeof v === 'number');
  const sharesValues = posts.map(getShares).filter((v): v is number => typeof v === 'number');
  const reachValues = posts.map(getReach).filter((v): v is number => typeof v === 'number');
  const viewsValues = posts.map(getViews).filter((v): v is number => typeof v === 'number');
  const totalSaves = savesValues.length > 0 ? savesValues.reduce((s, v) => s + v, 0) : null;
  const totalShares = sharesValues.length > 0 ? sharesValues.reduce((s, v) => s + v, 0) : null;
  const totalReach = reachValues.length > 0 ? reachValues.reduce((s, v) => s + v, 0) : null;
  const totalViews = viewsValues.length > 0 ? viewsValues.reduce((s, v) => s + v, 0) : null;
  const totalScore = posts.reduce((sum, p) => sum + getScore(p), 0);

  // Media type distribution
  const typeCount = posts.reduce<Record<string, number>>((acc, p) => {
    const type = p.media_type || 'IMAGE';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeData = [
    { name: 'Imagens', value: typeCount['IMAGE'] || 0, fill: 'hsl(var(--primary))' },
    { name: 'Carrossel', value: typeCount['CAROUSEL_ALBUM'] || 0, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Reels', value: (typeCount['VIDEO'] || 0) + (typeCount['REELS'] || 0), fill: 'hsl(var(--foreground) / 0.5)' },
  ].filter(d => d.value > 0);

  // Sort posts
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'score') return getScore(b) - getScore(a);
    if (sortBy === 'likes') return (b.like_count || 0) - (a.like_count || 0);
    if (sortBy === 'comments') return (b.comments_count || 0) - (a.comments_count || 0);
    if (sortBy === 'saves') return (getSaves(b) ?? -1) - (getSaves(a) ?? -1);
    if (sortBy === 'shares') return (getShares(b) ?? -1) - (getShares(a) ?? -1);
    if (sortBy === 'reach') return (getReach(b) ?? -1) - (getReach(a) ?? -1);
    if (sortBy === 'views') return (getViews(b) ?? -1) - (getViews(a) ?? -1);
    if (sortBy === 'er') return (getComputedNumber(b, 'er') ?? -1) - (getComputedNumber(a, 'er') ?? -1);
    const engA = getComputedNumber(a, 'engagement') ?? a.insights?.engagement ?? 0;
    const engB = getComputedNumber(b, 'engagement') ?? b.insights?.engagement ?? 0;
    return engB - engA;
  });

  // Paginated posts for display
  const displayedPosts = sortedPosts.slice(0, displayCount);
  const hasMorePosts = displayCount < sortedPosts.length;

  // Top 10 for chart
  const top10 = sortedPosts.slice(0, 10).map((p, idx: number) => ({
    name: `#${idx + 1}`,
    likes: p.like_count || 0,
    comments: p.comments_count || 0,
    saves: getSaves(p) ?? 0,
    score: getScore(p),
  }));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
      case 'REELS':
        return <Play className="w-3 h-3" />;
      case 'CAROUSEL_ALBUM':
        return <Images className="w-3 h-3" />;
      default:
        return <Image className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <FiltersBar showMediaType={true} />

      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise de {posts.length.toLocaleString()} posts{allPosts.length !== posts.length ? ` (filtrado de ${allPosts.length.toLocaleString()})` : ''}. Rankings usam Score (ponderado) e métricas normalizadas quando disponíveis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="chip">
              <span className="text-muted-foreground">Atualizado</span>
              <strong className="font-semibold">{lastUpdated}</strong>
            </div>
          )}
          <Button onClick={() => handleRefresh(true)} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {posts.length > 0 && (
            <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
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

      {data && (
        <>
          {/* Main KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Total Posts"
              value={posts.length.toLocaleString()}
              icon={<Grid3X3 className="w-4 h-4" />}
            />
            <MetricCard
              label="Curtidas"
              value={totalLikes.toLocaleString()}
              icon={<Heart className="w-4 h-4" />}
            />
            <MetricCard
              label="Comentários"
              value={totalComments.toLocaleString()}
              icon={<MessageCircle className="w-4 h-4" />}
            />
            <MetricCard
              label="Salvos"
              value={formatNumberOrDash(totalSaves)}
              icon={<Bookmark className="w-4 h-4" />}
            />
            <MetricCard
              label="Compartilhados"
              value={formatNumberOrDash(totalShares)}
              icon={<Share2 className="w-4 h-4" />}
              tooltip="Compartilhamentos só estão disponíveis para alguns formatos (principalmente Reels)."
            />
            <MetricCard
              label="Alcance Total"
              value={formatNumberOrDash(totalReach)}
              icon={<Eye className="w-4 h-4" />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Score total"
              value={totalScore > 0 ? totalScore.toLocaleString() : '--'}
              icon={<TrendingUp className="w-4 h-4" />}
              tooltip="Score ponderado: likes×1 + comments×2 + saves×3 + shares×4."
            />
            <MetricCard
              label="Score médio/post"
              value={posts.length > 0 ? Math.round(totalScore / posts.length).toLocaleString() : '--'}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              label="Views (total)"
              value={formatNumberOrDash(totalViews)}
              icon={<Eye className="w-4 h-4" />}
            />
            <MetricCard
              label="ER médio"
              value={formatPercent(
                (() => {
                  const vals = posts.map((p) => getComputedNumber(p, 'er')).filter((v): v is number => typeof v === 'number');
                  return vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : null;
                })(),
              )}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Type Distribution */}
            <ChartCard title="Distribuição por Tipo" subtitle="Posts por formato">
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {typeData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Top 10 Performance */}
            <ChartCard title="Top 10 Posts" subtitle={`Ordenado por ${sortBy === 'score' ? 'Score' : sortBy}`}>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '12px',
                      }}
                      labelStyle={{ fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [value.toLocaleString('pt-BR'), '']}
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                    />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Score" />
                    <Bar dataKey="likes" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} name="Curtidas" />
                    <Bar dataKey="saves" fill="hsl(var(--foreground) / 0.4)" radius={[2, 2, 0, 0]} name="Salvos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Rankings Tabs */}
          <ChartCard title="Ranking de Posts" subtitle={`Mostrando ${displayedPosts.length} de ${sortedPosts.length} posts`}>
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="score" className="gap-1">
                  <TrendingUp className="w-3 h-3" /> Score
                </TabsTrigger>
                <TabsTrigger value="engagement" className="gap-1">
                  <TrendingUp className="w-3 h-3" /> Engajamento
                </TabsTrigger>
                <TabsTrigger value="likes" className="gap-1">
                  <Heart className="w-3 h-3" /> Curtidas
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-1">
                  <MessageCircle className="w-3 h-3" /> Comentários
                </TabsTrigger>
                <TabsTrigger value="saves" className="gap-1">
                  <Bookmark className="w-3 h-3" /> Salvos
                </TabsTrigger>
                <TabsTrigger value="shares" className="gap-1">
                  <Share2 className="w-3 h-3" /> Shares
                </TabsTrigger>
                <TabsTrigger value="reach" className="gap-1">
                  <Eye className="w-3 h-3" /> Alcance
                </TabsTrigger>
                <TabsTrigger value="views" className="gap-1">
                  <Eye className="w-3 h-3" /> Views
                </TabsTrigger>
                <TabsTrigger value="er" className="gap-1">
                  <TrendingUp className="w-3 h-3" /> ER
                </TabsTrigger>
              </TabsList>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Preview</th>
                      <th>Legenda</th>
                      <th>Tipo</th>
                      <th>Data</th>
                      <th>Score</th>
                      <th>ER</th>
                      <th>Curtidas</th>
                      <th>Comentários</th>
                      <th>Salvos</th>
                      <th>Compartilhados</th>
                      <th>Alcance</th>
                      <th title="Views usa impressions/reach quando views não está disponível.">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPosts.map((post, idx: number) => (
                      <tr
                        key={post.id}
                        className="cursor-pointer hover:bg-secondary/40 transition-colors"
                        onClick={() => {
                          if (post.permalink) window.open(post.permalink, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <td className="font-bold text-muted-foreground">{idx + 1}</td>
                        <td>
                          <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                            {(post.media_url || post.thumbnail_url) ? (
                              <img 
                                src={post.thumbnail_url || post.media_url} 
                                alt="" 
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                                <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </a>
                        </td>
                        <td className="max-w-[200px] truncate text-xs">
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {post.caption?.slice(0, 60) || '-'}
                          </a>
                        </td>
                        <td>
                          <span className="tag flex items-center gap-1">
                            {getTypeIcon(post.media_type)}
                            {post.media_type === 'IMAGE' ? 'Imagem' : 
                             post.media_type === 'VIDEO' || post.media_type === 'REELS' ? 'Vídeo' : 
                             post.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : post.media_type}
                          </span>
                        </td>
                        <td className="text-xs">{new Date(post.timestamp).toLocaleDateString('pt-BR')}</td>
                        <td className="font-medium">{getScore(post).toLocaleString()}</td>
                        <td>{formatPercent(getComputedNumber(post, 'er'))}</td>
                        <td className="font-medium">{(post.like_count || 0).toLocaleString()}</td>
                        <td>{(post.comments_count || 0).toLocaleString()}</td>
                        <td>{formatNumberOrDash(getSaves(post))}</td>
                        <td>{formatNumberOrDash(getShares(post))}</td>
                        <td>{formatNumberOrDash(getReach(post))}</td>
                        <td>{formatNumberOrDash(getViews(post))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More Button */}
              {hasMorePosts && (
                <div className="mt-4 flex justify-center">
                  <Button 
                    onClick={handleLoadMore} 
                    variant="outline" 
                    className="gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Carregar mais ({sortedPosts.length - displayCount} restantes)
                  </Button>
                </div>
              )}
            </Tabs>
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Posts;
