import { useEffect, useState } from 'react';
import { useInsights } from '@/hooks/useInsights';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Eye,
  Users,
  MessageCircle,
  LogOut,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Stories = () => {
  const { connectedAccounts } = useAuth();
  const { loading, error, data, fetchInsights } = useInsights();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const hasAccount = connectedAccounts && connectedAccounts.length > 0;

  useEffect(() => {
    if (hasAccount && !data) {
      handleRefresh();
    }
  }, [hasAccount]);

  const handleRefresh = async () => {
    const result = await fetchInsights();
    if (result) {
      setLastUpdated(new Date().toLocaleString('pt-BR'));
    }
  };

  const exportCSV = () => {
    if (!data?.stories?.length) return;
    
    const headers = ['ID', 'Timestamp', 'Type', 'Impressions', 'Reach', 'Replies', 'Exits', 'Taps Forward', 'Taps Back', 'Completion Rate'];
    const rows = data.stories.map((s: any) => [
      s.id,
      s.timestamp,
      s.media_type,
      s.insights?.impressions || 0,
      s.insights?.reach || 0,
      s.insights?.replies || 0,
      s.insights?.exits || 0,
      s.insights?.taps_forward || 0,
      s.insights?.taps_back || 0,
      `${s.insights?.completion_rate || 0}%`,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stories-${data.snapshot_date}.csv`;
    a.click();
  };

  if (!hasAccount) {
    return (
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-3 py-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Stories</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Métricas completas de stories: impressões, alcance, respostas e saídas.
            </p>
          </div>
        </section>
        <div className="chart-card p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Conecte sua conta do Instagram para ver a análise de stories.</p>
        </div>
      </div>
    );
  }

  const stories = data?.stories || [];
  const agg = data?.stories_aggregate || {
    total_stories: 0,
    total_impressions: 0,
    total_reach: 0,
    total_replies: 0,
    total_exits: 0,
    total_taps_forward: 0,
    total_taps_back: 0,
    avg_completion_rate: 0,
  };

  const exitRate = agg.total_impressions > 0 
    ? Math.round((agg.total_exits / agg.total_impressions) * 100) 
    : 0;

  const avgReach = agg.total_stories > 0 
    ? Math.round(agg.total_reach / agg.total_stories) 
    : 0;

  // Chart data for actions distribution
  const actionsData = [
    { name: 'Avançar', value: agg.total_taps_forward, fill: 'hsl(var(--primary))' },
    { name: 'Voltar', value: agg.total_taps_back, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Respostas', value: agg.total_replies, fill: 'hsl(var(--foreground) / 0.6)' },
    { name: 'Saídas', value: agg.total_exits, fill: 'hsl(var(--foreground) / 0.3)' },
  ];

  // Rankings
  const topReach = [...stories].sort((a: any, b: any) => (b.insights?.reach || 0) - (a.insights?.reach || 0)).slice(0, 5);
  const topReplies = [...stories].sort((a: any, b: any) => (b.insights?.replies || 0) - (a.insights?.replies || 0)).slice(0, 5);
  const lowestExit = [...stories].sort((a: any, b: any) => (a.insights?.exits || 0) - (b.insights?.exits || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas completas de stories: impressões, alcance, respostas e saídas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="chip">
              <span className="text-muted-foreground">Atualizado</span>
              <strong className="font-semibold">{lastUpdated}</strong>
            </div>
          )}
          <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {stories.length > 0 && (
            <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </section>

      {loading && !data && (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="chart-card p-6 border-destructive/50">
          <p className="text-destructive text-sm">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Dados podem levar até 48h para aparecer. Certifique-se de que sua conta é Business ou Creator.
          </p>
        </div>
      )}

      {!loading && stories.length === 0 && (
        <div className="chart-card p-8 text-center">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum story ativo</h3>
          <p className="text-muted-foreground text-sm">
            Não há stories ativos nas últimas 24 horas. Stories expiram após 24 horas.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Main KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Stories Ativos"
              value={agg.total_stories.toString()}
              icon={<Layers className="w-4 h-4" />}
              tooltip="Stories publicados nas últimas 24 horas"
            />
            <MetricCard
              label="Alcance Médio"
              value={avgReach.toLocaleString()}
              icon={<Users className="w-4 h-4" />}
              tooltip="Média de contas alcançadas por story"
            />
            <MetricCard
              label="Impressões"
              value={agg.total_impressions.toLocaleString()}
              icon={<Eye className="w-4 h-4" />}
              tooltip="Total de visualizações de todos os stories"
            />
            <MetricCard
              label="Respostas"
              value={agg.total_replies.toLocaleString()}
              icon={<MessageCircle className="w-4 h-4" />}
              tooltip="Total de respostas recebidas nos stories"
            />
            <MetricCard
              label="Taxa de Saída"
              value={`${exitRate}%`}
              icon={<LogOut className="w-4 h-4" />}
              tooltip="Percentual de pessoas que saíram antes de terminar"
            />
            <MetricCard
              label="Taxa de Conclusão"
              value={`${agg.avg_completion_rate}%`}
              icon={<CheckCircle className="w-4 h-4" />}
              tooltip="Percentual de pessoas que assistiram até o final"
            />
          </div>

          {/* Actions Distribution Chart */}
          {stories.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Distribuição de Ações" subtitle="Interações em todos os stories">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }} 
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Mini Gallery */}
              <ChartCard title="Stories Ativos" subtitle="Clique para ver detalhes">
                <div className="grid grid-cols-4 gap-2">
                  {stories.slice(0, 8).map((story: any) => (
                    <a
                      key={story.id}
                      href={story.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-[9/16] rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity relative group"
                    >
                      {(story.media_url || story.thumbnail_url) ? (
                        <img 
                          src={story.thumbnail_url || story.media_url} 
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layers className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <div className="text-background text-[10px] space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {story.insights?.reach || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {story.insights?.replies || 0}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </ChartCard>
            </div>
          )}

          {/* Stories Table */}
          {stories.length > 0 && (
            <ChartCard title="Detalhes dos Stories" subtitle="Métricas individuais de cada story">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Data/Hora</th>
                      <th>Tipo</th>
                      <th>Impressões</th>
                      <th>Alcance</th>
                      <th>Respostas</th>
                      <th>Saídas</th>
                      <th>
                        <span className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Avançar
                        </span>
                      </th>
                      <th>
                        <span className="flex items-center gap-1">
                          <ArrowLeft className="w-3 h-3" />
                          Voltar
                        </span>
                      </th>
                      <th>Conclusão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.map((story: any) => (
                      <tr key={story.id}>
                        <td>
                          <a href={story.permalink} target="_blank" rel="noopener noreferrer">
                            {(story.thumbnail_url || story.media_url) ? (
                              <img 
                                src={story.thumbnail_url || story.media_url} 
                                alt="Story" 
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-secondary rounded flex items-center justify-center">
                                <Layers className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </a>
                        </td>
                        <td>{new Date(story.timestamp).toLocaleString('pt-BR')}</td>
                        <td>
                          <span className="tag">
                            {story.media_type === 'VIDEO' ? 'Vídeo' : 'Imagem'}
                          </span>
                        </td>
                        <td className="font-medium">{(story.insights?.impressions || 0).toLocaleString()}</td>
                        <td className="font-medium">{(story.insights?.reach || 0).toLocaleString()}</td>
                        <td>{(story.insights?.replies || 0).toLocaleString()}</td>
                        <td>{(story.insights?.exits || 0).toLocaleString()}</td>
                        <td>{(story.insights?.taps_forward || 0).toLocaleString()}</td>
                        <td>{(story.insights?.taps_back || 0).toLocaleString()}</td>
                        <td>
                          <span className={`font-medium ${(story.insights?.completion_rate || 0) >= 70 ? 'text-green-600' : ''}`}>
                            {story.insights?.completion_rate || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {/* Rankings */}
          {stories.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard title="Maior Alcance" subtitle="Top 5 stories">
                <div className="space-y-2">
                  {topReach.map((story: any, idx: number) => (
                    <div key={story.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <span className="text-lg font-bold text-muted-foreground">{idx + 1}</span>
                      {(story.thumbnail_url || story.media_url) ? (
                        <img src={story.thumbnail_url || story.media_url} alt="" className="w-8 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-12 bg-secondary rounded" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{(story.insights?.reach || 0).toLocaleString()} alcance</p>
                        <p className="text-xs text-muted-foreground">{new Date(story.timestamp).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Mais Respostas" subtitle="Top 5 stories">
                <div className="space-y-2">
                  {topReplies.map((story: any, idx: number) => (
                    <div key={story.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <span className="text-lg font-bold text-muted-foreground">{idx + 1}</span>
                      {(story.thumbnail_url || story.media_url) ? (
                        <img src={story.thumbnail_url || story.media_url} alt="" className="w-8 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-12 bg-secondary rounded" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{(story.insights?.replies || 0).toLocaleString()} respostas</p>
                        <p className="text-xs text-muted-foreground">{new Date(story.timestamp).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Menor Taxa de Saída" subtitle="Top 5 stories">
                <div className="space-y-2">
                  {lowestExit.map((story: any, idx: number) => (
                    <div key={story.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <span className="text-lg font-bold text-muted-foreground">{idx + 1}</span>
                      {(story.thumbnail_url || story.media_url) ? (
                        <img src={story.thumbnail_url || story.media_url} alt="" className="w-8 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-12 bg-secondary rounded" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{(story.insights?.exits || 0).toLocaleString()} saídas</p>
                        <p className="text-xs text-muted-foreground">{story.insights?.completion_rate || 0}% conclusão</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          )}

          {/* Messages */}
          {data.messages && data.messages.length > 0 && (
            <div className="p-4 bg-secondary/50 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {data.messages.join(' • ')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Stories;
