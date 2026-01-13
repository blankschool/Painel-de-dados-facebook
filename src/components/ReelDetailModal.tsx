import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Bookmark, Share2, Eye, ExternalLink, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { IgMediaItem } from "@/utils/ig";
import { getSaves, getShares, getReach, getViews, getComputedNumber } from "@/utils/ig";

interface ReelDetailModalProps {
  reel: IgMediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReelDetailModal({ reel, isOpen, onClose }: ReelDetailModalProps) {
  if (!reel) return null;

  const imageUrl = reel.thumbnail_url || reel.media_url;

  const openInInstagram = () => {
    if (reel.permalink) {
      window.open(reel.permalink, "_blank", "noopener,noreferrer");
    }
  };

  const saves = getSaves(reel);
  const shares = getShares(reel);
  const reach = getReach(reel);
  const views = getViews(reel);
  const er = getComputedNumber(reel, "er");

  const metrics = [
    { label: "Visualizações", value: views, icon: Eye },
    { label: "Curtidas", value: reel.like_count, icon: Heart },
    { label: "Comentários", value: reel.comments_count, icon: MessageCircle },
    { label: "Salvos", value: saves, icon: Bookmark },
    { label: "Compartilhamentos", value: shares, icon: Share2 },
    { label: "Alcance", value: reach, icon: Eye },
  ].filter(m => m.value !== null && m.value !== undefined);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Detalhes do Reel</span>
            </div>
            <button
              onClick={openInInstagram}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no Instagram
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Video Preview */}
          <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted max-h-[400px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Reel preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-8 h-8 text-foreground ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            {/* Date */}
            {reel.timestamp && (
              <p className="text-sm text-muted-foreground">
                Publicado {formatDistanceToNow(new Date(reel.timestamp), { addSuffix: true, locale: ptBR })}
              </p>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {metrics.map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {typeof value === "number" ? value.toLocaleString("pt-BR") : "-"}
                  </p>
                </div>
              ))}
            </div>

            {/* Engagement Rate */}
            {er !== null && (
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Taxa de Engajamento</p>
                <p className="text-2xl font-bold text-primary">{er.toFixed(2)}%</p>
              </div>
            )}

            {/* Caption Preview */}
            {reel.caption && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Legenda</p>
                <p className="text-sm line-clamp-6 bg-muted/30 p-3 rounded-lg">
                  {reel.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
