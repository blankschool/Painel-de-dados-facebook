import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, MessageCircle, Bookmark, Share2, Eye, Users, Play, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { IgMediaItem } from '@/utils/ig';
import { getReach, getViews, getSaves, getShares, getEngagement } from '@/utils/ig';

interface TopPostCardProps {
  post: IgMediaItem;
  rank?: number;
  followersCount?: number;
  onClick?: () => void;
  variant?: 'horizontal' | 'compact';
}

function formatNumber(value: number | null): string {
  if (value === null) return '--';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function getMediaTypeLabel(post: IgMediaItem): string {
  if (post.media_product_type === 'REELS' || post.media_type === 'REELS') return 'Reel';
  if (post.media_type === 'CAROUSEL_ALBUM') return 'Carrossel';
  if (post.media_type === 'VIDEO') return 'Vídeo';
  return 'Foto';
}

function getMediaTypeColor(post: IgMediaItem): string {
  if (post.media_product_type === 'REELS' || post.media_type === 'REELS') return 'bg-pink-500';
  if (post.media_type === 'CAROUSEL_ALBUM') return 'bg-blue-500';
  if (post.media_type === 'VIDEO') return 'bg-purple-500';
  return 'bg-green-500';
}

export function TopPostCard({ 
  post, 
  rank, 
  followersCount = 0, 
  onClick,
  variant = 'horizontal'
}: TopPostCardProps) {
  const thumbnail = post.thumbnail_url || post.media_url;
  const likes = post.like_count ?? 0;
  const comments = post.comments_count ?? 0;
  const saves = getSaves(post) ?? 0;
  const shares = getShares(post) ?? 0;
  const reach = getReach(post);
  const views = getViews(post);
  const engagement = getEngagement(post);
  
  const engagementRate = followersCount > 0 
    ? ((engagement / followersCount) * 100).toFixed(2)
    : null;

  const formattedDate = post.timestamp 
    ? format(new Date(post.timestamp), "EEE, dd MMM yyyy", { locale: ptBR })
    : '--';

  const isReel = post.media_product_type === 'REELS' || post.media_type === 'REELS';

  if (variant === 'compact') {
    return (
      <div 
        className="flex gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
        onClick={onClick}
      >
        {/* Thumbnail */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Play className="w-6 h-6" />
            </div>
          )}
          {rank && (
            <div className="absolute top-0 left-0 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center rounded-br">
              {rank}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={`${getMediaTypeColor(post)} text-white text-[10px] px-1.5`}>
              {getMediaTypeLabel(post)}
            </Badge>
            {engagementRate && (
              <span className="text-xs font-semibold text-primary">
                ER: {engagementRate}%
              </span>
            )}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> {formatNumber(likes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> {formatNumber(comments)}
            </span>
            {isReel && views !== null && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {formatNumber(views)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Horizontal variant (Minter-style)
  return (
    <div 
      className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt="" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play className="w-10 h-10" />
          </div>
        )}
        {rank && (
          <div className="absolute top-0 left-0 w-7 h-7 bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center rounded-br-lg">
            {rank}
          </div>
        )}
        <Badge 
          variant="secondary" 
          className={`absolute bottom-1 right-1 ${getMediaTypeColor(post)} text-white text-[10px] px-1.5`}
        >
          {getMediaTypeLabel(post)}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {formattedDate}
            </p>
            {engagementRate && (
              <p className="text-lg font-bold text-primary mt-0.5">
                ER: {engagementRate}%
              </p>
            )}
          </div>
          {post.permalink && (
            <a 
              href={post.permalink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2">
          <div className="flex items-center gap-1.5 text-sm">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-medium">{formatNumber(likes)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{formatNumber(comments)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Bookmark className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{formatNumber(saves)}</span>
          </div>
          
          {(isReel && views !== null) && (
            <div className="flex items-center gap-1.5 text-sm">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="font-medium">{formatNumber(views)}</span>
            </div>
          )}
          {reach !== null && (
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-green-500" />
              <span className="font-medium">{formatNumber(reach)}</span>
            </div>
          )}
          {shares > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Share2 className="w-4 h-4 text-cyan-500" />
              <span className="font-medium">{formatNumber(shares)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Gallery component for displaying multiple top posts
interface TopPostsGalleryProps {
  posts: IgMediaItem[];
  followersCount?: number;
  onPostClick?: (post: IgMediaItem) => void;
  maxItems?: number;
  variant?: 'horizontal' | 'compact';
}

export function TopPostsGallery({
  posts,
  followersCount = 0,
  onPostClick,
  maxItems = 5,
  variant = 'horizontal',
}: TopPostsGalleryProps) {
  const displayPosts = posts.slice(0, maxItems);

  if (displayPosts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum post encontrado
      </div>
    );
  }

  return (
    <div className={variant === 'horizontal' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
      {displayPosts.map((post, index) => (
        <TopPostCard
          key={post.id}
          post={post}
          rank={index + 1}
          followersCount={followersCount}
          onClick={() => onPostClick?.(post)}
          variant={variant}
        />
      ))}
    </div>
  );
}
