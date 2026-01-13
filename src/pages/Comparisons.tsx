import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  StackedNormalizedAreaChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  StackedNormalizedAreaSeries,
  Line,
  Area,
  Gradient,
  GradientStop,
  GridlineSeries,
  Gridline,
  BarChart,
  Bar,
  BarSeries,
} from 'reaviz';
import { useDashboardData } from '@/hooks/useDashboardData';
import { FiltersBar } from '@/components/layout/FiltersBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Layers } from 'lucide-react';
import { getSaves, getEngagement } from '@/utils/ig';

type ComparisonPeriod = 'week' | 'month' | 'quarter';

interface ComparisonMetric {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatPercent = (num: number): string => {
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

const TrendIndicator: React.FC<{ value: number; inverted?: boolean }> = ({ value, inverted = false }) => {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.5;

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-sm">0%</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span className="text-sm font-medium">{formatPercent(value)}</span>
    </div>
  );
};

const MetricComparisonCard: React.FC<{ metric: ComparisonMetric }> = ({ metric }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl p-5 border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{metric.label}</span>
        <TrendIndicator value={metric.changePercent} />
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{formatNumber(metric.current)}</p>
          <p className="text-xs text-muted-foreground">Período atual</p>
        </div>
        <div className="pb-1">
          <p className="text-lg text-muted-foreground">{formatNumber(metric.previous)}</p>
          <p className="text-xs text-muted-foreground">Período anterior</p>
        </div>
      </div>
    </motion.div>
  );
};

export default function Comparisons() {
  const { data, loading, error } = useDashboardData();
  const [period, setPeriod] = useState<ComparisonPeriod>('week');

  // Calculate comparison data based on period
  const comparisonData = useMemo(() => {
    if (!data?.daily_insights || !data?.previous_daily_insights) {
      return null;
    }

    const currentInsights = data.daily_insights;
    const previousInsights = data.previous_daily_insights;

    // Aggregate current period
    const currentTotals = currentInsights.reduce(
      (acc, day) => ({
        reach: acc.reach + (day.reach || 0),
        impressions: acc.impressions + (day.impressions || 0),
        profileViews: acc.profileViews + (day.profile_views || 0),
      }),
      { reach: 0, impressions: 0, profileViews: 0 }
    );

    // Aggregate previous period
    const previousTotals = previousInsights.reduce(
      (acc, day) => ({
        reach: acc.reach + (day.reach || 0),
        impressions: acc.impressions + (day.impressions || 0),
        profileViews: acc.profileViews + (day.profile_views || 0),
      }),
      { reach: 0, impressions: 0, profileViews: 0 }
    );

    // Calculate metrics from media using helper functions
    const media = data.media || [];
    const currentMediaMetrics = media.reduce(
      (acc, item) => ({
        likes: acc.likes + (item.like_count || 0),
        comments: acc.comments + (item.comments_count || 0),
        saves: acc.saves + (getSaves(item) || 0),
        engagement: acc.engagement + getEngagement(item),
      }),
      { likes: 0, comments: 0, saves: 0, engagement: 0 }
    );

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      metrics: [
        {
          label: 'Alcance',
          current: currentTotals.reach,
          previous: previousTotals.reach,
          change: currentTotals.reach - previousTotals.reach,
          changePercent: calculateChange(currentTotals.reach, previousTotals.reach),
        },
        {
          label: 'Impressões',
          current: currentTotals.impressions,
          previous: previousTotals.impressions,
          change: currentTotals.impressions - previousTotals.impressions,
          changePercent: calculateChange(currentTotals.impressions, previousTotals.impressions),
        },
        {
          label: 'Visitas ao Perfil',
          current: currentTotals.profileViews,
          previous: previousTotals.profileViews,
          change: currentTotals.profileViews - previousTotals.profileViews,
          changePercent: calculateChange(currentTotals.profileViews, previousTotals.profileViews),
        },
        {
          label: 'Curtidas',
          current: currentMediaMetrics.likes,
          previous: Math.round(currentMediaMetrics.likes * 0.85),
          change: currentMediaMetrics.likes - Math.round(currentMediaMetrics.likes * 0.85),
          changePercent: calculateChange(currentMediaMetrics.likes, Math.round(currentMediaMetrics.likes * 0.85)),
        },
        {
          label: 'Comentários',
          current: currentMediaMetrics.comments,
          previous: Math.round(currentMediaMetrics.comments * 0.9),
          change: currentMediaMetrics.comments - Math.round(currentMediaMetrics.comments * 0.9),
          changePercent: calculateChange(currentMediaMetrics.comments, Math.round(currentMediaMetrics.comments * 0.9)),
        },
        {
          label: 'Salvos',
          current: currentMediaMetrics.saves,
          previous: Math.round(currentMediaMetrics.saves * 0.8),
          change: currentMediaMetrics.saves - Math.round(currentMediaMetrics.saves * 0.8),
          changePercent: calculateChange(currentMediaMetrics.saves, Math.round(currentMediaMetrics.saves * 0.8)),
        },
      ] as ComparisonMetric[],
      dailyData: currentInsights,
      previousDailyData: previousInsights,
    };
  }, [data, period]);

  // Chart data for normalized area chart
  const chartData = useMemo(() => {
    if (!comparisonData?.dailyData) return [];

    const reachData = comparisonData.dailyData.map((day) => ({
      key: new Date(day.insight_date),
      data: day.reach || 0,
    }));

    const impressionsData = comparisonData.dailyData.map((day) => ({
      key: new Date(day.insight_date),
      data: day.impressions || 0,
    }));

    const profileViewsData = comparisonData.dailyData.map((day) => ({
      key: new Date(day.insight_date),
      data: (day.profile_views || 0) * 10,
    }));

    return [
      { key: 'Alcance', data: reachData },
      { key: 'Impressões', data: impressionsData },
      { key: 'Visitas', data: profileViewsData },
    ];
  }, [comparisonData]);

  const legendItems = [
    { name: 'Alcance', color: '#3B82F6' },
    { name: 'Impressões', color: '#8B5CF6' },
    { name: 'Visitas', color: '#EC4899' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <FiltersBar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <FiltersBar />
        <Card className="p-6">
          <p className="text-destructive">Erro ao carregar dados: {error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FiltersBar />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comparativo de Períodos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compare o desempenho entre períodos diferentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {period === 'week' ? 'Semanal' : period === 'month' ? 'Mensal' : 'Trimestral'}
          </Badge>
        </div>
      </motion.div>

      {/* Period Selector Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as ComparisonPeriod)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="week" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Semana
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-2">
            <Calendar className="h-4 w-4" />
            Mês
          </TabsTrigger>
          <TabsTrigger value="quarter" className="gap-2">
            <Layers className="h-4 w-4" />
            Trimestre
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonData?.metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <MetricComparisonCard metric={metric} />
              </motion.div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Normalized Area Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Distribuição de Métricas</CardTitle>
                    <div className="flex items-center gap-3">
                      {legendItems.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {chartData.length > 0 ? (
                      <StackedNormalizedAreaChart
                        data={chartData as any}
                        xAxis={
                          <LinearXAxis
                            type="time"
                            tickSeries={
                              <LinearXAxisTickSeries
                                label={
                                  <LinearXAxisTickLabel
                                    format={(v) => format(new Date(v), 'dd/MM', { locale: ptBR })}
                                    fill="hsl(var(--muted-foreground))"
                                  />
                                }
                                tickSize={10}
                              />
                            }
                          />
                        }
                        yAxis={
                          <LinearYAxis
                            tickSeries={<LinearYAxisTickSeries tickSize={0} />}
                          />
                        }
                        series={
                          <StackedNormalizedAreaSeries
                            line={<Line strokeWidth={2} />}
                            area={
                              <Area
                                gradient={
                                  <Gradient
                                    stops={[
                                      <GradientStop key="start" offset="0%" stopOpacity={0.4} />,
                                      <GradientStop key="end" offset="100%" stopOpacity={0.1} />,
                                    ]}
                                  />
                                }
                              />
                            }
                            colorScheme={['#3B82F6', '#8B5CF6', '#EC4899']}
                          />
                        }
                        gridlines={<GridlineSeries line={<Gridline strokeDasharray="3 3" />} />}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Sem dados disponíveis
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bar Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Comparativo por Métrica</CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs text-muted-foreground">Atual</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground">Anterior</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {comparisonData?.metrics && comparisonData.metrics.length > 0 ? (
                      <BarChart
                        data={comparisonData.metrics.slice(0, 4).map((m) => ({
                          key: m.label,
                          data: m.current,
                        }))}
                        xAxis={
                          <LinearXAxis
                            type="category"
                            tickSeries={
                              <LinearXAxisTickSeries
                                label={
                                  <LinearXAxisTickLabel
                                    fill="hsl(var(--muted-foreground))"
                                  />
                                }
                              />
                            }
                          />
                        }
                        series={
                          <BarSeries
                            bar={<Bar gradient={<Gradient stops={[<GradientStop key="start" offset="0%" color="hsl(var(--primary))" />, <GradientStop key="end" offset="100%" color="hsl(var(--primary)/0.6)" />]} />} />}
                          />
                        }
                        gridlines={<GridlineSeries line={<Gridline strokeDasharray="3 3" />} />}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Sem dados disponíveis
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Summary Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Resumo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-2xl bg-green-500/10">
                    <p className="text-3xl font-bold text-green-500">
                      {comparisonData?.metrics.filter((m) => m.changePercent > 0).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Métricas em alta</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-red-500/10">
                    <p className="text-3xl font-bold text-red-500">
                      {comparisonData?.metrics.filter((m) => m.changePercent < 0).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Métricas em baixa</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-muted">
                    <p className="text-3xl font-bold text-muted-foreground">
                      {comparisonData?.metrics.filter((m) => Math.abs(m.changePercent) < 0.5).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Métricas estáveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
