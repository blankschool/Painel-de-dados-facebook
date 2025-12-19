import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatPercent, getComputedNumber, getReach } from "@/utils/ig";

export default function Time() {
  const { data, loading, error } = useDashboardData();
  const media = data?.media ?? [];

  const totalReach = media.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);

  const avgEr = (() => {
    const values = media.map((m) => getComputedNumber(m, "er")).filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  })();

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
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="chart-header">
            <h3 className="card-title">Performance By Day of Week</h3>
            <div className="chart-actions">
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #e0e4e8", borderRadius: 12, background: "#fafbfc" }}>
            <div style={{ textAlign: "center", color: "#718096" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="1.5" style={{ width: 48, height: 48, marginBottom: 12 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#4a5568", marginBottom: 4 }}>Fonte de dados desconhecida</p>
              <p style={{ fontSize: 13 }}>Não foi possível carregar a fonte de dados associada a este componente</p>
              <a href="#" style={{ color: "#4facfe", fontSize: 13, textDecoration: "none", marginTop: 8, display: "inline-block" }}>Mais detalhes</a>
            </div>
          </div>
        </div>

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
          <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 12, color: "#718096" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Media Posted (Data)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 16, fontSize: 11, color: "#718096", paddingBottom: 12, borderBottom: "1px solid #f0f2f5" }}>
            <span></span>
            <span>Media reach</span>
            <span>Engagement rate</span>
            <span>Likes</span>
            <span>Comments</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 16, fontSize: 13, padding: "16px 0", borderBottom: "1px solid #f0f2f5" }}>
            <span>nov. de 2025</span>
            <span>{totalReach.toLocaleString()}</span>
            <span>{formatPercent(avgEr)}</span>
            <span>{totalLikes.toLocaleString()}</span>
            <span>{totalComments.toLocaleString()}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 16, fontSize: 13, padding: "16px 0", fontWeight: 600 }}>
            <span>Total geral</span>
            <span>{totalReach.toLocaleString()}</span>
            <span>{formatPercent(avgEr)}</span>
            <span>{totalLikes.toLocaleString()}</span>
            <span>{totalComments.toLocaleString()}</span>
          </div>
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
