import { useMemo } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatNumberOrDash, formatPercent, getComputedNumber, getReach, getSaves, getViews } from "@/utils/ig";

const dayLabels = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatCompact(value: number | null): string {
  if (value === null) return "--";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(".", ",")} mi`;
  if (value >= 1000) return `${Math.round(value / 1000)} mil`;
  return value.toLocaleString();
}

export default function Overview() {
  const { data, loading, error } = useDashboardData();
  const profile = data?.profile ?? null;
  const media = data?.media ?? [];

  const totalViews = media.reduce((sum, item) => sum + (getViews(item) ?? 0), 0);
  const totalReach = media.reduce((sum, item) => sum + (getReach(item) ?? 0), 0);
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count ?? 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count ?? 0), 0);
  const totalSaves = media.reduce((sum, item) => sum + (getSaves(item) ?? 0), 0);
  const avgEr = useMemo(() => {
    const values = media.map((m) => getComputedNumber(m, "er")).filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }, [media]);
  const avgReach = media.length ? Math.round(totalReach / media.length) : null;

  const dayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => 0);
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const reach = getReach(item) ?? 0;
      buckets[dt.getDay()] += reach;
    }
    const max = Math.max(...buckets, 1);
    return buckets.map((value, idx) => ({
      label: dayLabels[idx],
      value,
      height: Math.round((value / max) * 160),
    }));
  }, [media]);

  const topContent = useMemo(() => {
    return [...media]
      .map((item) => ({
        item,
        er: getComputedNumber(item, "er") ?? 0,
      }))
      .sort((a, b) => b.er - a.er)
      .slice(0, 4);
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
      <FiltersBar />

      <div className="content-area">
        <div className="metrics-row">
          <div className="metrics-card primary">
            <div className="metric-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Media</span>
                <span className="metric-value">{media.length}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Followers</span>
                <span className="metric-value">{profile?.followers_count?.toLocaleString() ?? "--"}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Follows</span>
                <span className="metric-value">{profile?.follows_count?.toLocaleString() ?? "--"}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Views</span>
                <span className="metric-value">{formatNumberOrDash(totalViews)}</span>
                <span className="metric-change up">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18,15 12,9 6,15" />
                  </svg>
                  --
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Reach</span>
                <span className="metric-value">{formatNumberOrDash(totalReach)}</span>
                <span className="metric-change up">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18,15 12,9 6,15" />
                  </svg>
                  --
                </span>
              </div>
            </div>
          </div>
          <div className="metrics-card">
            <div className="metric-icon search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Media reach</span>
                <span className="metric-value">{formatCompact(avgReach)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Engagement rate</span>
                <span className="metric-value">{formatPercent(avgEr)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Likes</span>
                <span className="metric-value">{formatNumberOrDash(totalLikes)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Comments</span>
                <span className="metric-value">{formatNumberOrDash(totalComments)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Saves</span>
                <span className="metric-value">{formatNumberOrDash(totalSaves)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-section">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Performance Over Time</h3>
              <div className="chart-legend" style={{ marginTop: 8 }}>
                <div className="legend-item">
                  <span className="legend-dot solid" /> Reach
                </div>
                <div className="legend-item">
                  <span className="legend-dot dashed" /> Reach (mês anterior)
                </div>
              </div>
            </div>
            <div className="chart-actions">
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18,15 12,9 6,15" />
                </svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                </svg>
              </button>
              <button className="chart-action-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </div>
          </div>
          <div className="chart-container">
            <div className="chart-grid">
              <div className="grid-line">
                <span className="grid-label">3 mil</span>
              </div>
              <div className="grid-line">
                <span className="grid-label">2 mil</span>
              </div>
              <div className="grid-line">
                <span className="grid-label">1 mil</span>
              </div>
              <div className="grid-line">
                <span className="grid-label">0</span>
              </div>
            </div>
            <div className="chart-line">
              <svg viewBox="0 0 1000 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#4facfe", stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: "#4facfe", stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path
                  d="M0,120 L30,80 L60,60 L90,75 L120,95 L150,110 L180,100 L210,115 L240,105 L270,120 L300,100 L330,90 L360,85 L390,95 L420,110 L450,120 L480,100 L510,90 L540,85 L570,80 L600,95 L630,100 L660,80 L690,70 L720,85 L750,75 L780,90 L810,80 L840,75 L870,85 L900,80 L930,70 L960,85 L1000,75"
                  fill="none"
                  stroke="#4facfe"
                  strokeWidth="2"
                />
                <path
                  d="M0,140 L30,150 L60,145 L90,155 L120,160 L150,155 L180,165 L210,160 L240,170 L270,165 L300,175 L330,170 L360,165 L390,175 L420,180 L450,170 L480,165 L510,175 L540,170 L570,180 L600,175 L630,170 L660,180 L690,175 L720,185 L750,180 L780,175 L810,185 L840,180 L870,190 L900,185 L930,180 L960,190 L1000,185"
                  fill="none"
                  stroke="#90cdf4"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                />
              </svg>
            </div>
            <div className="chart-x-axis">
              <span className="x-label">1 de nov.</span>
              <span className="x-label">3 de nov.</span>
              <span className="x-label">5 de nov.</span>
              <span className="x-label">7 de nov.</span>
              <span className="x-label">9 de nov.</span>
              <span className="x-label">11 de nov.</span>
              <span className="x-label">13 de nov.</span>
              <span className="x-label">15 de nov.</span>
              <span className="x-label">17 de nov.</span>
              <span className="x-label">19 de nov.</span>
              <span className="x-label">21 de nov.</span>
              <span className="x-label">23 de nov.</span>
              <span className="x-label">25 de nov.</span>
              <span className="x-label">27 de nov.</span>
              <span className="x-label">29 de nov.</span>
            </div>
          </div>
        </div>

        <div className="bottom-row">
          <div className="card">
            <h3 className="card-title">Performance By Day Of Week</h3>
            <div className="bar-chart">
              <div className="bar-chart-y">
                <span>8 mil</span>
                <span>6 mil</span>
                <span>4 mil</span>
                <span>2 mil</span>
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
          <div className="card">
            <h3 className="card-title">Engagement Breakdown</h3>
            <div className="engagement-chart">
              <div className="engagement-bar-container">
                <span className="engagement-label">FEED</span>
                <div className="engagement-bar-bg">
                  <div className="engagement-bar-fill" style={{ width: "85%" }} />
                </div>
              </div>
              <div className="engagement-scale">
                <span>0</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>100</span>
              </div>
              <div className="engagement-stats">
                <div className="stat-box">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <rect x="7" y="7" width="3" height="3" />
                      <rect x="14" y="7" width="3" height="3" />
                      <rect x="7" y="14" width="3" height="3" />
                      <rect x="14" y="14" width="3" height="3" />
                    </svg>
                  </div>
                  <span className="stat-label">Posts</span>
                  <span className="stat-value">{media.length}</span>
                </div>
                <div className="stat-box">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                  <span className="stat-label">Reels</span>
                  <span className="stat-value">-</span>
                </div>
                <div className="stat-box">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                  </div>
                  <span className="stat-label">Stories</span>
                  <span className="stat-value">-</span>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">Top Performing Content</h3>
            <div className="top-content-list">
              <div className="top-content-header">
                <span></span>
                <span>Media Preview</span>
                <span>Engagement rate ▼</span>
              </div>
              {topContent.map((row, index) => (
                <div className="top-content-item" key={row.item.id ?? index}>
                  <span className="item-rank">{index + 1}.</span>
                  <div
                    className="item-preview teal"
                    style={
                      row.item.thumbnail_url || row.item.media_url
                        ? { backgroundImage: `url(${row.item.thumbnail_url || row.item.media_url})`, backgroundSize: "cover" }
                        : undefined
                    }
                  />
                  <div className="item-engagement">
                    <span className="engagement-value">{formatPercent(row.er)}</span>
                    <div className="engagement-bar-small">
                      <div className="engagement-bar-small-fill" style={{ width: `${Math.max(10, row.er)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
