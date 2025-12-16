import { useInstagram } from '@/contexts/InstagramContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Users, 
  Grid3X3, 
  Heart, 
  MessageCircle, 
  TrendingUp,
  Eye,
  UserPlus,
  UserMinus,
  BarChart3,
  Loader2
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  const { profile, media, loading } = useInstagram();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate engagement metrics from media
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
  const avgEngagement = media.length > 0 
    ? ((totalLikes + totalComments) / media.length / (profile?.followers_count || 1) * 100).toFixed(2)
    : '0';

  // Mock data for charts (will be replaced with real API data)
  const followerGrowthData = [
    { date: 'Seg', followers: 1000, gained: 50, lost: 10 },
    { date: 'Ter', followers: 1040, gained: 60, lost: 20 },
    { date: 'Qua', followers: 1080, gained: 55, lost: 15 },
    { date: 'Qui', followers: 1120, gained: 70, lost: 30 },
    { date: 'Sex', followers: 1160, gained: 80, lost: 40 },
    { date: 'Sáb', followers: 1200, gained: 65, lost: 25 },
    { date: 'Dom', followers: 1240, gained: 75, lost: 35 },
  ];

  const engagementData = [
    { name: 'Curtidas', value: totalLikes, color: 'hsl(var(--primary))' },
    { name: 'Comentários', value: totalComments, color: 'hsl(var(--muted-foreground))' },
  ];

  const recentPostsPerformance = media.slice(0, 7).map((item, index) => ({
    post: `Post ${index + 1}`,
    likes: item.like_count || 0,
    comments: item.comments_count || 0,
    engagement: ((item.like_count || 0) + (item.comments_count || 0)),
  }));

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

      {/* Main KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Seguidores"
          value={profile?.followers_count?.toLocaleString() || '0'}
          icon={<Users className="w-4 h-4" />}
          delta={{ value: '+2.4%', positive: true }}
        />
        <MetricCard
          label="Seguindo"
          value={profile?.follows_count?.toLocaleString() || '0'}
          icon={<UserPlus className="w-4 h-4" />}
        />
        <MetricCard
          label="Posts"
          value={profile?.media_count?.toLocaleString() || '0'}
          icon={<Grid3X3 className="w-4 h-4" />}
        />
        <MetricCard
          label="Engajamento"
          value={`${avgEngagement}%`}
          icon={<Heart className="w-4 h-4" />}
          delta={{ value: '+0.5%', positive: true }}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Follower Growth */}
        <ChartCard title="Crescimento de Seguidores" subtitle="Últimos 7 dias">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={followerGrowthData}>
                <defs>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="followers" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorFollowers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Engagement Distribution */}
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
      </div>

      {/* Recent Posts Performance */}
      <ChartCard title="Performance dos Posts Recentes" subtitle="Últimos 7 posts">
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

      {/* Recent Posts Preview */}
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
    </div>
  );
};

export default Overview;