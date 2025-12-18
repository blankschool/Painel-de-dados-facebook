import { useMemo } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Audience = () => {
  const { data, loading, error, refresh } = useDashboardData();
  
  const profile = data?.profile;
  const demographics = (data?.demographics || {}) as Record<string, Record<string, number>>;
  const onlineFollowers = (data?.online_followers || {}) as Record<string, number>;

  const hasDemographics = demographics.audience_gender_age || demographics.audience_country || demographics.audience_city;
  const hasOnlineData = Object.keys(onlineFollowers).length > 0;

  // Process gender data from demographics - only if real data exists
  const genderData = useMemo(() => {
    if (!demographics.audience_gender_age) return [];

    let female = 0;
    let male = 0;
    let total = 0;

    Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
      const numValue = value as number;
      total += numValue;
      if (key.startsWith('F.')) female += numValue;
      if (key.startsWith('M.')) male += numValue;
    });

    if (total === 0) return [];

    const other = total - female - male;
    const femalePercent = Math.round((female / total) * 100) || 0;
    const malePercent = Math.round((male / total) * 100) || 0;
    const otherPercent = Math.round((other / total) * 100) || 0;

    return [
      { name: 'Feminino', value: femalePercent, fill: 'hsl(var(--foreground) / 0.7)' },
      { name: 'Masculino', value: malePercent, fill: 'hsl(var(--foreground) / 0.35)' },
      { name: 'Outro', value: otherPercent, fill: 'hsl(var(--foreground) / 0.15)' },
    ].filter(item => item.value > 0);
  }, [demographics]);

  // Process age data from demographics - only if real data exists
  const ageData = useMemo(() => {
    if (!demographics.audience_gender_age) return [];

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
      const numValue = value as number;
      total += numValue;
      const ageRange = key.split('.')[1];
      if (ageRange && ageGroups[ageRange] !== undefined) {
        ageGroups[ageRange] += numValue;
      }
    });

    if (total === 0) return [];

    // Combine 55+ ranges
    ageGroups['55+'] = ageGroups['55-64'] + ageGroups['65+'];
    delete ageGroups['55-64'];
    delete ageGroups['65+'];

    return Object.entries(ageGroups)
      .filter(([_, value]) => value > 0)
      .map(([range, value]) => ({
        range,
        value: Math.round((value / total) * 100) || 0,
      }));
  }, [demographics]);

  // Process country data - only if real data exists
  const topCountries = useMemo(() => {
    if (!demographics.audience_country) return [];

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

    const countryData = demographics.audience_country as Record<string, number>;
    const total = Object.values(countryData).reduce((a: number, b: number) => a + b, 0);
    
    if (total === 0) return [];

    return Object.entries(countryData)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([code, value]) => ({
        country: countryNames[code] || code,
        share: Math.round(((value as number) / total) * 100),
        followers: (value as number) >= 1000 ? `${((value as number) / 1000).toFixed(1)}k` : (value as number).toString(),
      }));
  }, [demographics]);

  // Process city data - only if real data exists
  const topCities = useMemo(() => {
    if (!demographics.audience_city) return [];

    const cityData = demographics.audience_city as Record<string, number>;
    const total = Object.values(cityData).reduce((a: number, b: number) => a + b, 0);
    
    if (total === 0) return [];

    return Object.entries(cityData)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([city, value]) => ({
        city,
        share: Math.round(((value as number) / total) * 100),
        followers: (value as number) >= 1000 ? `${((value as number) / 1000).toFixed(1)}k` : (value as number).toString(),
      }));
  }, [demographics]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <Button onClick={() => refresh()} variant="ghost" size="sm" className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </section>

      {/* Metrics Grid - Real data only */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Followers"
          value={profile?.followers_count ? formatNumber(profile.followers_count) : '--'}
          tooltip="Total de seguidores no momento."
          tag="All time"
        />
        <MetricCard
          label="Following"
          value={profile?.follows_count ? formatNumber(profile.follows_count) : '--'}
          tooltip="Número de contas que você segue."
          tag="All time"
        />
        <MetricCard
          label="Posts"
          value={profile?.media_count ? formatNumber(profile.media_count) : '--'}
          tooltip="Total de publicações no perfil."
          tag="All time"
        />
        <MetricCard
          label="Engagement Rate"
          value="--"
          tooltip="Taxa de engajamento requer dados históricos."
          tag="Indisponível"
        />
      </section>

      {/* No demographics data message */}
      {!hasDemographics && (
        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[250px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Dados demográficos indisponíveis</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Os dados demográficos requerem uma conta Business/Creator com pelo menos 100 seguidores 
            e permissões adequadas no Instagram Graph API.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>
      )}

      {/* Demographics Row - Only show if real data exists */}
      {genderData.length > 0 && (
        <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ChartCard
              title="Gender"
              subtitle="Proporção de gênero."
              tooltip="Distribuição de seguidores por gênero."
              badge="API Data"
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
                    <span className="text-xs text-muted-foreground">{genderData[0]?.name}</span>
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
          
          {ageData.length > 0 && (
            <div className="lg:col-span-2">
              <ChartCard
                title="Age"
                subtitle="Faixas etárias predominantes."
                tooltip="Distribuição de seguidores por faixa etária."
                badge="API Data"
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
          )}
        </section>
      )}

      {/* Top Countries - Only show if real data exists */}
      {(topCountries.length > 0 || topCities.length > 0) && (
        <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          {topCountries.length > 0 && (
            <ChartCard
              title="Countries"
              subtitle="Top países por audiência."
              tooltip="Países com maior concentração de seguidores."
            >
              <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                {topCountries.map((item, idx) => (
                  <div key={item.country} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
                    <span className="w-5 text-xs text-muted-foreground">{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium">{item.country}</span>
                    <span className="text-xs text-muted-foreground">{item.followers}</span>
                    <div className="w-24">
                      <div className="h-1.5 rounded-full bg-muted">
                        <div 
                          className="h-full rounded-full bg-foreground/60" 
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-sm font-semibold">{item.share}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {topCities.length > 0 && (
            <ChartCard
              title="Cities"
              subtitle="Top cidades por audiência."
              tooltip="Cidades com maior concentração de seguidores."
            >
              <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                {topCities.map((item, idx) => (
                  <div key={item.city} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
                    <span className="w-5 text-xs text-muted-foreground">{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium">{item.city}</span>
                    <span className="text-xs text-muted-foreground">{item.followers}</span>
                    <div className="w-24">
                      <div className="h-1.5 rounded-full bg-muted">
                        <div 
                          className="h-full rounded-full bg-foreground/60" 
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-sm font-semibold">{item.share}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </section>
      )}

      {/* Online Followers info */}
      {!hasOnlineData && (
        <div className="chart-card p-6">
          <h3 className="text-sm font-semibold mb-2">Seguidores Online</h3>
          <p className="text-sm text-muted-foreground">
            Dados de atividade online não disponíveis. Acesse a página "Online" para mais detalhes quando conectar uma conta.
          </p>
        </div>
      )}
    </div>
  );
};

export default Audience;
