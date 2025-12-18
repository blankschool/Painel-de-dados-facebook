import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
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
  const media = data?.media ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter reels/videos from media
  const reels = media.filter(item => item.media_type === 'VIDEO' || item.media_type === 'REELS');
  const hasReels = reels.length > 0;

  // Calculate metrics from real data only
  const totalLikes = reels.reduce((sum, reel) => sum + (reel.like_count || 0), 0);
  const totalComments = reels.reduce((sum, reel) => sum + (reel.comments_count || 0), 0);

  // Real performance data from API
  const reelsPerformance = reels.slice(0, 10).map((reel, index) => ({
    name: `Reel ${index + 1}`,
    likes: reel.like_count || 0,
    comments: reel.comments_count || 0,
  }));

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
          value="--"
          icon={<Eye className="w-4 h-4" />}
          tooltip="Visualizações requerem permissões adicionais da API do Instagram."
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
          <ChartCard title="Performance dos Reels" subtitle="Engajamento por reel">
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
                  <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Curtidas" />
                  <Bar dataKey="comments" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Comentários" />
                </BarChart>
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
