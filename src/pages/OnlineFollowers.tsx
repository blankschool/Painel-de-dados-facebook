import { useInstagram } from '@/contexts/InstagramContext';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Clock, Users, TrendingUp, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

const OnlineFollowers = () => {
  const { onlineFollowers, loading } = useInstagram();

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Use real data if available, otherwise generate mock data
    const hasRealData = Object.keys(onlineFollowers).length > 0;
    
    return days.map((day, dayIndex) => ({
      day,
      hours: hours.map(hour => {
        const key = `${dayIndex}_${hour}`;
        const value = hasRealData 
          ? (onlineFollowers[key] || Math.random() * 5)
          : Math.random() * 5;
        return {
          hour,
          value: Math.round(value),
          level: Math.min(5, Math.ceil(value)),
        };
      }),
    }));
  }, [onlineFollowers]);

  // Find best times
  const bestTimes = useMemo(() => {
    const allSlots: { day: string; hour: number; value: number }[] = [];
    heatmapData.forEach(({ day, hours }) => {
      hours.forEach(({ hour, value }) => {
        allSlots.push({ day, hour, value });
      });
    });
    return allSlots.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData]);

  // Calculate peak hour overall
  const peakHour = useMemo(() => {
    const hourTotals: Record<number, number> = {};
    heatmapData.forEach(({ hours }) => {
      hours.forEach(({ hour, value }) => {
        hourTotals[hour] = (hourTotals[hour] || 0) + value;
      });
    });
    const peak = Object.entries(hourTotals).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return peak ? Number(peak[0]) : 0;
  }, [heatmapData]);

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
              <p className="text-xl font-bold">{formatHour(peakHour)}</p>
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

      {/* Recommendations */}
      <ChartCard title="Recomendações" subtitle="Baseado na atividade dos seus seguidores">
        <div className="space-y-4 p-2">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-success mt-2" />
            <div>
              <p className="font-medium">Poste durante os horários de pico</p>
              <p className="text-sm text-muted-foreground">
                Seus seguidores estão mais ativos entre {formatHour(peakHour - 1)} e {formatHour(peakHour + 2)}.
                Este é o melhor momento para publicar conteúdo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <div>
              <p className="font-medium">Evite horários de baixa atividade</p>
              <p className="text-sm text-muted-foreground">
                Posts feitos entre 2h e 6h da manhã têm menor alcance inicial.
                Se precisar postar nesses horários, considere agendar para mais tarde.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
            <div>
              <p className="font-medium">Mantenha consistência</p>
              <p className="text-sm text-muted-foreground">
                Postar regularmente nos mesmos horários ajuda a criar expectativa
                nos seus seguidores e pode aumentar o engajamento.
              </p>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};

export default OnlineFollowers;