import { useInstagram } from '@/contexts/InstagramContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Play, 
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

const Reels = () => {
  const { media, loading } = useInstagram();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter reels/videos from media
  const reels = media.filter(item => item.media_type === 'VIDEO' || item.media_type === 'REELS');

  // Calculate metrics
  const totalViews = reels.reduce((sum, reel) => sum + (reel.like_count || 0) * 10, 0); // Estimate
  const totalLikes = reels.reduce((sum, reel) => sum + (reel.like_count || 0), 0);
  const totalComments = reels.reduce((sum, reel) => sum + (reel.comments_count || 0), 0);
  const avgViews = reels.length > 0 ? Math.round(totalViews / reels.length) : 0;

  // Mock performance data
  const reelsPerformance = reels.slice(0, 10).map((reel, index) => ({
    name: `Reel ${index + 1}`,
    views: (reel.like_count || 0) * 10,
    likes: reel.like_count || 0,
    comments: reel.comments_count || 0,
  }));

  const weeklyData = [
    { week: 'Sem 1', views: 45000, engagement: 4.2 },
    { week: 'Sem 2', views: 52000, engagement: 4.8 },
    { week: 'Sem 3', views: 48000, engagement: 4.5 },
    { week: 'Sem 4', views: 61000, engagement: 5.1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reels & Vídeos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas e análises dos seus conteúdos em vídeo.
          </p>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de Reels"
          value={reels.length.toLocaleString()}
          icon={<Play className="w-4 h-4" />}
        />
        <MetricCard
          label="Visualizações Totais"
          value={totalViews.toLocaleString()}
          icon={<Eye className="w-4 h-4" />}
          delta={{ value: '+18%', positive: true }}
        />
        <MetricCard
          label="Média de Views"
          value={avgViews.toLocaleString()}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label="Taxa de Engajamento"
          value="5.2%"
          icon={<Heart className="w-4 h-4" />}
          delta={{ value: '+0.8%', positive: true }}
        />
      </div>

      {/* Performance Chart */}
      <ChartCard title="Performance dos Reels" subtitle="Visualizações por reel">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reelsPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Views" />
              <Bar dataKey="likes" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Curtidas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Trend */}
        <ChartCard title="Tendência Semanal" subtitle="Views e engajamento">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="views" stroke="hsl(var(--primary))" name="Views" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="engagement" stroke="hsl(var(--success))" name="Engajamento %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Top Reels */}
        <ChartCard title="Top Reels" subtitle="Melhores performances">
          <div className="space-y-3">
            {reels.slice(0, 5).map((reel, index) => (
              <a
                key={reel.id}
                href={reel.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                  {reel.thumbnail_url || reel.media_url ? (
                    <img 
                      src={reel.thumbnail_url || reel.media_url}
                      alt={`Reel ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {reel.caption?.slice(0, 50) || `Reel ${index + 1}`}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {((reel.like_count || 0) * 10).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {(reel.like_count || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {(reel.comments_count || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Comparison Table */}
      <ChartCard title="Comparativo de Métricas" subtitle="Análise detalhada dos reels">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reel</th>
                <th>Views</th>
                <th>Curtidas</th>
                <th>Comentários</th>
                <th>Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {reels.slice(0, 10).map((reel, index) => {
                const views = (reel.like_count || 0) * 10;
                const engagement = views > 0 ? (((reel.like_count || 0) + (reel.comments_count || 0)) / views * 100).toFixed(1) : '0';
                return (
                  <tr key={reel.id}>
                    <td className="font-medium">Reel {index + 1}</td>
                    <td>{views.toLocaleString()}</td>
                    <td>{(reel.like_count || 0).toLocaleString()}</td>
                    <td>{(reel.comments_count || 0).toLocaleString()}</td>
                    <td>
                      <span className={`tag ${Number(engagement) > 5 ? 'tag-good' : ''}`}>
                        {engagement}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default Reels;