import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Users, MessageCircle, Share2, ArrowRight, ArrowLeft, LogOut, Play, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StoryItem {
  id: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  media_type?: string;
  permalink?: string;
  insights?: {
    views?: number;
    reach?: number;
    replies?: number;
    shares?: number;
    taps_forward?: number;
    taps_back?: number;
    exits?: number;
    impressions?: number;
    completion_rate?: number;
  };
}

interface TopStoryCardProps {
  story: StoryItem;
  rank?: number;
  metric?: 'reach' | 'views' | 'replies' | 'completion';
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '--';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function TopStoryCard({ story, rank, metric = 'reach' }: TopStoryCardProps) {
  const thumbnail = story.thumbnail_url || story.media_url;
  const isVideo = story.media_type === 'VIDEO';
  
  const primaryValue = {
    reach: story.insights?.reach,
    views: story.insights?.views || story.insights?.impressions,
    replies: story.insights?.replies,
    completion: story.insights?.completion_rate,
  }[metric];

  const primaryLabel = {
    reach: 'alcance',
    views: 'views',
    replies: 'respostas',
    completion: '% conclusão',
  }[metric];

  const formattedDate = story.timestamp
    ? format(new Date(story.timestamp), "dd MMM, HH:mm", { locale: ptBR })
    : '--';

  return (
    <a
      href={story.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative w-14 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {isVideo ? <Play className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </div>
        )}
        {rank && (
          <div className="absolute top-0 left-0 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-br">
            {rank}
          </div>
        )}
        <Badge
          variant="secondary"
          className={`absolute bottom-0.5 right-0.5 text-[8px] px-1 py-0 ${
            isVideo ? 'bg-purple-500' : 'bg-green-500'
          } text-white`}
        >
          {isVideo ? 'Vídeo' : 'Foto'}
        </Badge>
      </div>

      {/* Metrics */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
        <p className="text-lg font-bold text-foreground">
          {metric === 'completion'
            ? `${primaryValue || 0}%`
            : formatNumber(primaryValue)}
          <span className="text-xs font-normal text-muted-foreground ml-1">{primaryLabel}</span>
        </p>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3" /> {formatNumber(story.insights?.reach)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-3 h-3" /> {formatNumber(story.insights?.replies)}
          </span>
        </div>
      </div>
    </a>
  );
}

interface TopStoriesGalleryProps {
  stories: StoryItem[];
  maxItems?: number;
  metric?: 'reach' | 'views' | 'replies' | 'completion';
}

export function TopStoriesGallery({
  stories,
  maxItems = 5,
  metric = 'reach',
}: TopStoriesGalleryProps) {
  // Sort by the selected metric
  const sortedStories = [...stories]
    .sort((a, b) => {
      const getMetricValue = (s: StoryItem) => {
        switch (metric) {
          case 'reach': return s.insights?.reach || 0;
          case 'views': return s.insights?.views || s.insights?.impressions || 0;
          case 'replies': return s.insights?.replies || 0;
          case 'completion': return s.insights?.completion_rate || 0;
          default: return 0;
        }
      };
      return getMetricValue(b) - getMetricValue(a);
    })
    .slice(0, maxItems);

  if (sortedStories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum story encontrado
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedStories.map((story, index) => (
        <TopStoryCard key={story.id} story={story} rank={index + 1} metric={metric} />
      ))}
    </div>
  );
}
