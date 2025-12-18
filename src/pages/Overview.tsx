import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Users, 
  Grid3X3, 
  Heart, 
  MessageCircle, 
  UserPlus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Overview = () => {
  const { data, loading, error } = useDashboardData();
  const profile = data?.profile ?? null;
  const media = data?.media ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = profile || media.length > 0;

  // Calculate engagement metrics from real media data only
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
  const avgEngagement = media.length > 0 && profile?.followers_count
    ? ((totalLikes + totalComments) / media.length / profile.followers_count * 100).toFixed(2)
    : null;

  const engagementData = totalLikes > 0 || totalComments > 0 ? [
    { name: 'Curtidas', value: totalLikes, color: 'hsl(var(--primary))' },
    { name: 'Comentários', value: totalComments, color: 'hsl(var(--muted-foreground))' },
  ] : [];

  const recentPostsPerformance = media.slice(0, 7).map((item, index) => ({
    post: `Post ${index + 1}`,
    likes: item.like_count || 0,
    comments: item.comments_count || 0,
  }));

  if (!hasData) {
    return (
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Resumo das principais métricas e performance do perfil.
            </p>
          </div>
        </section>

        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Conecte uma conta do Instagram via Facebook para visualizar as métricas do perfil.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo das principais métricas e performance do perfil.
          </p>
        </div>
      </section>

      {/* Main KPIs - Real data only */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Seguidores"
          value={profile?.followers_count?.toLocaleString() || '--'}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          label="Seguindo"
          value={profile?.follows_count?.toLocaleString() || '--'}
          icon={<UserPlus className="w-4 h-4" />}
        />
        <MetricCard
          label="Posts"
          value={profile?.media_count?.toLocaleString() || media.length.toString()}
          icon={<Grid3X3 className="w-4 h-4" />}
        />
        <MetricCard
          label="Engajamento"
          value={avgEngagement ? `${avgEngagement}%` : '--'}
          icon={<Heart className="w-4 h-4" />}
          tooltip="Taxa de engajamento calculada com base nas interações dos posts carregados."
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Engagement Distribution */}
        {engagementData.length > 0 && (
          <ChartCard title="Distribuição de Engajamento" subtitle="Total de interações">
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {engagementData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium">{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* Info Card when no engagement data */}
        {engagementData.length === 0 && (
          <ChartCard title="Distribuição de Engajamento" subtitle="Total de interações">
            <div className="h-[250px] flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sem dados de engajamento</p>
            </div>
          </ChartCard>
        )}

        {/* Recent Posts Performance */}
        {recentPostsPerformance.length > 0 && recentPostsPerformance.some(p => p.likes > 0 || p.comments > 0) ? (
          <ChartCard title="Performance dos Posts Recentes" subtitle="Últimos posts">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentPostsPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="post" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Curtidas" />
                  <Bar dataKey="comments" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Comentários" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Performance dos Posts" subtitle="Últimos posts">
            <div className="h-[250px] flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sem dados de posts</p>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Recent Posts Preview */}
      {media.length > 0 && (
        <ChartCard title="Posts Recentes" subtitle="Últimos posts publicados">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {media.slice(0, 6).map((item) => (
              <a 
                key={item.id}
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity"
              >
                {item.media_url ? (
                  <img 
                    src={item.media_url} 
                    alt={item.caption?.slice(0, 50) || 'Post'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </a>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default Overview;
