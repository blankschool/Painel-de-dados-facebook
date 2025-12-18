import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Heart, MessageCircle, Activity, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

const Performance = () => {
  const { data, loading } = useDashboardData();
  const profile = data?.profile ?? null;
  const media = data?.media ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate performance metrics from media
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
  const avgLikes = media.length > 0 ? Math.round(totalLikes / media.length) : 0;
  const avgComments = media.length > 0 ? Math.round(totalComments / media.length) : 0;
  const engagementRate = profile?.followers_count && media.length > 0
    ? (((totalLikes + totalComments) / media.length / profile.followers_count) * 100).toFixed(2)
    : '0';

  // IMPORTANT: no mock data. Only render charts when real metrics exist in the API response.
  const performanceOverTime: Array<{ date: string; impressions: number; reach: number; engagement: number }> =
    Array.isArray((data as any)?.performance_over_time) ? (data as any).performance_over_time : [];

  const radarData: Array<{ metric: string; value: number; fullMark: number }> =
    Array.isArray((data as any)?.performance_radar) ? (data as any).performance_radar : [];

  const interactionBreakdown = [
    { type: 'Curtidas', value: totalLikes },
    { type: 'Comentários', value: totalComments },
  ].filter((i) => i.value > 0);

  const interactionTotal = interactionBreakdown.reduce((s, i) => s + i.value, 0) || 1;
  const interactionBreakdownWithPct = interactionBreakdown.map((i) => ({
    ...i,
    percentage: Math.round((i.value / interactionTotal) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas de desempenho e alcance do perfil no período.
          </p>
        </div>
      </section>

      {/* Performance KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Taxa de Engajamento"
          value={`${engagementRate}%`}
          icon={<Heart className="w-4 h-4" />}
        />
        <MetricCard
          label="Média de Curtidas"
          value={avgLikes.toLocaleString()}
          icon={<Heart className="w-4 h-4" />}
        />
        <MetricCard
          label="Média de Comentários"
          value={avgComments.toLocaleString()}
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <MetricCard
          label="Total Interações"
          value={(totalLikes + totalComments).toLocaleString()}
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Performance Over Time */}
      <ChartCard title="Performance ao Longo do Tempo" subtitle="Impressões, Alcance e Engajamento">
        <div className="h-[300px]">
          {performanceOverTime.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados de série temporal (impressões/alcance) disponíveis para este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Impressões"
                />
                <Line
                  type="monotone"
                  dataKey="reach"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  name="Alcance"
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  name="Engajamento"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Radar Chart */}
        <ChartCard title="Análise de Performance" subtitle="Comparativo de métricas">
          <div className="h-[300px]">
            {radarData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados suficientes para análise comparativa.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Interaction Breakdown */}
          <ChartCard title="Tipos de Interação" subtitle="Distribuição por tipo">
            <div className="space-y-4 p-2">
              {interactionBreakdownWithPct.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Sem interações no período.
                </div>
              ) : (
                interactionBreakdownWithPct.map((item) => (
                  <div key={item.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.type}</span>
                      <span className="text-muted-foreground">
                        {item.value.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
      </div>

      {/* Performance Summary */}
      <ChartCard title="Resumo de Performance" subtitle="Métricas detalhadas do período">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Total</th>
                <th>Média/Post</th>
                <th>Melhor</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Curtidas</td>
                <td>{totalLikes.toLocaleString()}</td>
                <td>{avgLikes.toLocaleString()}</td>
                <td>{Math.max(0, ...media.map((m) => m.like_count || 0)).toLocaleString()}</td>
                <td>-</td>
              </tr>
              <tr>
                <td className="font-medium">Comentários</td>
                <td>{totalComments.toLocaleString()}</td>
                <td>{avgComments.toLocaleString()}</td>
                <td>{Math.max(0, ...media.map((m) => m.comments_count || 0)).toLocaleString()}</td>
                <td>-</td>
              </tr>
              <tr>
                <td className="font-medium">Engajamento</td>
                <td>{(totalLikes + totalComments).toLocaleString()}</td>
                <td>{(avgLikes + avgComments).toLocaleString()}</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default Performance;
