import { useEffect, useState, useMemo } from 'react';
import { useInsights } from '@/hooks/useInsights';
import { useAuth } from '@/contexts/AuthContext';
import { useInstagram } from '@/contexts/InstagramContext';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
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
} from 'recharts';

const Audience = () => {
  const { connectedAccounts } = useAuth();
  const { demographics, onlineFollowers, loading: instagramLoading } = useInstagram();
  const { loading, fetchInsights, selectedAccountId } = useInsights();
  const [activeTab, setActiveTab] = useState('demographics');

  const hasAccount = connectedAccounts && connectedAccounts.length > 0;

  useEffect(() => {
    if (hasAccount && selectedAccountId) {
      fetchInsights();
    }
  }, [selectedAccountId]);

  // Process demographics data
  const ageData = demographics.audience_gender_age 
    ? (() => {
        const ageGroups: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const age = key.split('.')[1];
          if (age) {
            ageGroups[age] = (ageGroups[age] || 0) + (value as number);
          }
        });
        return Object.entries(ageGroups).map(([range, value]) => ({ range, value }));
      })()
    : [];

  const genderData = demographics.audience_gender_age 
    ? (() => {
        const genders: Record<string, number> = { M: 0, F: 0 };
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const gender = key.split('.')[0];
          if (gender === 'M' || gender === 'F') {
            genders[gender] += value as number;
          }
        });
        const total = genders.M + genders.F || 1;
        return [
          { name: 'Masculino', value: Math.round((genders.M / total) * 100), color: 'hsl(var(--primary))' },
          { name: 'Feminino', value: Math.round((genders.F / total) * 100), color: 'hsl(var(--muted-foreground))' },
        ];
      })()
    : [];

  const countryData = demographics.audience_country 
    ? Object.entries(demographics.audience_country)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 8)
        .map(([country, value]) => ({ country, value: value as number }))
    : [];

  const cityData = demographics.audience_city 
    ? Object.entries(demographics.audience_city)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 8)
        .map(([city, value]) => ({ city, value: value as number }))
    : [];

  // Online followers heatmap
  const heatmapData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hasRealData = Object.keys(onlineFollowers).length > 0;
    
    return days.map((day, dayIndex) => ({
      day,
      hours: hours.map(hour => {
        const key = `${dayIndex}_${hour}`;
        const value = hasRealData ? (onlineFollowers[key] || 0) : 0;
        return { hour, value: Math.round(value), level: Math.min(5, Math.ceil(value)) };
      }),
    }));
  }, [onlineFollowers]);

  const bestTimes = useMemo(() => {
    const allSlots: { day: string; hour: number; value: number }[] = [];
    heatmapData.forEach(({ day, hours }) => {
      hours.forEach(({ hour, value }) => {
        allSlots.push({ day, hour, value });
      });
    });
    return allSlots.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData]);

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  const hasData = ageData.length > 0 || genderData.length > 0 || countryData.length > 0;
  const hasOnlineData = Object.keys(onlineFollowers).length > 0;

  if (!hasAccount) {
    return (
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-3 py-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Audiência</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Demografia e atividade dos seguidores.</p>
          </div>
        </section>
        <div className="chart-card p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Conecte sua conta do Instagram para ver a audiência.</p>
        </div>
      </div>
    );
  }

  if (loading || instagramLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audiência</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conheça seu público e os melhores horários para postar.
          </p>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="demographics" className="gap-2">
            <Users className="w-4 h-4" />
            Demografia
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Clock className="w-4 h-4" />
            Atividade
          </TabsTrigger>
        </TabsList>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          {!hasData ? (
            <div className="chart-card p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Dados demográficos indisponíveis</h3>
              <p className="text-muted-foreground text-sm">
                É necessário ter mais de 100 seguidores para visualizar dados demográficos.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Age Distribution */}
                {ageData.length > 0 && (
                  <ChartCard title="Distribuição por Idade" subtitle="Faixa etária dos seguidores">
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                )}

                {/* Gender Distribution */}
                {genderData.length > 0 && (
                  <ChartCard title="Distribuição por Gênero" subtitle="Gênero dos seguidores">
                    <div className="h-[250px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                            {genderData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                )}
              </div>

              {/* Countries */}
              {countryData.length > 0 && (
                <ChartCard title="Top Países" subtitle="Localização geográfica">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                        <YAxis dataKey="country" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}

              {/* Cities */}
              {cityData.length > 0 && (
                <ChartCard title="Top Cidades" subtitle="Principais cidades">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                        <YAxis dataKey="city" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}
            </>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          {!hasOnlineData ? (
            <div className="chart-card p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Dados de atividade indisponíveis</h3>
              <p className="text-muted-foreground text-sm">
                Os dados de atividade dos seguidores serão carregados em breve.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="chart-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Melhor Horário</p>
                      <p className="text-xl font-bold">{formatHour(bestTimes[0]?.hour || 0)}</p>
                    </div>
                  </div>
                </div>
                <div className="chart-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pico de Atividade</p>
                      <p className="text-xl font-bold">{bestTimes[0]?.day} às {formatHour(bestTimes[0]?.hour || 0)}</p>
                    </div>
                  </div>
                </div>
                <div className="chart-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Melhor Dia</p>
                      <p className="text-xl font-bold">
                        {(() => {
                          const dayTotals = heatmapData.map(d => ({
                            day: d.day,
                            total: d.hours.reduce((s, h) => s + h.value, 0)
                          }));
                          return dayTotals.sort((a, b) => b.total - a.total)[0]?.day || 'N/A';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <ChartCard title="Mapa de Atividade" subtitle="Quando seus seguidores estão online">
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[600px]">
                    <div className="flex items-center mb-2">
                      <div className="w-12"></div>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 text-center">
                          <span className="text-[10px] text-muted-foreground">{i}</span>
                        </div>
                      ))}
                    </div>
                    
                    {heatmapData.map(({ day, hours }) => (
                      <div key={day} className="flex items-center gap-1 mb-1">
                        <div className="w-12 text-xs font-medium text-muted-foreground">{day}</div>
                        {hours.map(({ hour, level }) => (
                          <div key={hour} className="heatmap-cell flex-1" data-v={level} title={`${day} ${formatHour(hour)}: Nível ${level}`} />
                        ))}
                      </div>
                    ))}

                    <div className="flex items-center justify-end gap-2 mt-4">
                      <span className="text-xs text-muted-foreground">Menos</span>
                      {[1, 2, 3, 4, 5].map(level => (
                        <div key={level} className="heatmap-cell w-5 h-5" data-v={level} />
                      ))}
                      <span className="text-xs text-muted-foreground">Mais</span>
                    </div>
                  </div>
                </div>
              </ChartCard>

              {/* Best Times */}
              <ChartCard title="Melhores Horários para Postar" subtitle="Top 5 momentos">
                <div className="space-y-2">
                  {bestTimes.map((slot, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{slot.day}</p>
                        <p className="text-sm text-muted-foreground">{formatHour(slot.hour)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Nível {slot.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Audience;
