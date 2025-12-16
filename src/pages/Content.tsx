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
  RefreshCw,
  Loader2,
  AlertCircle,
  Play,
  Image,
  Images,
  Layers,
  LogOut,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
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

const Content = () => {
  const { connectedAccounts } = useAuth();
  const { loading, error, data, fetchInsights, resetData, selectedAccountId } = useInsights();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');

  const hasAccount = connectedAccounts && connectedAccounts.length > 0;

  useEffect(() => {
    if (hasAccount && selectedAccountId) {
      resetData();
      handleRefresh();
    }
  }, [selectedAccountId]);

  const handleRefresh = async () => {
    const result = await fetchInsights();
    if (result) {
      setLastUpdated(new Date().toLocaleString('pt-BR'));
    }
  };

  if (!hasAccount) {
    return (
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-3 py-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Conteúdo</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Análise de posts, stories e reels.
            </p>
          </div>
        </section>
        <div className="chart-card p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Conecte sua conta do Instagram para ver o conteúdo.</p>
        </div>
      </div>
    );
  }

  const posts = data?.posts || [];
  const stories = data?.stories || [];
  const storiesAgg: any = data?.stories_aggregate || {};

  // Posts metrics
  const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
  const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
  const totalSaves = posts.reduce((sum: number, p: any) => sum + (p.insights?.saved || 0), 0);
  const reels = posts.filter((p: any) => p.media_type === 'VIDEO' || p.media_type === 'REELS');

  // Type distribution
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

  // Sorted posts
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    const engA = (a.like_count || 0) + (a.comments_count || 0) + (a.insights?.saved || 0);
    const engB = (b.like_count || 0) + (b.comments_count || 0) + (b.insights?.saved || 0);
    return engB - engA;
  });

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
          <h1 className="text-2xl font-bold tracking-tight">Conteúdo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise de posts, stories e reels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Atualizado: {lastUpdated}</span>
          )}
          <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="posts" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              Posts ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <Layers className="w-4 h-4" />
              Stories ({stories.length})
            </TabsTrigger>
            <TabsTrigger value="reels" className="gap-2">
              <Play className="w-4 h-4" />
              Reels ({reels.length})
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total Posts" value={posts.length.toLocaleString()} icon={<Grid3X3 className="w-4 h-4" />} />
              <MetricCard label="Curtidas" value={totalLikes.toLocaleString()} icon={<Heart className="w-4 h-4" />} />
              <MetricCard label="Comentários" value={totalComments.toLocaleString()} icon={<MessageCircle className="w-4 h-4" />} />
              <MetricCard label="Salvos" value={totalSaves.toLocaleString()} icon={<Bookmark className="w-4 h-4" />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Distribuição por Tipo" subtitle="Posts por formato">
                <div className="h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {typeData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Top Posts" subtitle="Melhores por engajamento">
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {sortedPosts.slice(0, 5).map((post: any, idx: number) => (
                    <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                      <span className="text-sm font-bold text-muted-foreground w-5">{idx + 1}</span>
                      {(post.media_url || post.thumbnail_url) ? (
                        <img src={post.thumbnail_url || post.media_url} alt="" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center">
                          {getTypeIcon(post.media_type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{post.caption?.slice(0, 40) || 'Sem legenda'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>❤ {post.like_count || 0}</span>
                          <span>💬 {post.comments_count || 0}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </ChartCard>
            </div>
          </TabsContent>

          {/* Stories Tab */}
          <TabsContent value="stories" className="space-y-6">
            {stories.length === 0 ? (
              <div className="chart-card p-8 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum story ativo</h3>
                <p className="text-muted-foreground text-sm">Stories expiram após 24 horas.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label="Stories Ativos" value={storiesAgg.total_stories?.toString() || '0'} icon={<Layers className="w-4 h-4" />} />
                  <MetricCard label="Impressões" value={(storiesAgg.total_impressions || 0).toLocaleString()} icon={<Eye className="w-4 h-4" />} />
                  <MetricCard label="Respostas" value={(storiesAgg.total_replies || 0).toLocaleString()} icon={<MessageCircle className="w-4 h-4" />} />
                  <MetricCard label="Taxa de Conclusão" value={`${storiesAgg.avg_completion_rate || 0}%`} icon={<CheckCircle className="w-4 h-4" />} />
                </div>

                <ChartCard title="Stories Ativos" subtitle="Clique para abrir">
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {stories.map((story: any) => (
                      <a key={story.id} href={story.permalink} target="_blank" rel="noopener noreferrer" className="aspect-[9/16] rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity">
                        {(story.media_url || story.thumbnail_url) ? (
                          <img src={story.thumbnail_url || story.media_url} alt="Story" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </ChartCard>
              </>
            )}
          </TabsContent>

          {/* Reels Tab */}
          <TabsContent value="reels" className="space-y-6">
            {reels.length === 0 ? (
              <div className="chart-card p-8 text-center">
                <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum reel encontrado</h3>
                <p className="text-muted-foreground text-sm">Seus reels aparecerão aqui.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label="Total Reels" value={reels.length.toLocaleString()} icon={<Play className="w-4 h-4" />} />
                  <MetricCard 
                    label="Curtidas" 
                    value={reels.reduce((s: number, r: any) => s + (r.like_count || 0), 0).toLocaleString()} 
                    icon={<Heart className="w-4 h-4" />} 
                  />
                  <MetricCard 
                    label="Comentários" 
                    value={reels.reduce((s: number, r: any) => s + (r.comments_count || 0), 0).toLocaleString()} 
                    icon={<MessageCircle className="w-4 h-4" />} 
                  />
                  <MetricCard 
                    label="Compartilhados" 
                    value={reels.reduce((s: number, r: any) => s + (r.insights?.shares || 0), 0).toLocaleString()} 
                    icon={<Share2 className="w-4 h-4" />} 
                  />
                </div>

                <ChartCard title="Seus Reels" subtitle="Ordenados por engajamento">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {reels.slice(0, 8).map((reel: any) => (
                      <a key={reel.id} href={reel.permalink} target="_blank" rel="noopener noreferrer" className="group">
                        <div className="aspect-[9/16] rounded-lg overflow-hidden bg-secondary relative">
                          {(reel.media_url || reel.thumbnail_url) ? (
                            <img src={reel.thumbnail_url || reel.media_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div className="text-background text-xs space-y-0.5">
                              <div>❤ {reel.like_count || 0}</div>
                              <div>💬 {reel.comments_count || 0}</div>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </ChartCard>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Content;
