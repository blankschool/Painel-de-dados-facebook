import { useDashboardData } from '@/hooks/useDashboardData';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Clock, Users, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

const OnlineFollowers = () => {
  const { data, loading, error } = useDashboardData();
  const onlineFollowers = (data?.online_followers as Record<string, number> | undefined) ?? {};
  const hasRealData = Object.keys(onlineFollowers).length > 0;

  // Generate heatmap data only from real API data
  const heatmapData = useMemo(() => {
    if (!hasRealData) return [];
    
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return days.map((day, dayIndex) => ({
      day,
      hours: hours.map(hour => {
        const key = `${dayIndex}_${hour}`;
        const value = onlineFollowers[key] || 0;
        return {
          hour,
          value: Math.round(value),
          level: Math.min(5, Math.ceil(value)),
        };
      }),
    }));
  }, [onlineFollowers, hasRealData]);

  // Find best times only if we have real data
  const bestTimes = useMemo(() => {
    if (!hasRealData) return [];
    const allSlots: { day: string; hour: number; value: number }[] = [];
    heatmapData.forEach(({ day, hours }) => {
      hours.forEach(({ hour, value }) => {
        allSlots.push({ day, hour, value });
      });
    });
    return allSlots.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData, hasRealData]);

  // Calculate peak hour only if we have real data
  const peakHour = useMemo(() => {
    if (!hasRealData) return null;
    const hourTotals: Record<number, number> = {};
    heatmapData.forEach(({ hours }) => {
      hours.forEach(({ hour, value }) => {
        hourTotals[hour] = (hourTotals[hour] || 0) + value;
      });
    });
    const peak = Object.entries(hourTotals).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return peak ? Number(peak[0]) : null;
  }, [heatmapData, hasRealData]);

  const bestDay = useMemo(() => {
    if (!hasRealData || heatmapData.length === 0) return null;
    const dayTotals = heatmapData.map(d => ({
      day: d.day,
      total: d.hours.reduce((s, h) => s + h.value, 0)
    }));
    return dayTotals.sort((a, b) => b.total - a.total)[0]?.day || null;
  }, [heatmapData, hasRealData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Show empty state if no real data
  if (!hasRealData) {
    return (
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seguidores Online</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Horários em que seus seguidores estão mais ativos.
            </p>
          </div>
        </section>

        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Dados indisponíveis</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Não há dados de seguidores online disponíveis. Conecte uma conta do Instagram via Facebook para visualizar estas métricas.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seguidores Online</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Horários em que seus seguidores estão mais ativos.
          </p>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="chart-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Melhor Horário</p>
              <p className="text-xl font-bold">{peakHour !== null ? formatHour(peakHour) : '--'}</p>
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
              <p className="text-xl font-bold">
                {bestTimes[0] ? `${bestTimes[0].day} às ${formatHour(bestTimes[0].hour)}` : '--'}
              </p>
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
              <p className="text-xl font-bold">{bestDay || '--'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <ChartCard title="Mapa de Atividade" subtitle="Quando seus seguidores estão online">
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[700px]">
            {/* Hours header */}
            <div className="flex items-center mb-2">
              <div className="w-12"></div>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[10px] text-muted-foreground">{i}</span>
                </div>
              ))}
            </div>
            
            {/* Heatmap rows */}
            {heatmapData.map(({ day, hours }) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <div className="w-12 text-xs font-medium text-muted-foreground">{day}</div>
                {hours.map(({ hour, level }) => (
                  <div
                    key={hour}
                    className="heatmap-cell flex-1"
                    data-v={level}
                    title={`${day} ${formatHour(hour)}: Nível ${level}`}
                  />
                ))}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Menos</span>
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="heatmap-cell w-6 h-6" data-v={level} />
              ))}
              <span className="text-xs text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Best Times to Post */}
      {bestTimes.length > 0 && (
        <ChartCard title="Melhores Horários para Postar" subtitle="Top 5 momentos de maior atividade">
          <div className="space-y-3">
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
                  <p className="text-xs text-muted-foreground">de atividade</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default OnlineFollowers;
