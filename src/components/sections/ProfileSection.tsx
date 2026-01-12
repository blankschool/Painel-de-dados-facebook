import React from 'react';
import { User } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { MetricCard } from '../ui/MetricCard';
import { formatNumber, formatPercentage } from '@/lib/dashboardHelpers';

interface ProfileSectionProps {
  data: {
    consolidated_profile_views?: number;
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
      profile_views?: {
        changePercent?: number;
      };
      reach?: {
        changePercent?: number;
      };
      views?: {
        changePercent?: number;
      };
    };
  };
}

export function ProfileSection({ data }: ProfileSectionProps) {
  // Métricas consolidadas do perfil
  const profileVisits = data.consolidated_profile_views || 0;
  const profileViews = data.consolidated_impressions || 0;
  const profileReach = data.consolidated_reach || 0;
  const followersCount = data.profile?.followers_count || 0;

  // Calcular Taxa de Engajamento Geral
  const totalEngagement =
    data.media?.reduce(
      (sum, post) =>
        sum +
        (post.like_count || 0) +
        (post.comments_count || 0) +
        (post.insights?.saved || 0),
      0
    ) || 0;
  const engagementRate =
    followersCount > 0 ? (totalEngagement / followersCount) * 100 : 0;

  // Comparison metrics
  const profileViewsTrend = data.comparison_metrics?.profile_views;
  const reachTrend = data.comparison_metrics?.reach;
  const viewsTrend = data.comparison_metrics?.views;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="👤"
        title="Perfil"
        subtitle="Métricas consolidadas da conta"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Visitas ao Perfil"
          value={formatNumber(profileVisits)}
          tooltip="Número de vezes que o seu perfil comercial foi acessado pelos usuários."
          icon={<User className="h-5 w-5" />}
          trend={
            profileViewsTrend?.changePercent !== undefined
              ? {
                  value: profileViewsTrend.changePercent,
                  isPositive: profileViewsTrend.changePercent >= 0,
                }
              : undefined
          }
        />

        <MetricCard
          label="Visualizações do Perfil"
          value={formatNumber(profileViews)}
          tooltip="Total de impressões e exibições da sua página principal e informações comerciais."
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
          label="Alcance do Perfil"
          value={formatNumber(profileReach)}
          tooltip="Número de contas únicas que visualizaram qualquer informação ou conteúdo associado ao seu perfil."
          trend={
            reachTrend?.changePercent !== undefined
              ? {
                  value: reachTrend.changePercent,
                  isPositive: reachTrend.changePercent >= 0,
                }
              : undefined
          }
        />

        <MetricCard
          label="Taxa de Engajamento Geral"
          value={formatPercentage(engagementRate)}
          tooltip="Performance consolidada da conta, unindo interações de posts e atividades no perfil."
        />
      </div>
    </div>
  );
}
