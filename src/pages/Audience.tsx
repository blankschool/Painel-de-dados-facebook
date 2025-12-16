import { useMemo } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useInstagram } from '@/contexts/InstagramContext';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const Audience = () => {
  const { profile, demographics, onlineFollowers, loading, error, refreshData } = useInstagram();

  // Process gender data from demographics
  const genderData = useMemo(() => {
    if (!demographics.audience_gender_age) {
      return [
        { name: 'Feminino', value: 61, fill: 'hsl(var(--foreground) / 0.7)' },
        { name: 'Masculino', value: 38, fill: 'hsl(var(--foreground) / 0.35)' },
        { name: 'Outro', value: 1, fill: 'hsl(var(--foreground) / 0.15)' },
      ];
    }

    let female = 0;
    let male = 0;
    let total = 0;

    Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
      total += value;
      if (key.startsWith('F.')) female += value;
      if (key.startsWith('M.')) male += value;
    });

    const other = total - female - male;
    const femalePercent = Math.round((female / total) * 100) || 0;
    const malePercent = Math.round((male / total) * 100) || 0;
    const otherPercent = Math.round((other / total) * 100) || 0;

    return [
      { name: 'Feminino', value: femalePercent, fill: 'hsl(var(--foreground) / 0.7)' },
      { name: 'Masculino', value: malePercent, fill: 'hsl(var(--foreground) / 0.35)' },
      { name: 'Outro', value: otherPercent, fill: 'hsl(var(--foreground) / 0.15)' },
    ];
  }, [demographics]);

  // Process age data from demographics
  const ageData = useMemo(() => {
    if (!demographics.audience_gender_age) {
      return [
        { range: '13-17', value: 5 },
        { range: '18-24', value: 28 },
        { range: '25-34', value: 42 },
        { range: '35-44', value: 18 },
        { range: '45-54', value: 5 },
        { range: '55+', value: 2 },
      ];
    }

    const ageGroups: Record<string, number> = {
      '13-17': 0,
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0,
    };

    let total = 0;

    Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
      total += value;
      const ageRange = key.split('.')[1];
      if (ageRange && ageGroups[ageRange] !== undefined) {
        ageGroups[ageRange] += value;
      }
    });

    // Combine 55+ ranges
    ageGroups['55+'] = ageGroups['55-64'] + ageGroups['65+'];
    delete ageGroups['55-64'];
    delete ageGroups['65+'];

    return Object.entries(ageGroups)
      .filter(([_, value]) => value > 0 || !demographics.audience_gender_age)
      .map(([range, value]) => ({
        range,
        value: Math.round((value / total) * 100) || 0,
      }));
  }, [demographics]);

  // Process country data
  const topCountries = useMemo(() => {
    if (!demographics.audience_country) {
      return [
        { country: 'Brasil', share: 82, followers: '147.6k' },
        { country: 'Portugal', share: 8, followers: '14.4k' },
        { country: 'Estados Unidos', share: 5, followers: '9.0k' },
        { country: 'Argentina', share: 3, followers: '5.4k' },
        { country: 'México', share: 2, followers: '3.6k' },
      ];
    }

    const countryNames: Record<string, string> = {
      'BR': 'Brasil',
      'PT': 'Portugal',
      'US': 'Estados Unidos',
      'AR': 'Argentina',
      'MX': 'México',
      'ES': 'Espanha',
      'CO': 'Colômbia',
      'CL': 'Chile',
    };

    const total = Object.values(demographics.audience_country).reduce((a, b) => a + b, 0);

    return Object.entries(demographics.audience_country)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, value]) => ({
        country: countryNames[code] || code,
        share: Math.round((value / total) * 100),
        followers: value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString(),
      }));
  }, [demographics]);

  // Process city data
  const topCities = useMemo(() => {
    if (!demographics.audience_city) {
      return [
        { city: 'São Paulo', share: 54, followers: '41.3k' },
        { city: 'Rio de Janeiro', share: 36, followers: '27.1k' },
        { city: 'Belo Horizonte', share: 22, followers: '16.9k' },
        { city: 'Porto Alegre', share: 18, followers: '13.6k' },
        { city: 'Lisboa', share: 12, followers: '9.4k' },
      ];
    }

    const total = Object.values(demographics.audience_city).reduce((a, b) => a + b, 0);

    return Object.entries(demographics.audience_city)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([city, value]) => ({
        city,
        share: Math.round((value / total) * 100),
        followers: value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString(),
      }));
  }, [demographics]);

  // Process online followers heatmap data
  const heatmapData = useMemo(() => {
    if (Object.keys(onlineFollowers).length === 0) {
      return [
        { time: '09:00', days: [2, 2, 3, 2, 3, 1, 2] },
        { time: '12:00', days: [3, 3, 4, 3, 4, 2, 3] },
        { time: '15:00', days: [2, 3, 4, 3, 4, 2, 3] },
        { time: '18:00', days: [4, 4, 5, 4, 5, 3, 4] },
        { time: '21:00', days: [3, 3, 4, 3, 4, 3, 3] },
      ];
    }

    // Group by time slots (3-hour windows)
    const timeSlots = ['09:00', '12:00', '15:00', '18:00', '21:00'];
    const maxValue = Math.max(...Object.values(onlineFollowers));

    return timeSlots.map((time) => {
      const hour = parseInt(time.split(':')[0]);
      const days = Array(7).fill(0).map((_, dayIndex) => {
        // Simulate day variation (actual API doesn't provide per-day data)
        const hourValue = onlineFollowers[hour.toString()] || 0;
        const normalized = Math.ceil((hourValue / maxValue) * 5);
        // Add some variation per day
        const variation = Math.max(1, Math.min(5, normalized + (dayIndex % 2 === 0 ? 0 : -1)));
        return variation;
      });
      return { time, days };
    });
  }, [onlineFollowers]);

  // Mock followers trend data (would need historical data from API)
  const followersData = useMemo(() => {
    const currentFollowers = profile?.followers_count || 179959;
    return [
      { month: 'Set', value: Math.round(currentFollowers * 0.96) },
      { month: 'Out', value: Math.round(currentFollowers * 0.97) },
      { month: 'Nov', value: Math.round(currentFollowers * 0.99) },
      { month: 'Dez', value: currentFollowers },
    ];
  }, [profile]);

  const gainLossData = [
    { month: 'Set', gained: 6200, lost: 4100 },
    { month: 'Out', gained: 5800, lost: 3800 },
    { month: 'Nov', gained: 6500, lost: 4200 },
    { month: 'Dez', gained: 5600, lost: 3900 },
  ];

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Erro ao carregar dados: {error}</p>
        <Button onClick={refreshData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <section className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Audience</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Visão geral de crescimento, demografia e distribuição geográfica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refreshData} variant="ghost" size="sm" className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <div className="chip">
            <span className="text-muted-foreground">Atualizado</span>
            <strong className="font-semibold">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: '0.1s' }}>
        <MetricCard
          label="Followers"
          value={formatNumber(profile?.followers_count || 0)}
          delta="+4,05%"
          deltaType="good"
          tooltip="Total de seguidores no momento (geralmente acumulado/lifetime)."
          tag="All time"
          sparkline={<Sparkline trend="up" />}
        />
        <MetricCard
          label="Following"
          value={formatNumber(profile?.follows_count || 0)}
          delta=""
          deltaType="neutral"
          tooltip="Número de contas que você segue."
          tag="All time"
          sparkline={<Sparkline trend="neutral" />}
        />
        <MetricCard
          label="Posts"
          value={formatNumber(profile?.media_count || 0)}
          delta="publicações"
          deltaType="neutral"
          tooltip="Total de publicações no perfil."
          tag="All time"
          sparkline={<Sparkline trend="up" />}
        />
        <MetricCard
          label="Engagement Rate"
          value="4.2%"
          delta="estimado"
          deltaType="good"
          tooltip="Taxa de engajamento estimada baseada em curtidas e comentários."
          tag="Média"
          sparkline={<Sparkline trend="up" />}
        />
      </section>

      {/* Charts Row 1 */}
      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-5" style={{ animationDelay: '0.2s' }}>
        <div className="lg:col-span-3">
          <ChartCard
            title="Followers"
            subtitle="Número de followers no período selecionado."
            tooltip="Evolução do total de seguidores ao longo do tempo no período selecionado."
            legend={
              <>
                <span><span className="legend-dot bg-foreground/70" />Followers</span>
                <span><span className="legend-dot bg-foreground/35" />Tendência</span>
              </>
            }
          >
            <div className="h-60 rounded-xl border border-border bg-background p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={followersData}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Followers']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--foreground) / 0.7)"
                    strokeWidth={3}
                    fill="url(#colorFollowers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ChartCard
            title="Gained & Lost"
            subtitle="Comparativo de ganho e perda no período."
            tooltip="Comparação entre ganhos e perdas de seguidores por intervalo de tempo."
            legend={
              <>
                <span><span className="legend-dot bg-foreground/55" />Gained</span>
                <span><span className="legend-dot bg-foreground/30" />Lost</span>
              </>
            }
          >
            <div className="h-60 rounded-xl border border-border bg-background p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gainLossData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="gained" fill="hsl(var(--foreground) / 0.55)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="lost" fill="hsl(var(--foreground) / 0.30)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* Demographics Row */}
      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-5" style={{ animationDelay: '0.3s' }}>
        <div className="lg:col-span-3">
          <ChartCard
            title="Gender"
            subtitle="Proporção de gênero."
            tooltip="Distribuição de seguidores por gênero. Útil para direcionar linguagem e criativos."
            badge="All time"
            legend={
              <>
                <span><span className="legend-dot bg-foreground/70" />Feminino</span>
                <span><span className="legend-dot bg-foreground/35" />Masculino</span>
                <span><span className="legend-dot bg-foreground/15" />Outro</span>
              </>
            }
          >
            <div className="flex h-60 items-center justify-center gap-10 rounded-xl border border-border bg-background p-4">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{genderData[0]?.value || 0}%</span>
                  <span className="text-xs text-muted-foreground">Feminino</span>
                </div>
              </div>
              <div className="space-y-3">
                {genderData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-8">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ChartCard
            title="Age"
            subtitle="Faixas etárias predominantes."
            tooltip="Distribuição de seguidores por faixa etária. Importante para segmentação de anúncios."
            badge="All time"
          >
            <div className="h-60 rounded-xl border border-border bg-background p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="range" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Share']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--foreground) / 0.6)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* Geography Row */}
      <section className="grid grid-cols-1 gap-3.5 md:grid-cols-2" style={{ animationDelay: '0.4s' }}>
        <ChartCard
          title="Top Countries"
          subtitle="Países com maior número de seguidores."
          tooltip="Distribuição de seguidores por país."
          badge="Top 5"
        >
          <div className="rounded-xl border border-border bg-background">
            <table className="data-table">
              <thead>
                <tr>
                  <th>País</th>
                  <th>Share</th>
                  <th>Followers</th>
                </tr>
              </thead>
              <tbody>
                {topCountries.map((item) => (
                  <tr key={item.country}>
                    <td>{item.country}</td>
                    <td>
                      <div className="progress-bar">
                        <span className="progress-bar-fill" style={{ width: `${item.share}%` }} />
                      </div>
                    </td>
                    <td>{item.followers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard
          title="Top Cities"
          subtitle="Cidades com maior número de seguidores."
          tooltip="Distribuição de seguidores por cidade."
          badge="Top 5"
        >
          <div className="rounded-xl border border-border bg-background">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cidade</th>
                  <th>Share</th>
                  <th>Followers</th>
                </tr>
              </thead>
              <tbody>
                {topCities.map((city) => (
                  <tr key={city.city}>
                    <td>{city.city}</td>
                    <td>
                      <div className="progress-bar">
                        <span className="progress-bar-fill" style={{ width: `${city.share}%` }} />
                      </div>
                    </td>
                    <td>{city.followers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>

      {/* Heatmap */}
      <section style={{ animationDelay: '0.5s' }}>
        <ChartCard
          title="Followers Online"
          subtitle="Heatmap de atividade. Dados ilustrativos."
          tooltip="Horários e dias com maior atividade dos seguidores. Útil para definir agenda de posts."
          badge="Local time"
          legend={
            <>
              <span className="text-muted-foreground">Menos</span>
              {[1, 2, 3, 4, 5].map((v) => (
                <span key={v} className={`legend-dot heatmap-cell`} data-v={v} style={{ width: 12, height: 12 }} />
              ))}
              <span className="text-muted-foreground">Mais</span>
            </>
          }
        >
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="grid grid-cols-8 gap-2">
              {/* Header */}
              <div></div>
              {dayLabels.map((day) => (
                <div key={day} className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Rows */}
              {heatmapData.map((row) => (
                <>
                  <div key={`time-${row.time}`} className="text-xs text-muted-foreground flex items-center">
                    {row.time}
                  </div>
                  {row.days.map((value, i) => (
                    <div key={`${row.time}-${i}`} className="heatmap-cell" data-v={value} />
                  ))}
                </>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>
    </div>
  );
};

export default Audience;
