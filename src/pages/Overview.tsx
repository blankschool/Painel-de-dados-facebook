import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { useDateRange } from '@/contexts/DateRangeContext';
import {
  filterMediaByDateRange,
  formatNumberOrDash,
  formatPercent,
  getComputedNumber,
  getSaves,
  getScore,
  getShares,
  type IgMediaItem,
} from '@/utils/ig';
import { 
  Users, 
  Grid3X3, 
  UserPlus,
  Bookmark,
  Share2,
  Trophy,
  Target,
  Eye,
  TrendingUp,
  Clock,
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
  Cell,
  AreaChart,
  Area
} from 'recharts';

const Overview = () => {
  const { data, loading, error } = useDashboardData();
  const { dateRange } = useDateRange();
  const profile = data?.profile ?? null;
  const media = filterMediaByDateRange((data?.media ?? []) as IgMediaItem[], dateRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = profile || media.length > 0;

  // Aggregate metrics
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
  const savesValues = media.map(getSaves).filter((v): v is number => typeof v === 'number');
  const sharesValues = media.map(getShares).filter((v): v is number => typeof v === 'number');
  const reachValues = media.map((m) => getComputedNumber(m, 'reach')).filter((v): v is number => typeof v === 'number');
  const reelsViewsRateValues = media
    .filter((m) => m.media_product_type === 'REELS' || m.media_product_type === 'REEL')
    .map((m) => getComputedNumber(m, 'views_rate'))
    .filter((v): v is number => typeof v === 'number');

  const totalSaves = savesValues.length > 0 ? savesValues.reduce((s, v) => s + v, 0) : null;
  const totalShares = sharesValues.length > 0 ? sharesValues.reduce((s, v) => s + v, 0) : null;

  const scoreTotal = media.reduce((sum, item) => sum + getScore(item), 0);
  const scoreAvg = media.length > 0 ? scoreTotal / media.length : null;

  const erValues = media.map((m) => getComputedNumber(m, 'er')).filter((v): v is number => typeof v === 'number');
  const reachRateValues = media.map((m) => getComputedNumber(m, 'reach_rate')).filter((v): v is number => typeof v === 'number');
  const interactionsPer1000Values = media.map((m) => getComputedNumber(m, 'interactions_per_1000_reach')).filter((v): v is number => typeof v === 'number');

  const avgEr = erValues.length > 0 ? erValues.reduce((s, v) => s + v, 0) / erValues.length : null;
  const avgReachRate = reachRateValues.length > 0 ? reachRateValues.reduce((s, v) => s + v, 0) / reachRateValues.length : null;
  const avgViewsRateReels = reelsViewsRateValues.length > 0 ? reelsViewsRateValues.reduce((s, v) => s + v, 0) / reelsViewsRateValues.length : null;
  const avgInteractionsPer1000 = interactionsPer1000Values.length > 0 ? interactionsPer1000Values.reduce((s, v) => s + v, 0) / interactionsPer1000Values.length : null;

  const bestWindow = (() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const key = `${dt.getDay()}-${dt.getHours()}`;
      const prev = buckets.get(key) ?? { sum: 0, count: 0 };
      prev.sum += getScore(item);
      prev.count += 1;
      buckets.set(key, prev);
    }
    let best: { day: number; hour: number; avg: number; count: number } | null = null;
    for (const [key, v] of buckets) {
      if (v.count === 0) continue;
      const avg = v.sum / v.count;
      const [dayStr, hourStr] = key.split('-');
      const day = Number(dayStr);
      const hour = Number(hourStr);
      if (!best || avg > best.avg) best = { day, hour, avg, count: v.count };
    }
    return best;
  })();

  const weekdayShortPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const bestWindowLabel = bestWindow ? `${weekdayShortPt[bestWindow.day]} ${String(bestWindow.hour).padStart(2, '0')}h` : '--';

  const engagementData = totalLikes > 0 || totalComments > 0 || (totalSaves ?? 0) > 0 || (totalShares ?? 0) > 0 ? [
    { name: 'Curtidas', value: totalLikes, color: 'hsl(var(--primary))' },
    { name: 'Comentários', value: totalComments, color: 'hsl(var(--muted-foreground))' },
    ...(totalSaves ? [{ name: 'Salvos', value: totalSaves, color: 'hsl(var(--accent))' }] : []),
    ...(totalShares ? [{ name: 'Compart.', value: totalShares, color: 'hsl(var(--foreground) / 0.4)' }] : []),
  ] : [];

  const topByScore = [...media].sort((a, b) => getScore(b) - getScore(a)).slice(0, 5);

  // Performance over time (simplified)
  const performanceData = media.slice(0, 14).reverse().map((item, index) => ({
    name: `P${index + 1}`,
    score: getScore(item),
    reach: getComputedNumber(item, 'reach') || 0,
  }));

  if (!hasData) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo das principais métricas e performance do perfil.
          </p>
        </section>

        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Conecte uma conta do Instagram via Facebook para visualizar as métricas do perfil.
          </p>
          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo das principais métricas e performance do perfil.
        </p>
      </section>

      {/* Top KPIs Row - 4 big cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Seguidores"
          value={profile?.followers_count?.toLocaleString() || '--'}
          icon={<Users className="w-5 h-5" />}
          size="large"
        />
        <MetricCard
          label="Posts"
          value={profile?.media_count?.toLocaleString() || media.length.toString()}
          icon={<Grid3X3 className="w-5 h-5" />}
          size="large"
        />
        <MetricCard
          label="ER Médio"
          value={formatPercent(avgEr)}
          icon={<Target className="w-5 h-5" />}
          tooltip="Engagement Rate médio: (likes + comments + saves + shares) ÷ seguidores × 100"
          size="large"
        />
        <MetricCard
          label="Score Total"
          value={scoreTotal > 0 ? Math.round(scoreTotal).toLocaleString() : '--'}
          icon={<Trophy className="w-5 h-5" />}
          tooltip="Score ponderado: likes×1 + comments×2 + saves×3 + shares×4"
          size="large"
        />
      </div>

      {/* Performance Chart - Full Width */}
      {performanceData.length > 0 && performanceData.some(p => p.score > 0) && (
        <ChartCard title="Performance ao Longo do Tempo" subtitle="Score e alcance dos últimos posts">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  name="Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Secondary Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Reach Rate"
          value={formatPercent(avgReachRate)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Reach ÷ seguidores × 100"
        />
        <MetricCard
          label="Views Rate (Reels)"
          value={formatPercent(avgViewsRateReels)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Views ÷ reach × 100 (apenas reels)"
        />
        <MetricCard
          label="Interações / 1k Alcance"
          value={avgInteractionsPer1000 === null ? '--' : Math.round(avgInteractionsPer1000).toLocaleString()}
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Engagement ÷ reach × 1000"
        />
        <MetricCard
          label="Melhor Horário"
          value={bestWindowLabel}
          icon={<Clock className="w-4 h-4" />}
          tooltip={bestWindow ? `Maior score médio (n=${bestWindow.count})` : 'Sem dados'}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement Distribution */}
        {engagementData.length > 0 ? (
          <ChartCard title="Distribuição de Engajamento" subtitle="Por tipo de interação">
            <div className="h-[260px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
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
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {engagementData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-semibold">{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Distribuição de Engajamento" subtitle="Por tipo de interação">
            <div className="h-[260px] flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sem dados de engajamento</p>
            </div>
          </ChartCard>
        )}

        {/* Totals */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Salvos (Total)"
              value={formatNumberOrDash(totalSaves)}
              icon={<Bookmark className="w-4 h-4" />}
            />
            <MetricCard
              label="Compartilhamentos"
              value={formatNumberOrDash(totalShares)}
              icon={<Share2 className="w-4 h-4" />}
            />
            <MetricCard
              label="Score Médio/Post"
              value={scoreAvg === null ? '--' : Math.round(scoreAvg).toLocaleString()}
              icon={<Trophy className="w-4 h-4" />}
            />
            <MetricCard
              label="Seguindo"
              value={profile?.follows_count?.toLocaleString() || '--'}
              icon={<UserPlus className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* Top Posts */}
      {topByScore.length > 0 && (
        <ChartCard title="Top Posts por Score" subtitle="Melhores performances do período">
          <div className="grid gap-3">
            {topByScore.map((item, index) => (
              <a
                key={item.id}
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-lg border border-border/30 bg-background/50 p-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {index + 1}
                </div>
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  {(item.thumbnail_url || item.media_url) ? (
                    <img
                      src={item.thumbnail_url || item.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.caption?.slice(0, 60) || 'Post'}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Score: <strong className="text-foreground">{getScore(item).toLocaleString()}</strong></span>
                    <span>ER: <strong className="text-foreground">{formatPercent(getComputedNumber(item, 'er'))}</strong></span>
                    <span className="tag text-[10px]">{item.media_product_type}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Messages */}
      {data?.messages && data.messages.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-secondary/30">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {data.messages.join(' • ')}
          </p>
        </div>
      )}

      {/* Recent Posts Grid */}
      {media.length > 0 && (
        <ChartCard title="Posts Recentes" subtitle="Últimos posts publicados">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {media.slice(0, 12).map((item) => (
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