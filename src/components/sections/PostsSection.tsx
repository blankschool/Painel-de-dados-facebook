import React, { useMemo } from 'react';
import { FileText, Heart, MessageCircle, Bookmark, Eye, Users } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { MetricCard } from '../ui/MetricCard';
import { formatNumber, formatPercentage } from '@/lib/dashboardHelpers';

interface PostsSectionProps {
  data: {
    total_posts?: number;
    consolidated_impressions?: number;
    consolidated_reach?: number;
    profile?: {
      followers_count?: number;
    };
    media?: Array<{
      like_count?: number;
      comments_count?: number;
      insights?: { saved?: number };
    }>;
    comparison_metrics?: {
      reach?: {
        changePercent?: number;
      };
      views?: {
        changePercent?: number;
      };
    };
  };
}

export function PostsSection({ data }: PostsSectionProps) {
  const posts = data.media || [];
  const followersCount = data.profile?.followers_count || 0;
  const totalPosts = data.total_posts || posts.length;

  // Calcular métricas agregadas
  const metrics = useMemo(() => {
    const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0);
    const totalComments = posts.reduce(
      (sum, post) => sum + (post.comments_count || 0),
      0
    );
    const totalSaves = posts.reduce(
      (sum, post) => sum + (post.insights?.saved || 0),
      0
    );
    const totalEngagement = totalLikes + totalComments + totalSaves;

    // Usar visualizações consolidadas (API v24.0)
    const totalViews = data.consolidated_impressions || 0;
    const totalReach = data.consolidated_reach || 0;

    // Calcular taxas
    const avgER =
      followersCount > 0 && totalPosts > 0
        ? (totalEngagement / (followersCount * totalPosts)) * 100
        : 0;

    const reachRate =
      followersCount > 0 ? (totalReach / followersCount) * 100 : 0;

    const engagementByReach =
      totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    return {
      totalLikes,
      totalComments,
      totalSaves,
      totalViews,
      totalReach,
      totalEngagement,
      avgER,
      reachRate,
      engagementByReach,
    };
  }, [posts, data.consolidated_impressions, data.consolidated_reach, followersCount, totalPosts]);

  // Comparison metrics
  const reachTrend = data.comparison_metrics?.reach;
  const viewsTrend = data.comparison_metrics?.views;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="📝"
        title="Posts"
        subtitle="Desempenho das publicações no feed"
      />

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Número de Posts"
          value={formatNumber(totalPosts)}
          tooltip="Quantidade total de publicações realizadas no feed durante o período."
          icon={<FileText className="h-5 w-5" />}
        />

        <MetricCard
          label="Curtidas"
          value={formatNumber(metrics.totalLikes)}
          tooltip="Soma total de interações de 'curtir' recebidas em suas publicações."
          icon={<Heart className="h-5 w-5" />}
        />

        <MetricCard
          label="Comentários"
          value={formatNumber(metrics.totalComments)}
          tooltip="Número total de mensagens deixadas pelos usuários em seus posts."
          icon={<MessageCircle className="h-5 w-5" />}
        />

        <MetricCard
          label="Salvamentos"
          value={formatNumber(metrics.totalSaves)}
          tooltip="Quantidade de vezes que suas publicações foram salvas na coleção dos usuários."
          icon={<Bookmark className="h-5 w-5" />}
        />

        <MetricCard
          label="Visualizações"
          value={formatNumber(metrics.totalViews)}
          tooltip="Número total de vezes que seus posts foram exibidos na tela (impressões)."
          icon={<Eye className="h-5 w-5" />}
          trend={
            viewsTrend?.changePercent !== undefined
              ? {
                  value: viewsTrend.changePercent,
                  isPositive: viewsTrend.changePercent >= 0,
                }
              : undefined
          }
        />

        <MetricCard
          label="Alcance"
          value={formatNumber(metrics.totalReach)}
          tooltip="Número total de contas únicas que visualizaram suas publicações pelo menos uma vez."
          icon={<Users className="h-5 w-5" />}
          trend={
            reachTrend?.changePercent !== undefined
              ? {
                  value: reachTrend.changePercent,
                  isPositive: reachTrend.changePercent >= 0,
                }
              : undefined
          }
        />
      </div>

      {/* Taxas de engajamento */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Taxa de Engajamento por Post"
          value={formatPercentage(metrics.avgER)}
          tooltip="Média de interações (curtidas, comentários e salvamentos) em relação ao número de seguidores."
        />

        <MetricCard
          label="Taxa de Alcance"
          value={formatPercentage(metrics.reachRate)}
          tooltip="Porcentagem de seguidores que foram alcançados organicamente por suas publicações."
        />

        <MetricCard
          label="Engajamento por Alcance"
          value={formatPercentage(metrics.engagementByReach)}
          tooltip="Eficiência das interações calculada apenas sobre o número de pessoas que efetivamente viram o post."
        />
      </div>
    </div>
  );
}
