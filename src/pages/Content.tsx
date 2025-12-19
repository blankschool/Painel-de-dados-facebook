import { useMemo } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatPercent, getComputedNumber, getReach } from "@/utils/ig";

export default function Content() {
  const { data, loading, error } = useDashboardData();
  const media = data?.media ?? [];

  const counts = useMemo(() => {
    const posts = media.filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM" || m.media_type === "VIDEO");
    const reels = media.filter((m) => m.media_product_type === "REELS" || m.media_product_type === "REEL");
    return {
      media: media.length,
      posts: posts.length,
      reels: reels.length,
      stories: data?.stories?.length ?? 0,
    };
  }, [media, data?.stories?.length]);

  const weekly = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const item of media) {
      if (!item.timestamp) continue;
      const d = new Date(item.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-W${Math.ceil(d.getDate() / 7)}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    return Object.entries(buckets)
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [media]);

  const mediaTypes = useMemo(() => {
    const groups: Record<string, { reach: number; er: number; likes: number; comments: number; count: number }> = {};
    for (const item of media) {
      const key = item.media_product_type || item.media_type || "FEED";
      if (!groups[key]) groups[key] = { reach: 0, er: 0, likes: 0, comments: 0, count: 0 };
      groups[key].reach += getReach(item) ?? 0;
      groups[key].er += getComputedNumber(item, "er") ?? 0;
      groups[key].likes += item.like_count ?? 0;
      groups[key].comments += item.comments_count ?? 0;
      groups[key].count += 1;
    }
    return Object.entries(groups).map(([key, v]) => ({
      key,
      reach: v.reach,
      er: v.count ? v.er / v.count : 0,
      likes: v.likes,
      comments: v.comments,
    }));
  }, [media]);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <FiltersBar showMediaType />

      <div className="content-area">
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button className="tab-btn active" type="button">Overview</button>
          <button className="tab-btn" type="button">Posts</button>
          <button className="tab-btn" type="button">Reels</button>
          <button className="tab-btn" type="button">Stories</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="metrics-card" style={{ flexDirection: "row", padding: "16px 20px" }}>
              <div className="metric-icon blue" style={{ width: 44, height: 44 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <div className="metric-item">
                <span className="metric-label">Media</span>
                <span className="metric-value">{counts.media}</span>
              </div>
            </div>
            <div className="metrics-card" style={{ flexDirection: "row", padding: "16px 20px" }}>
              <div className="metric-icon blue" style={{ width: 44, height: 44 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <rect x="7" y="7" width="3" height="3" />
                  <rect x="14" y="7" width="3" height="3" />
                  <rect x="7" y="14" width="3" height="3" />
                  <rect x="14" y="14" width="3" height="3" />
                </svg>
              </div>
              <div className="metric-item">
                <span className="metric-label">Posts</span>
                <span className="metric-value">{counts.posts}</span>
              </div>
            </div>
            <div className="metrics-card" style={{ flexDirection: "row", padding: "16px 20px" }}>
              <div className="metric-icon blue" style={{ width: 44, height: 44 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <div className="metric-item">
                <span className="metric-label">Reels</span>
                <span className="metric-value">{counts.reels || "-"}</span>
              </div>
            </div>
            <div className="metrics-card" style={{ flexDirection: "row", padding: "16px 20px" }}>
              <div className="metric-icon blue" style={{ width: 44, height: 44 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div className="metric-item">
                <span className="metric-label">Stories</span>
                <span className="metric-value">{counts.stories || "-"}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="chart-header">
              <h3 className="card-title">Posted Content Over Time</h3>
              <div className="chart-actions">
                <button className="chart-action-btn" type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"/></svg>
                </button>
                <button className="chart-action-btn" type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
                </button>
                <button className="chart-action-btn" type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                </button>
                <button className="chart-action-btn" type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
                </button>
                <button className="chart-action-btn" type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
            </div>
            <div className="chart-legend" style={{ marginBottom: 16 }}>
              <div className="legend-item"><span className="legend-dot solid" /> FEED</div>
            </div>
            <div style={{ height: 200, position: "relative" }}>
              <div className="chart-grid" style={{ paddingBottom: 30 }}>
                <div className="grid-line"><span className="grid-label">5</span></div>
                <div className="grid-line"><span className="grid-label">4</span></div>
                <div className="grid-line"><span className="grid-label">3</span></div>
                <div className="grid-line"><span className="grid-label">2</span></div>
                <div className="grid-line"><span className="grid-label">1</span></div>
                <div className="grid-line"><span className="grid-label">0</span></div>
              </div>
              <div style={{ position: "absolute", top: 20, left: 40, right: 10, bottom: 40 }}>
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                  <path d="M0,140 L100,110 L200,40 L300,50 L400,30 L500,60" fill="none" stroke="#4facfe" strokeWidth="2" />
                  {weekly.map((_, idx) => (
                    <circle key={idx} cx={idx * 100} cy={idx === 0 ? 140 : 110} r="4" fill="#4facfe" />
                  ))}
                </svg>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 40, right: 0, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#a0aec0" }}>
                {weekly.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="chart-header">
            <h3 className="card-title">Media Type Analysis</h3>
            <div className="chart-actions">
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 12, color: "#718096" }}>
            <span>Media ID</span>
            <span style={{ color: "#4a5568" }}>Contém</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="6,9 12,15 18,9"/></svg>
            <span style={{ color: "#a0aec0", marginLeft: 8 }}>Insira um valor</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 1fr 1fr 1fr", gap: 16, fontSize: 11, color: "#718096", paddingBottom: 12, borderBottom: "1px solid #f0f2f5" }}>
            <span></span>
            <span>Media Product Type</span>
            <span>Media reach ▼</span>
            <span>Engagement rate</span>
            <span>Likes</span>
            <span>Comments</span>
          </div>
          {mediaTypes.map((row, idx) => (
            <div key={row.key} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 1fr 1fr 1fr", gap: 16, fontSize: 13, padding: "16px 0", borderBottom: "1px solid #f0f2f5", alignItems: "center" }}>
              <span style={{ color: "#718096" }}>{idx + 1}.</span>
              <span>{row.key}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{row.reach.toLocaleString()}</span>
                <div style={{ width: 80, height: 8, background: "#e8f4fd", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,#4facfe,#00c6fb)" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{formatPercent(row.er)}</span>
                <div style={{ width: 80, height: 8, background: "#fef3c7", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "75%", height: "100%", background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{row.likes.toLocaleString()}</span>
                <div style={{ width: 80, height: 8, background: "#e8f4fd", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,#4facfe,#00c6fb)" }} />
                </div>
              </div>
              <span>{row.comments.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: 16, color: "#c53030" }}>
            {error}
          </div>
        )}
      </div>
    </>
  );
}
