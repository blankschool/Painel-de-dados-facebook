import { useMemo, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Heart, MessageCircle, Activity, Loader2 } from 'lucide-react';
import { SortToggle, type SortOrder } from '@/components/ui/SortToggle';
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
  Cell,
} from 'recharts';

const MEDIA_TYPE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--secondary-foreground))',
];

const MEDIA_TYPE_LABELS: Record<string, string> = {
  IMAGE: 'Fotos',
  VIDEO: 'Vídeos',
  REELS: 'Reels',
  CAROUSEL_ALBUM: 'Carrosséis',
};

const Performance = () => {
  const { data, loading } = useDashboardData();
  const profile = data?.profile ?? null;
  const media = data?.media ?? [];

  // Sort states
  const [typeSort, setTypeSort] = useState<SortOrder>("desc");
  const [summarySort, setSummarySort] = useState<SortOrder>("desc");

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

  // Media type distribution from API or calculated
  const mediaTypeDistribution = (data as any)?.media_type_distribution || {};
  const mediaTypeData = Object.entries(mediaTypeDistribution)
    .map(([type, count]) => ({
      name: MEDIA_TYPE_LABELS[type] || type,
      value: count as number,
      type,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalMedia = mediaTypeData.reduce((sum, item) => sum + item.value, 0);

  // Interaction breakdown
  const interactionBreakdown = [
    { type: 'Curtidas', value: totalLikes },
    { type: 'Comentários', value: totalComments },
  ].filter((i) => i.value > 0);

  const interactionTotal = interactionBreakdown.reduce((s, i) => s + i.value, 0) || 1;
  const interactionBreakdownWithPct = interactionBreakdown.map((i) => ({
    ...i,
    percentage: Math.round((i.value / interactionTotal) * 100),
  }));

  // Performance by media type with sorting
  const performanceByType = useMemo(() => {
    const result = Object.keys(mediaTypeDistribution).map(type => {
      const typeMedia = media.filter(m => m.media_type === type);
      const typeLikes = typeMedia.reduce((sum, m) => sum + (m.like_count || 0), 0);
      const typeComments = typeMedia.reduce((sum, m) => sum + (m.comments_count || 0), 0);
      const avgEngagement = typeMedia.length > 0 ? Math.round((typeLikes + typeComments) / typeMedia.length) : 0;
      return {
        name: MEDIA_TYPE_LABELS[type] || type,
        posts: typeMedia.length,
        avgLikes: typeMedia.length > 0 ? Math.round(typeLikes / typeMedia.length) : 0,
        avgComments: typeMedia.length > 0 ? Math.round(typeComments / typeMedia.length) : 0,
        avgEngagement,
      };
    }).filter(item => item.posts > 0);

    return result.sort((a, b) => 
      typeSort === "desc" ? b.avgEngagement - a.avgEngagement : a.avgEngagement - b.avgEngagement
    );
  }, [media, mediaTypeDistribution, typeSort]);

  // Summary data with sorting
  const summaryData = useMemo(() => {
    const items = [
      { metric: 'Curtidas', total: totalLikes, avg: avgLikes, best: Math.max(0, ...media.map((m) => m.like_count || 0)) },
      { metric: 'Comentários', total: totalComments, avg: avgComments, best: Math.max(0, ...media.map((m) => m.comments_count || 0)) },
      { metric: 'Engajamento', total: totalLikes + totalComments, avg: avgLikes + avgComments, best: 0 },
    ];
    return items.sort((a, b) => summarySort === "desc" ? b.total - a.total : a.total - b.total);
  }, [totalLikes, totalComments, avgLikes, avgComments, media, summarySort]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas de desempenho calculadas a partir de {media.length.toLocaleString()} posts.
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Media Type Distribution - Pie Chart */}
        <ChartCard title="Distribuição por Tipo de Mídia" subtitle={`Total: ${totalMedia.toLocaleString()} posts`}>
          <div className="h-[300px]">
            {mediaTypeData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados de distribuição disponíveis.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mediaTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {mediaTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={MEDIA_TYPE_COLORS[index % MEDIA_TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Posts']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
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

      {/* Performance by Media Type - Bar Chart */}
      <ChartCard 
        title="Engajamento Médio por Tipo" 
        subtitle="Comparativo de performance entre formatos"
        actions={
          <SortToggle 
            sortOrder={typeSort} 
            onToggle={() => setTypeSort(o => o === "desc" ? "asc" : "desc")} 
          />
        }
      >
        <div className="h-[300px]">
          {performanceByType.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados suficientes para comparação.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '12px',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [value.toLocaleString('pt-BR'), name === 'avgEngagement' ? 'Engajamento Médio' : name]}
                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                />
                <Bar dataKey="avgEngagement" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Engajamento Médio" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* Performance Summary Table */}
      <ChartCard 
        title="Resumo de Performance por Tipo" 
        subtitle="Métricas detalhadas"
        actions={
          <SortToggle 
            sortOrder={typeSort} 
            onToggle={() => setTypeSort(o => o === "desc" ? "asc" : "desc")} 
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Posts</th>
                <th>Média Curtidas</th>
                <th>Média Comentários</th>
                <th>Engajamento Médio {typeSort === "desc" ? "▼" : "▲"}</th>
              </tr>
            </thead>
            <tbody>
              {performanceByType.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    Sem dados disponíveis.
                  </td>
                </tr>
              ) : (
                performanceByType.map((item) => (
                  <tr key={item.name}>
                    <td className="font-medium">{item.name}</td>
                    <td>{item.posts.toLocaleString()}</td>
                    <td>{item.avgLikes.toLocaleString()}</td>
                    <td>{item.avgComments.toLocaleString()}</td>
                    <td>{item.avgEngagement.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* General Performance Summary */}
      <ChartCard 
        title="Resumo Geral" 
        subtitle="Métricas totais de todos os posts"
        actions={
          <SortToggle 
            sortOrder={summarySort} 
            onToggle={() => setSummarySort(o => o === "desc" ? "asc" : "desc")} 
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Total {summarySort === "desc" ? "▼" : "▲"}</th>
                <th>Média/Post</th>
                <th>Melhor</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((item) => (
                <tr key={item.metric}>
                  <td className="font-medium">{item.metric}</td>
                  <td>{item.total.toLocaleString()}</td>
                  <td>{item.avg.toLocaleString()}</td>
                  <td>{item.best > 0 ? item.best.toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default Performance;
