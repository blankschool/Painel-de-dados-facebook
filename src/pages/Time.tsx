import { useMemo, useState } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach, type IgMediaItem } from "@/utils/ig";
import { SortToggle, SortDropdown, type SortOrder } from "@/components/ui/SortToggle";
import { PostDetailModal } from "@/components/PostDetailModal";
import { usePostClick } from "@/hooks/usePostClick";
import { Heart, MessageCircle, Eye, Play, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const dayLabels = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatCompact(value: number | null): string {
  if (value === null) return "--";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(".", ",")} mi`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".", ",")} mil`;
  return value.toLocaleString();
}

export default function Time() {
  const { data, loading, error } = useDashboardData();
  const allMedia = data?.media ?? [];
  const media = useFilteredMedia(allMedia);

  // Post click handling
  const { selectedPost, isModalOpen, handlePostClick, closeModal } = usePostClick("modal");

  // Sort states
  const [daySort, setDaySort] = useState<SortOrder>("desc");
  const [daySortBy, setDaySortBy] = useState<"reach" | "count">("reach");
  const [monthSort, setMonthSort] = useState<SortOrder>("desc");
  const [monthSortBy, setMonthSortBy] = useState<"reach" | "likes" | "er">("reach");

  // Day posts modal
  const [selectedDayPosts, setSelectedDayPosts] = useState<{ day: string; posts: IgMediaItem[] } | null>(null);

  const totalReach = media.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);

  const avgEr = useMemo(() => {
    const values = media.map((m) => getComputedNumber(m, "er")).filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }, [media]);

  // Performance by day of week with sorting
  const dayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ reach: 0, count: 0, posts: [] as IgMediaItem[] }));
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const reach = getReach(item) ?? 0;
      buckets[dt.getDay()].reach += reach;
      buckets[dt.getDay()].count += 1;
      buckets[dt.getDay()].posts.push(item);
    }
    const max = Math.max(...buckets.map((b) => b.reach), 1);
    const rawData = buckets.map((bucket, idx) => ({
      label: dayLabels[idx],
      value: bucket.reach,
      count: bucket.count,
      posts: bucket.posts,
      height: Math.round((bucket.reach / max) * 180),
    }));

    return [...rawData].sort((a, b) => {
      const aVal = daySortBy === "reach" ? a.value : a.count;
      const bVal = daySortBy === "reach" ? b.value : b.count;
      return daySort === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [media, daySort, daySortBy]);

  // Monthly aggregation with sorting
  const monthlyData = useMemo(() => {
    const buckets: Record<string, { reach: number; likes: number; comments: number; ers: number[]; posts: IgMediaItem[] }> = {};
    for (const item of media) {
      if (!item.timestamp) continue;
      const d = new Date(item.timestamp);
      const key = `${d.toLocaleDateString("pt-BR", { month: "short" })}. de ${d.getFullYear()}`;
      if (!buckets[key]) buckets[key] = { reach: 0, likes: 0, comments: 0, ers: [], posts: [] };
      buckets[key].reach += getReach(item) ?? 0;
      buckets[key].likes += item.like_count ?? 0;
      buckets[key].comments += item.comments_count ?? 0;
      buckets[key].posts.push(item);
      const er = getComputedNumber(item, "er");
      if (typeof er === "number") buckets[key].ers.push(er);
    }
    const rawData = Object.entries(buckets).map(([label, v]) => ({
      label,
      reach: v.reach,
      likes: v.likes,
      comments: v.comments,
      posts: v.posts,
      er: v.ers.length ? v.ers.reduce((s, x) => s + x, 0) / v.ers.length : null,
    }));

    return [...rawData].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (monthSortBy) {
        case "likes": aVal = a.likes; bVal = b.likes; break;
        case "er": aVal = a.er ?? 0; bVal = b.er ?? 0; break;
        default: aVal = a.reach; bVal = b.reach;
      }
      return monthSort === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [media, monthSort, monthSortBy]);

  // Handler for day bar click - show all posts for that day
  const handleDayClick = (day: string, posts: IgMediaItem[]) => {
    if (posts.length > 0) {
      setSelectedDayPosts({ day, posts });
    }
  };

  // Handler for monthly row click
  const handleMonthClick = (posts: IgMediaItem[]) => {
    if (posts.length > 0) {
      const bestPost = [...posts].sort((a, b) => 
        (getReach(b) ?? 0) - (getReach(a) ?? 0)
      )[0];
      handlePostClick(bestPost);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <FiltersBar showMediaType />

      <div className="content-area space-y-6">
        {/* Performance By Day Of Week */}
        <div className="card">
          <div className="chart-header flex justify-between items-center">
            <div>
              <h3 className="card-title">Performance por Dia da Semana</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-dot solid" /> Alcance
                </div>
              </div>
            </div>
            <SortDropdown
              sortBy={daySortBy}
              sortOrder={daySort}
              options={[
                { value: "reach", label: "Alcance" },
                { value: "count", label: "Publicações" },
              ]}
              onSortByChange={(v) => setDaySortBy(v as "reach" | "count")}
              onSortOrderChange={() => setDaySort(o => o === "desc" ? "asc" : "desc")}
            />
          </div>
          <div className="bar-chart" style={{ height: 240 }}>
            <div className="bar-chart-y" style={{ fontSize: 10 }}>
              <span>{formatCompact(Math.max(...dayData.map((d) => d.value)))}</span>
              <span>{formatCompact(Math.max(...dayData.map((d) => d.value)) * 0.75)}</span>
              <span>{formatCompact(Math.max(...dayData.map((d) => d.value)) * 0.5)}</span>
              <span>{formatCompact(Math.max(...dayData.map((d) => d.value)) * 0.25)}</span>
              <span>0</span>
            </div>
            {dayData.map((d, idx) => (
              <div
                key={d.label}
                className="bar-group cursor-pointer hover:opacity-80 transition-opacity relative group"
                style={idx === 0 ? { marginLeft: 40 } : undefined}
                onClick={() => handleDayClick(d.label, d.posts)}
              >
                <div className="bar" style={{ height: `${Math.max(12, d.height)}px` }}>
                  <span className="bar-value">{formatCompact(d.value)}</span>
                </div>
                <span className="bar-label">{d.label}</span>
                {/* Hover tooltip */}
                {d.count > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg">
                      <div className="font-semibold mb-1">{d.label}</div>
                      <div>{d.count} publicaç{d.count === 1 ? 'ão' : 'ões'}</div>
                      <div className="text-muted-foreground text-[10px] mt-1">Clique para ver todos</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time Analysis Table */}
        <div className="card">
          <div className="chart-header flex justify-between items-center">
            <h3 className="card-title">Análise Temporal</h3>
            <SortDropdown
              sortBy={monthSortBy}
              sortOrder={monthSort}
              options={[
                { value: "reach", label: "Alcance" },
                { value: "likes", label: "Curtidas" },
                { value: "er", label: "Engajamento" },
              ]}
              onSortByChange={(v) => setMonthSortBy(v as "reach" | "likes" | "er")}
              onSortOrderChange={() => setMonthSort(o => o === "desc" ? "asc" : "desc")}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Alcance de mídia {monthSortBy === "reach" && (monthSort === "desc" ? "▼" : "▲")}</th>
                  <th>Taxa de engajamento {monthSortBy === "er" && (monthSort === "desc" ? "▼" : "▲")}</th>
                  <th>Curtidas {monthSortBy === "likes" && (monthSort === "desc" ? "▼" : "▲")}</th>
                  <th>Comentários</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr 
                    key={row.label}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleMonthClick(row.posts)}
                  >
                    <td className="font-medium">{row.label}</td>
                    <td>{row.reach.toLocaleString()}</td>
                    <td>{formatPercent(row.er)}</td>
                    <td>{row.likes.toLocaleString()}</td>
                    <td>{row.comments.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="font-semibold border-t-2 border-border">
                  <td>Total geral</td>
                  <td>{totalReach.toLocaleString()}</td>
                  <td>{formatPercent(avgEr)}</td>
                  <td>{totalLikes.toLocaleString()}</td>
                  <td>{totalComments.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-4 text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      <PostDetailModal post={selectedPost} isOpen={isModalOpen} onClose={closeModal} />

      {/* Day Posts Modal - Shows all posts for selected day */}
      <Dialog open={!!selectedDayPosts} onOpenChange={() => setSelectedDayPosts(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Publicações de {selectedDayPosts?.day}
            </DialogTitle>
            <DialogDescription>
              {selectedDayPosts?.posts.length} publicaç{selectedDayPosts?.posts.length === 1 ? 'ão' : 'ões'} encontrada{selectedDayPosts?.posts.length === 1 ? '' : 's'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {selectedDayPosts?.posts
              .sort((a, b) => (getReach(b) ?? 0) - (getReach(a) ?? 0))
              .map((post) => (
                <div
                  key={post.id}
                  className="border border-border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer"
                  onClick={() => {
                    handlePostClick(post);
                    setSelectedDayPosts(null);
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-secondary">
                    {post.media_url || post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url || post.media_url}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {(post.media_product_type === "REELS" || post.media_product_type === "REEL") ? (
                          <Play className="w-12 h-12 text-muted-foreground/50" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                        )}
                      </div>
                    )}
                    {/* Reel indicator */}
                    {(post.media_product_type === "REELS" || post.media_product_type === "REEL") && (
                      <div className="absolute top-2 right-2 bg-black/60 rounded p-1">
                        <Play className="w-3 h-3 text-white" fill="white" />
                      </div>
                    )}
                    {/* Click hint */}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <ExternalLink className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="p-3 bg-card">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{(post.like_count ?? 0).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{(post.comments_count ?? 0).toLocaleString("pt-BR")}</span>
                      </div>
                      {getReach(post) && (
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{getReach(post)?.toLocaleString("pt-BR")}</span>
                        </div>
                      )}
                    </div>
                    {post.timestamp && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(post.timestamp).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
