import { useMemo } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach } from "@/utils/ig";

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

  // Debug logging
  console.log(`[Time] All media: ${allMedia.length}, Filtered: ${media.length}`);

  const totalReach = media.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);

  const avgEr = useMemo(() => {
    const values = media.map((m) => getComputedNumber(m, "er")).filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }, [media]);

  // Performance by day of week
  const dayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ reach: 0, count: 0 }));
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const reach = getReach(item) ?? 0;
      buckets[dt.getDay()].reach += reach;
      buckets[dt.getDay()].count += 1;
    }
    const max = Math.max(...buckets.map((b) => b.reach), 1);
    return buckets.map((bucket, idx) => ({
      label: dayLabels[idx],
      value: bucket.reach,
      count: bucket.count,
      height: Math.round((bucket.reach / max) * 180),
    }));
  }, [media]);

  // Monthly aggregation for Time Analysis
  const monthlyData = useMemo(() => {
    const buckets: Record<string, { reach: number; likes: number; comments: number; ers: number[] }> = {};
    for (const item of media) {
      if (!item.timestamp) continue;
      const d = new Date(item.timestamp);
      const key = `${d.toLocaleDateString("pt-BR", { month: "short" })}. de ${d.getFullYear()}`;
      if (!buckets[key]) buckets[key] = { reach: 0, likes: 0, comments: 0, ers: [] };
      buckets[key].reach += getReach(item) ?? 0;
      buckets[key].likes += item.like_count ?? 0;
      buckets[key].comments += item.comments_count ?? 0;
      const er = getComputedNumber(item, "er");
      if (typeof er === "number") buckets[key].ers.push(er);
    }
    return Object.entries(buckets).map(([label, v]) => ({
      label,
      reach: v.reach,
      likes: v.likes,
      comments: v.comments,
      er: v.ers.length ? v.ers.reduce((s, x) => s + x, 0) / v.ers.length : null,
    }));
  }, [media]);

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
          <div className="chart-header">
            <h3 className="card-title">Performance By Day Of Week</h3>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot solid" /> Reach
              </div>
            </div>
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
              <div key={d.label} className="bar-group" style={idx === 0 ? { marginLeft: 40 } : undefined}>
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
          <div className="chart-header">
            <h3 className="card-title">Time Analysis</h3>
            <div className="chart-actions">
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Media Posted (Data)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Media reach</th>
                  <th>Engagement rate</th>
                  <th>Likes</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr key={row.label}>
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
    </>
  );
}
