import { useMemo, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { FiltersBar } from '@/components/layout/FiltersBar';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/button';
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

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
  const [refreshing, setRefreshing] = useState(false);

  const profile = data?.profile;

  const handleRefresh = async () => {
    setRefreshing(true);
    forceRefresh();
    setRefreshing(false);
  };

  const dailyInsights = data?.daily_insights ?? [];
  const consolidatedProfileViews = typeof data?.consolidated_profile_views === "number" ? data.consolidated_profile_views : null;

  const profileVisitsData = useMemo(() => {
    if (!dailyInsights.length) return [];
    return dailyInsights.map((row) => ({
      date: new Date(row.insight_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      visits: row.profile_views ?? 0,
    }));
  }, [dailyInsights]);

  // Calculate totals from the data
  const totals = useMemo(() => {
    if (!profileVisitsData.length) {
      return {
        totalVisits: consolidatedProfileViews,
        maxVisits: null,
        avgVisits: null,
      };
    }
    const visits = profileVisitsData.reduce((sum, d) => sum + d.visits, 0);
    const maxVisits = Math.max(...profileVisitsData.map(d => d.visits));
    const avgVisits = Math.round(visits / profileVisitsData.length);

    return {
      totalVisits: visits,
      maxVisits,
      avgVisits,
    };
  }, [profileVisitsData, consolidatedProfileViews]);

  const visitRate =
    profile?.followers_count && typeof totals.totalVisits === "number"
      ? (totals.totalVisits / profile.followers_count) * 100
      : null;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Métricas de visualizações e alcance do seu perfil.
        </p>
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
      </div>

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
          label="Taxa de Visita"
          value={visitRate !== null ? `${visitRate.toFixed(1)}%` : "--"}
          icon={<Users className="w-4 h-4" />}
          tooltip="Visitas ao perfil ÷ seguidores × 100"
        />
      </div>

      {/* Profile Visits Chart */}
      <ChartCard
        title="Visitas ao Perfil"
        subtitle="Visualizações diárias do seu perfil"
      >
        <div className="h-64">
          {profileVisitsData.length > 0 ? (
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
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Eye className="w-10 h-10 mb-2 opacity-60" />
              <p className="text-sm font-medium">Sem dados de visitas</p>
              <p className="text-xs">Aguardando histórico diário do Instagram.</p>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Views breakdown + Reach Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views by Follower Status */}
        <ChartCard
          title="Views por Tipo de Seguidor"
          subtitle="Seguidores vs Não Seguidores"
        >
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground text-center">
            <UserCheck className="w-10 h-10 mb-2 opacity-60" />
            <p className="text-sm font-medium">Breakdown indisponível</p>
            <p className="text-xs max-w-xs">
              O Instagram não fornece esta divisão para todas as contas.
            </p>
          </div>
        </ChartCard>

        {/* Reach Distribution Pie */}
        <ChartCard
          title="Distribuição de Alcance"
          subtitle="Proporção de visualizações por tipo"
        >
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground text-center">
            <UserX className="w-10 h-10 mb-2 opacity-60" />
            <p className="text-sm font-medium">Sem dados suficientes</p>
            <p className="text-xs max-w-xs">
              Ative métricas avançadas para visualizar esta divisão.
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Accounts Engaged */}
      <ChartCard
        title="Contas Engajadas"
        subtitle="Contas únicas que interagiram com seu conteúdo"
      >
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground text-center">
          <Users className="w-10 h-10 mb-2 opacity-60" />
          <p className="text-sm font-medium">Métrica indisponível</p>
          <p className="text-xs max-w-xs">
            O Instagram não fornece contas engajadas para este período.
          </p>
        </div>
      </ChartCard>

      {/* Note about data */}
      <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <strong>Nota:</strong> Algumas métricas dependem do Instagram Insights e podem levar alguns
        dias para aparecer. Quando houver histórico suficiente, os gráficos serão preenchidos.
      </div>
    </div>
  );
};

export default Profile;
