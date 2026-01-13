import { useMemo, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import { FiltersBar } from '@/components/layout/FiltersBar';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Clock,
  Eye,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Loader2,
  Instagram,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

const COLORS = {
  followers: 'hsl(217, 91%, 60%)',
  nonFollowers: 'hsl(262, 83%, 58%)',
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
};

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  padding: '12px',
};

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

const Profile = () => {
  const { data, loading, forceRefresh } = useDashboardData();
  const { selectedAccount } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const profile = data?.profile;

  const handleRefresh = async () => {
    setRefreshing(true);
    forceRefresh();
    setRefreshing(false);
  };

  // Mock data for profile metrics (these would come from API)
  // In reality, you'd get these from instagram_daily_insights table
  const profileVisitsData = useMemo(() => {
    // Generate sample data - in production this comes from daily insights
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        visits: Math.floor(Math.random() * 500) + 100,
        followers: Math.floor(Math.random() * 300) + 50,
        nonFollowers: Math.floor(Math.random() * 200) + 50,
      });
    }
    return result;
  }, []);

  // Calculate totals from the data
  const totals = useMemo(() => {
    const visits = profileVisitsData.reduce((sum, d) => sum + d.visits, 0);
    const maxVisits = Math.max(...profileVisitsData.map(d => d.visits));
    const avgVisits = Math.round(visits / profileVisitsData.length);
    const followersViews = profileVisitsData.reduce((sum, d) => sum + d.followers, 0);
    const nonFollowersViews = profileVisitsData.reduce((sum, d) => sum + d.nonFollowers, 0);
    const totalViews = followersViews + nonFollowersViews;

    return {
      totalVisits: visits,
      maxVisits,
      avgVisits,
      followersViews,
      nonFollowersViews,
      totalViews,
      followersPercent: totalViews > 0 ? Math.round((followersViews / totalViews) * 100) : 0,
      nonFollowersPercent: totalViews > 0 ? Math.round((nonFollowersViews / totalViews) * 100) : 0,
    };
  }, [profileVisitsData]);

  // Reach distribution data
  const reachDistribution = useMemo(() => [
    { name: 'Seguidores', value: totals.followersPercent, fill: COLORS.followers },
    { name: 'Não Seguidores', value: totals.nonFollowersPercent, fill: COLORS.nonFollowers },
  ], [totals]);

  // Accounts engaged data
  const accountsEngagedData = useMemo(() => {
    return profileVisitsData.map(d => ({
      ...d,
      engaged: Math.floor(d.visits * 0.3 + Math.random() * 50),
    }));
  }, [profileVisitsData]);

  const totalEngaged = accountsEngagedData.reduce((sum, d) => sum + d.engaged, 0);
  const avgEngaged = Math.round(totalEngaged / accountsEngagedData.length);
  const maxEngaged = Math.max(...accountsEngagedData.map(d => d.engaged));

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
          <h1 className="text-xl font-bold tracking-tight">Perfil</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Métricas de visualizações e alcance do seu perfil.
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

      {/* Profile Card */}
      <div className="chart-card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            {profile?.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-border object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <Instagram className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {profile?.name || profile?.username || 'Instagram Profile'}
                </h2>
                {profile?.username && (
                  <p className="text-muted-foreground">@{profile.username}</p>
                )}
              </div>
              {profile?.username && (
                <a
                  href={`https://instagram.com/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-2xl font-bold">{formatNumber(profile?.followers_count)}</p>
                <p className="text-sm text-muted-foreground">Seguidores</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(profile?.follows_count)}</p>
                <p className="text-sm text-muted-foreground">Seguindo</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(profile?.media_count)}</p>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Visitas ao Perfil"
          value={formatNumber(totals.totalVisits)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Total de visitas ao perfil no período"
        />
        <MetricCard
          label="Máx. Visitas/Dia"
          value={formatNumber(totals.maxVisits)}
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Maior número de visitas em um único dia"
        />
        <MetricCard
          label="Média Visitas/Dia"
          value={formatNumber(totals.avgVisits)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Média de visitas diárias ao perfil"
        />
        <MetricCard
          label="Contas Engajadas"
          value={formatNumber(totalEngaged)}
          icon={<Users className="w-4 h-4" />}
          tooltip="Total de contas que interagiram com seu conteúdo"
        />
      </div>

      {/* Profile Visits Chart */}
      <ChartCard
        title="Visitas ao Perfil"
        subtitle="Visualizações diárias do seu perfil"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profileVisitsData}>
              <defs>
                <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="visits"
                name="Visitas"
                stroke="hsl(var(--primary))"
                fill="url(#visitsGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Views breakdown + Reach Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views by Follower Status */}
        <ChartCard
          title="Views por Tipo de Seguidor"
          subtitle="Seguidores vs Não Seguidores"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profileVisitsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar
                  dataKey="followers"
                  name="Seguidores"
                  fill={COLORS.followers}
                  stackId="stack"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="nonFollowers"
                  name="Não Seguidores"
                  fill={COLORS.nonFollowers}
                  stackId="stack"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Reach Distribution Pie */}
        <ChartCard
          title="Distribuição de Alcance"
          subtitle="Proporção de visualizações por tipo"
        >
          <div className="flex items-center gap-8 h-64">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reachDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {reachDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-4">
              {reachDistribution.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-lg font-bold">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.value}%`, backgroundColor: item.fill }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Accounts Engaged */}
      <ChartCard
        title="Contas Engajadas"
        subtitle="Contas únicas que interagiram com seu conteúdo"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{formatNumber(totalEngaged)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">Máximo/Dia</p>
            <p className="text-2xl font-bold">{formatNumber(maxEngaged)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">Média/Dia</p>
            <p className="text-2xl font-bold">{formatNumber(avgEngaged)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">Taxa de Engajamento</p>
            <p className="text-2xl font-bold">
              {profile?.followers_count
                ? `${((totalEngaged / profile.followers_count) * 100).toFixed(1)}%`
                : '--'}
            </p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accountsEngagedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="engaged"
                name="Contas Engajadas"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Note about data */}
      <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <strong>Nota:</strong> Algumas métricas como Profile Visits, Views por tipo de seguidor e 
        Accounts Engaged requerem dados históricos do Instagram Insights API. Os gráficos acima 
        mostram dados de demonstração. Conecte os dados reais através da tabela 
        `instagram_daily_insights` para visualizar suas métricas reais.
      </div>
    </div>
  );
};

export default Profile;
