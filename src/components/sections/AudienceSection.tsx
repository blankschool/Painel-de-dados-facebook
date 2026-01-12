import React, { useMemo } from 'react';
import { Users, TrendingUp, UserPlus } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { MetricCard } from '../ui/MetricCard';
import {
  formatNumber,
  formatPercentage,
  calculateFollowerChange,
} from '@/lib/dashboardHelpers';

interface AudienceSectionProps {
  data: {
    profile?: {
      followers_count?: number;
      follows_count?: number;
    };
    comparison_metrics?: {
      reach?: {
        change?: number;
        changePercent?: number;
      };
    };
    demographics?: {
      audience_gender_age?: Record<string, number>;
      audience_country?: Record<string, number>;
      audience_city?: Record<string, number>;
    };
    online_followers?: Record<string, number>;
    // For calculating follower change, we need previous period data
    previous_period?: {
      profile?: {
        followers_count?: number;
      };
    };
  };
}

export function AudienceSection({ data }: AudienceSectionProps) {
  const followersCount = data.profile?.followers_count || 0;
  const followsCount = data.profile?.follows_count || 0;

  // Calculate follower change
  const followerChange = useMemo(() => {
    const previousFollowers =
      data.previous_period?.profile?.followers_count;
    if (previousFollowers !== undefined && previousFollowers > 0) {
      return calculateFollowerChange(followersCount, previousFollowers);
    }
    // Fallback to reach change as proxy if no previous data
    return data.comparison_metrics?.reach?.changePercent;
  }, [
    followersCount,
    data.previous_period?.profile?.followers_count,
    data.comparison_metrics?.reach?.changePercent,
  ]);

  // New followers (use reach change as proxy if positive)
  const newFollowers = useMemo(() => {
    const reachChange = data.comparison_metrics?.reach?.change;
    if (reachChange !== undefined && reachChange > 0) {
      return reachChange;
    }
    return 0;
  }, [data.comparison_metrics?.reach?.change]);

  // Calculate follower/following ratio
  const followRatio = useMemo(() => {
    if (followsCount === 0) return 0;
    return (followersCount / followsCount) * 100;
  }, [followersCount, followsCount]);

  // Process gender data
  const genderData = useMemo(() => {
    if (!data.demographics?.audience_gender_age) return null;

    let female = 0;
    let male = 0;
    let total = 0;

    Object.entries(data.demographics.audience_gender_age).forEach(
      ([key, value]) => {
        total += value;
        if (key.startsWith('F.')) female += value;
        if (key.startsWith('M.')) male += value;
      }
    );

    if (total === 0) return null;

    return {
      female: Math.round((female / total) * 100),
      male: Math.round((male / total) * 100),
      other: Math.round(((total - female - male) / total) * 100),
    };
  }, [data.demographics?.audience_gender_age]);

  // Top countries count
  const topCountriesCount = useMemo(() => {
    if (!data.demographics?.audience_country) return 0;
    return Object.keys(data.demographics.audience_country).length;
  }, [data.demographics?.audience_country]);

  // Top cities count
  const topCitiesCount = useMemo(() => {
    if (!data.demographics?.audience_city) return 0;
    return Object.keys(data.demographics.audience_city).length;
  }, [data.demographics?.audience_city]);

  // Online followers peak
  const onlinePeak = useMemo(() => {
    if (!data.online_followers) return 0;
    return Math.max(...Object.values(data.online_followers));
  }, [data.online_followers]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="👥"
        title="Público"
        subtitle="Análise demográfica e comportamental"
      />

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Seguidores"
          value={formatNumber(followersCount)}
          tooltip="Número total de usuários que seguem sua conta comercial."
          icon={<Users className="h-5 w-5" />}
        />

        <MetricCard
          label="Mudança de Seguidores"
          value={
            followerChange !== undefined
              ? `${followerChange >= 0 ? '+' : ''}${followerChange.toFixed(1)}%`
              : '-'
          }
          tooltip="Comparativo do crescimento ou queda da base de seguidores em relação ao período anterior."
          icon={<TrendingUp className="h-5 w-5" />}
          trend={
            followerChange !== undefined
              ? {
                  value: followerChange,
                  isPositive: followerChange >= 0,
                }
              : undefined
          }
        />

        <MetricCard
          label="Novos Seguidores"
          value={formatNumber(newFollowers)}
          tooltip="Quantidade total de novos usuários que passaram a seguir o perfil no período selecionado."
          icon={<UserPlus className="h-5 w-5" />}
        />

        <MetricCard
          label="Proporção Seguidores/Seguindo"
          value={followRatio.toFixed(1)}
          tooltip="Razão entre número de seguidores e contas seguidas. Valores acima de 1 indicam mais seguidores que seguindo."
        />
      </div>

      {/* Métricas demográficas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {genderData && (
          <MetricCard
            label="Gênero Principal"
            value={
              genderData.female > genderData.male
                ? `${genderData.female}% ♀`
                : `${genderData.male}% ♂`
            }
            tooltip="Distribuição percentual do público entre masculino, feminino e outras categorias identificadas."
          />
        )}

        {topCountriesCount > 0 && (
          <MetricCard
            label="Países"
            value={topCountriesCount}
            tooltip="Ranking detalhado dos principais países onde seus seguidores estão localizados."
          />
        )}

        {topCitiesCount > 0 && (
          <MetricCard
            label="Cidades"
            value={topCitiesCount}
            tooltip="Ranking das cidades com maior concentração de seguidores do seu perfil."
          />
        )}

        {onlinePeak > 0 && (
          <MetricCard
            label="Pico de Atividade Online"
            value={formatNumber(onlinePeak)}
            tooltip="Mapa de calor (heatmap) que mostra os horários e dias da semana em que seus seguidores estão mais ativos."
          />
        )}
      </div>

      {/* Note: Full demographic charts (gender pie, age bars, country maps, online heatmap)
          are available on the dedicated Audience page */}
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Para visualizações detalhadas de demografia (gênero, idade, países, cidades e atividade online),
          acesse a página <strong>Público</strong> no menu lateral.
        </p>
      </div>
    </div>
  );
}
