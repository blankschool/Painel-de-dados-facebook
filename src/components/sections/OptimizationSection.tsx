import React, { useMemo } from 'react';
import { Clock, BarChart3 } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { MetricCard } from '../ui/MetricCard';
import {
  findBestTimeFromOnlineFollowers,
  findBestTimeFromEngagement,
  calculateEngagementByMediaType,
  formatTime,
  getDayName,
} from '@/lib/dashboardHelpers';

interface OptimizationSectionProps {
  data: {
    online_followers?: Record<string, number>;
    media?: Array<{
      timestamp: string;
      media_type: string;
      like_count: number;
      comments_count: number;
      insights?: { saved?: number };
    }>;
    media_type_distribution?: Record<string, number>;
    profile?: {
      followers_count?: number;
    };
  };
}

export function OptimizationSection({ data }: OptimizationSectionProps) {
  const followersCount = data.profile?.followers_count || 0;
  const media = data.media || [];

  // Best time based on online followers (activity)
  const bestTimeActivity = useMemo(() => {
    if (!data.online_followers) return null;
    return findBestTimeFromOnlineFollowers(data.online_followers);
  }, [data.online_followers]);

  // Best time based on historical engagement
  const bestTimeEngagement = useMemo(() => {
    if (media.length === 0) return null;
    return findBestTimeFromEngagement(media, followersCount);
  }, [media, followersCount]);

  // Media type distribution
  const mediaDistribution = useMemo(() => {
    if (data.media_type_distribution) {
      return data.media_type_distribution;
    }

    // Calculate manually from media array
    const distribution: Record<string, number> = {};
    media.forEach((post) => {
      const type = post.media_type || 'OTHER';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }, [data.media_type_distribution, media]);

  // Most engaging media type
  const mostEngagingType = useMemo(() => {
    if (media.length === 0) return null;

    const typeMetrics = calculateEngagementByMediaType(media, followersCount);
    if (typeMetrics.length === 0) return null;

    // Sort by avgER and get top type
    const sorted = typeMetrics.sort((a, b) => b.avgER - a.avgER);
    return sorted[0];
  }, [media, followersCount]);

  // Format media type name
  const formatMediaType = (type: string): string => {
    const typeNames: Record<string, string> = {
      IMAGE: 'Fotos',
      VIDEO: 'Vídeos',
      CAROUSEL_ALBUM: 'Carrosséis',
      REELS: 'Reels',
    };
    return typeNames[type] || type;
  };

  // Get total media count
  const totalMedia = Object.values(mediaDistribution).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        icon="⚙️"
        title="Otimização"
        subtitle="Insights para melhorar performance"
      />

      {/* Best times to post */}
      <div className="grid gap-4 md:grid-cols-2">
        {bestTimeActivity && (
          <MetricCard
            label="Melhor Horário (Atividade)"
            value={`${getDayName(bestTimeActivity.dayOfWeek)}, ${formatTime(
              bestTimeActivity.hour
            )}`}
            tooltip="Horário com maior volume de seguidores navegando no Instagram."
            icon={<Clock className="h-5 w-5" />}
          />
        )}

        {bestTimeEngagement && (
          <MetricCard
            label="Melhor Horário (Engajamento)"
            value={`${formatTime(bestTimeEngagement.hour)}`}
            tooltip="Análise histórica dos horários em que seus posts costumam receber mais interações."
            icon={<BarChart3 className="h-5 w-5" />}
          />
        )}
      </div>

      {/* Media type insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Distribuição por Tipo de Mídia"
          value={`${Object.keys(mediaDistribution).length} tipos`}
          tooltip="Divisão proporcional do seu conteúdo entre imagens únicas, vídeos (Reels) e carrosséis."
        />

        {mostEngagingType && (
          <MetricCard
            label="Tipo Mais Engajador"
            value={formatMediaType(mostEngagingType.type)}
            tooltip="Identificação de qual formato (foto, vídeo ou carrossel) gera a maior taxa de interação do público."
          />
        )}
      </div>

      {/* Media type breakdown */}
      {totalMedia > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h4 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Distribuição Detalhada
          </h4>
          <div className="space-y-3">
            {Object.entries(mediaDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const percentage = ((count / totalMedia) * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium">
                      {formatMediaType(type)}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-muted-foreground">
                      {percentage}%
                    </div>
                    <div className="w-16 text-right text-sm font-medium">
                      {count} posts
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
