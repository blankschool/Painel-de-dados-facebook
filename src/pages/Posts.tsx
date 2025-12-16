import { useEffect, useState } from 'react';
import { useInsights } from '@/hooks/useInsights';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

const Posts = () => {
  const { connectedAccounts } = useAuth();
  const { loading, error, data, fetchInsights } = useInsights();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'engagement' | 'likes' | 'comments' | 'saves' | 'reach'>('engagement');

  const hasAccount = connectedAccounts && connectedAccounts.length > 0;

  useEffect(() => {
    if (hasAccount && !data) {
      handleRefresh();
    }
  }, [hasAccount]);

  const handleRefresh = async () => {
    const result = await fetchInsights();
    if (result) {
      setLastUpdated(new Date().toLocaleString('pt-BR'));
    }
  };

  const exportCSV = () => {
    if (!data?.posts?.length) return;
    
    const headers = ['ID', 'Caption', 'Type', 'Date', 'Likes', 'Comments', 'Saves', 'Shares', 'Reach', 'Views', 'Engagement'];
    const rows = data.posts.map((p: any) => [
      p.id,
      `"${(p.caption || '').slice(0, 50).replace(/"/g, '""')}"`,
      p.media_type,
      p.timestamp,
      p.like_count || 0,
      p.comments_count || 0,
      p.insights?.saved || 0,
      p.insights?.shares || 0,
      p.insights?.reach || 0,
      p.insights?.views || 0,
      p.insights?.engagement || 0,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts-${data.snapshot_date}.csv`;
    a.click();
  };

  if (!hasAccount) {
    return (
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-3 py-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Posts</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Análise detalhada de performance dos posts.
            </p>
          </div>
        </section>
        <div className="chart-card p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Conecte sua conta do Instagram para ver a análise de posts.</p>
        </div>
      </div>
    );
  }

  const posts = data?.posts || [];
  
  // Aggregate metrics
  const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
  const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
  const totalSaves = posts.reduce((sum: number, p: any) => sum + (p.insights?.saved || 0), 0);
  const totalShares = posts.reduce((sum: number, p: any) => sum + (p.insights?.shares || 0), 0);
  const totalReach = posts.reduce((sum: number, p: any) => sum + (p.insights?.reach || 0), 0);
  const totalViews = posts.reduce((sum: number, p: any) => sum + (p.insights?.views || 0), 0);

  // Media type distribution
  const typeCount = posts.reduce((acc: any, p: any) => {
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
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'likes':
        return (b.like_count || 0) - (a.like_count || 0);
      case 'comments':
        return (b.comments_count || 0) - (a.comments_count || 0);
      case 'saves':
        return (b.insights?.saved || 0) - (a.insights?.saved || 0);
      case 'reach':
        return (b.insights?.reach || 0) - (a.insights?.reach || 0);
      case 'engagement':
      default:
        const engA = (a.like_count || 0) + (a.comments_count || 0) + (a.insights?.saved || 0);
        const engB = (b.like_count || 0) + (b.comments_count || 0) + (b.insights?.saved || 0);
        return engB - engA;
    }
  });

  // Top 10 for chart
  const top10 = sortedPosts.slice(0, 10).map((p: any, idx: number) => ({
    name: `#${idx + 1}`,
    likes: p.like_count || 0,
    comments: p.comments_count || 0,
    saves: p.insights?.saved || 0,
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
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise detalhada de performance: {data?.total_posts || 0} posts analisados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="chip">
              <span className="text-muted-foreground">Atualizado</span>
              <strong className="font-semibold">{lastUpdated}</strong>
            </div>
          )}
          <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm" className="gap-2">
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
              value={totalSaves.toLocaleString()}
              icon={<Bookmark className="w-4 h-4" />}
            />
            <MetricCard
              label="Compartilhados"
              value={totalShares.toLocaleString()}
              icon={<Share2 className="w-4 h-4" />}
            />
            <MetricCard
              label="Alcance Total"
              value={totalReach.toLocaleString()}
              icon={<Eye className="w-4 h-4" />}
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
            <ChartCard title="Top 10 Posts" subtitle="Performance dos melhores posts">
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
                        color: 'hsl(var(--foreground))'
                      }} 
                    />
                    <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Curtidas" />
                    <Bar dataKey="comments" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} name="Comentários" />
                    <Bar dataKey="saves" fill="hsl(var(--foreground) / 0.4)" radius={[2, 2, 0, 0]} name="Salvos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Rankings Tabs */}
          <ChartCard title="Ranking de Posts" subtitle="Ordenados por diferentes métricas">
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="w-full">
              <TabsList className="mb-4">
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
                <TabsTrigger value="reach" className="gap-1">
                  <Eye className="w-3 h-3" /> Alcance
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
                      <th>Curtidas</th>
                      <th>Comentários</th>
                      <th>Salvos</th>
                      <th>Compartilhados</th>
                      <th>Alcance</th>
                      <th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosts.slice(0, 20).map((post: any, idx: number) => (
                      <tr key={post.id}>
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
                          {post.caption?.slice(0, 60) || '-'}
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
                        <td className="font-medium">{(post.like_count || 0).toLocaleString()}</td>
                        <td>{(post.comments_count || 0).toLocaleString()}</td>
                        <td>{(post.insights?.saved || 0).toLocaleString()}</td>
                        <td>{(post.insights?.shares || 0).toLocaleString()}</td>
                        <td>{(post.insights?.reach || 0).toLocaleString()}</td>
                        <td>{(post.insights?.views || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tabs>
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Posts;
