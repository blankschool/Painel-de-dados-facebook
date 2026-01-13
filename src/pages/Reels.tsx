import { useDashboardData } from '@/hooks/useDashboardData';
import { useFilteredMedia } from '@/hooks/useFilteredMedia';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { FiltersBar } from '@/components/layout/FiltersBar';
import { formatNumberOrDash, getViews, isReel } from '@/utils/ig';
import { 
  Play, 
  Eye,
  Heart,
  MessageCircle,
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
  Legend
} from 'recharts';

const Reels = () => {
  const { data, loading, error } = useDashboardData();
  const { selectedAccount } = useAuth();
  const allMedia = data?.media ?? [];
  const timezone = selectedAccount?.timezone || "America/Sao_Paulo";
  const media = useFilteredMedia(allMedia, timezone);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter reels/videos from media
  const reels = media.filter((item) => isReel(item));
  const hasReels = reels.length > 0;

  // Calculate metrics from real data only
  const totalLikes = reels.reduce((sum, reel) => sum + (reel.like_count || 0), 0);
  const totalComments = reels.reduce((sum, reel) => sum + (reel.comments_count || 0), 0);
  const viewsValues = reels.map((r) => getViews(r)).filter((v): v is number => typeof v === 'number');
  const totalViews = viewsValues.length > 0 ? viewsValues.reduce((s, v) => s + v, 0) : null;

  const rankedByViews = data?.top_reels_by_views?.length ? data.top_reels_by_views : reels;
  const topReels = rankedByViews.slice(0, 10);

  // Real performance data from API
  const reelsPerformance = topReels.map((reel, index) => ({
    name: `Reel ${index + 1}`,
    views: getViews(reel) ?? 0,
    likes: reel.like_count || 0,
    comments: reel.comments_count || 0,
  }));
  const hasViews = reelsPerformance.some((r) => r.views > 0);

  return (
    <div className="space-y-6">
      <FiltersBar showMediaType />

      {/* KPIs - Real data only */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de Reels"
          value={reels.length.toLocaleString()}
          icon={<Play className="w-4 h-4" />}
        />
        <MetricCard
          label="Total de Curtidas"
          value={totalLikes.toLocaleString()}
          icon={<Heart className="w-4 h-4" />}
        />
        <MetricCard
          label="Total de Comentários"
          value={totalComments.toLocaleString()}
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <MetricCard
          label="Visualizações"
          value={formatNumberOrDash(totalViews)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Views/plays/video_views normalizados quando disponíveis. Para alguns formatos/períodos, pode ficar indisponível."
        />
      </div>

      {!hasReels ? (
        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum reel encontrado</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Não foram encontrados reels ou vídeos na conta conectada. 
            Conecte uma conta com conteúdo em vídeo para ver as métricas.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>
      ) : (
        <>
          {/* Performance Chart */}
          <ChartCard title="Performance dos Reels" subtitle={hasViews ? "Views e interações (top reels)" : "Interações (top reels)"}>
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
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR'), '']}
                    cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                  />
                  <Legend />
                  {hasViews && <Bar dataKey="views" fill="hsl(var(--foreground) / 0.35)" radius={[4, 4, 0, 0]} name="Views" />}
                  <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Curtidas" />
                  <Bar dataKey="comments" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Comentários" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Top Reels */}
          <ChartCard title="Top Reels" subtitle={hasViews ? "Ordenado por views" : "Ordenado por relevância"}>
            <div className="space-y-3">
              {topReels.slice(0, 5).map((reel, index) => (
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
                      {getViews(reel) !== null && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {getViews(reel)!.toLocaleString()}
                        </span>
                      )}
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

          {/* Comparison Table */}
          <ChartCard title="Comparativo de Métricas" subtitle="Análise detalhada dos reels">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reel</th>
                    <th>Curtidas</th>
                    <th>Comentários</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {reels.slice(0, 10).map((reel, index) => (
                    <tr key={reel.id}>
                      <td className="font-medium">Reel {index + 1}</td>
                      <td>{(reel.like_count || 0).toLocaleString()}</td>
                      <td>{(reel.comments_count || 0).toLocaleString()}</td>
                      <td className="text-xs">
                        {reel.timestamp ? new Date(reel.timestamp).toLocaleDateString('pt-BR') : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Reels;
