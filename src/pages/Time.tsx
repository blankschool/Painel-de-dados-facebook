import { useMemo, useState } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach, type IgMediaItem } from "@/utils/ig";
import { getWeekdayInTimezone } from "@/utils/dateFormat";
import { SortToggle, SortDropdown, type SortOrder } from "@/components/ui/SortToggle";
import { PostDetailModal } from "@/components/PostDetailModal";
import { usePostClick } from "@/hooks/usePostClick";
import { useAuth } from "@/contexts/AuthContext";

const dayLabels = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatCompact(value: number | null): string {
  if (value === null) return "--";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(".", ",")} mi`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".", ",")} mil`;
  return value.toLocaleString();
}

function getMonthLabelInTimezone(date: Date | string, timezone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, month: "short", year: "numeric" }).format(d);
  } catch {
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  }
}

export default function Time() {
  const { data, loading, error } = useDashboardData();
  const { selectedAccount } = useAuth();
  const allMedia = data?.media ?? [];
  const timezone = selectedAccount?.timezone || "America/Sao_Paulo";
  const media = useFilteredMedia(allMedia, timezone);

  // Post click handling
  const { selectedPost, isModalOpen, handlePostClick, closeModal } = usePostClick("modal");

  // Sort states
  const [daySort, setDaySort] = useState<SortOrder>("desc");
  const [daySortBy, setDaySortBy] = useState<"reach" | "count">("reach");
  const [monthSort, setMonthSort] = useState<SortOrder>("desc");
  const [monthSortBy, setMonthSortBy] = useState<"reach" | "likes" | "er">("reach");

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
      const dayIndex = getWeekdayInTimezone(item.timestamp, timezone);
      const reach = getReach(item) ?? 0;
      buckets[dayIndex].reach += reach;
      buckets[dayIndex].count += 1;
      buckets[dayIndex].posts.push(item);
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
      const key = getMonthLabelInTimezone(item.timestamp, timezone);
      if (!key) continue;
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

  // Handler for day bar click
  const handleDayClick = (posts: IgMediaItem[]) => {
    if (posts.length > 0) {
      const bestPost = [...posts].sort((a, b) => 
        (getReach(b) ?? 0) - (getReach(a) ?? 0)
      )[0];
      handlePostClick(bestPost);
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
                className="bar-group cursor-pointer hover:opacity-80 transition-opacity" 
                style={idx === 0 ? { marginLeft: 40 } : undefined}
                onClick={() => handleDayClick(d.posts)}
              >
                <div className="bar" style={{ height: `${Math.max(12, d.height)}px` }}>
                  <span className="bar-value">{formatCompact(d.value)}</span>
                </div>
                <span className="bar-label">{d.label}</span>
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
    </>
  );
}
