import React, { useMemo } from 'react';
import {
  Film,
  Eye,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { MetricCard } from '../ui/MetricCard';
import {
  formatNumber,
  formatPercentage,
  aggregateStoriesMetrics,
  findBestTimeFromOnlineFollowers,
  formatTime,
  getDayName,
} from '@/lib/dashboardHelpers';

interface StoriesSectionProps {
  data: {
    stories?: Array<{
      insights?: {
        views?: number;
        reach?: number;
        replies?: number;
        taps_back?: number;
        taps_forward?: number;
        exits?: number;
      };
    }>;
    stories_aggregate?: {
      total_stories?: number;
      total_views?: number;
      total_reach?: number;
      total_replies?: number;
      total_taps_back?: number;
      total_taps_forward?: number;
      total_exits?: number;
      avg_completion_rate?: number;
    };
    online_followers?: Record<string, number>;
    profile?: {
      followers_count?: number;
    };
  };
}

export function StoriesSection({ data }: StoriesSectionProps) {
  const stories = data.stories || [];
  const followersCount = data.profile?.followers_count || 0;

  // Usar dados agregados se disponíveis, senão calcular manualmente
  const metrics = useMemo(() => {
    if (data.stories_aggregate) {
      return {
        totalStories: data.stories_aggregate.total_stories || 0,
        totalViews: data.stories_aggregate.total_views || 0,
        totalReach: data.stories_aggregate.total_reach || 0,
        totalReplies: data.stories_aggregate.total_replies || 0,
        totalTapsBack: data.stories_aggregate.total_taps_back || 0,
        totalTapsForward: data.stories_aggregate.total_taps_forward || 0,
        totalExits: data.stories_aggregate.total_exits || 0,
        avgCompletionRate: data.stories_aggregate.avg_completion_rate || 0,
      };
    }

    // Calcular manualmente se aggregate não disponível
    const aggregate = aggregateStoriesMetrics(stories);
    return {
      totalStories: aggregate.total_stories,
      totalViews: aggregate.total_views,
      totalReach: aggregate.total_reach,
      totalReplies: aggregate.total_replies,
      totalTapsBack: aggregate.total_taps_back,
      totalTapsForward: aggregate.total_taps_forward,
      totalExits: aggregate.total_exits,
      avgCompletionRate: aggregate.avg_completion_rate,
    };
  }, [data.stories_aggregate, stories]);

  // Calcular taxas
  const reachRate =
    followersCount > 0
      ? (metrics.totalReach / followersCount) * 100
      : 0;

  // Melhor horário para stories (baseado em online followers)
  const bestTime = useMemo(() => {
    if (!data.online_followers) return null;
    return findBestTimeFromOnlineFollowers(data.online_followers);
  }, [data.online_followers]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="📱"
        title="Stories"
        subtitle="Performance de conteúdo efêmero"
      />

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Número de Stories"
          value={formatNumber(metrics.totalStories)}
          tooltip="Quantidade total de mídias publicadas nos Stories no período."
          icon={<Film className="h-5 w-5" />}
        />

        <MetricCard
          label="Visualizações"
          value={formatNumber(metrics.totalViews)}
          tooltip="Soma das impressões (vezes que o story apareceu na tela) de todos os itens publicados."
          icon={<Eye className="h-5 w-5" />}
        />

        <MetricCard
          label="Alcance"
          value={formatNumber(metrics.totalReach)}
          tooltip="Número de contas únicas que visualizaram seus Stories."
          icon={<Users className="h-5 w-5" />}
        />

        <MetricCard
          label="Respostas"
          value={formatNumber(metrics.totalReplies)}
          tooltip="Quantidade de mensagens diretas enviadas pelos usuários a partir de um Story."
          icon={<MessageCircle className="h-5 w-5" />}
        />
      </div>

      {/* Métricas de navegação */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Toques para Voltar"
          value={formatNumber(metrics.totalTapsBack)}
          tooltip="Número de vezes que os usuários tocaram para rever o Story anterior."
          icon={<ChevronLeft className="h-5 w-5" />}
        />

        <MetricCard
          label="Toques para Avançar"
          value={formatNumber(metrics.totalTapsForward)}
          tooltip="Quantidade de vezes que o público pulou para o próximo Story antes da finalização automática."
          icon={<ChevronRight className="h-5 w-5" />}
        />

        <MetricCard
          label="Saídas"
          value={formatNumber(metrics.totalExits)}
          tooltip="Número de vezes que um usuário abandonou a visualização dos Stories a partir de uma tela específica."
          icon={<LogOut className="h-5 w-5" />}
        />
      </div>

      {/* Taxas e otimização */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Taxa de Alcance (Stories)"
          value={formatPercentage(reachRate)}
          tooltip="Porcentagem de seguidores que visualizam seus Stories habitualmente."
        />

        <MetricCard
          label="Taxa de Conclusão"
          value={formatPercentage(metrics.avgCompletionRate)}
          tooltip="Média de usuários que assistiram aos Stories do início ao fim sem abandonar a sequência."
        />

        {bestTime && (
          <MetricCard
            label="Melhor Horário para Stories"
            value={`${getDayName(bestTime.dayOfWeek)}, ${formatTime(
              bestTime.hour
            )}`}
            tooltip="Período do dia com maior probabilidade de visualizações imediatas para conteúdos efêmeros."
          />
        )}
      </div>
    </div>
  );
}
