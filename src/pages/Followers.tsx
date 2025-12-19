import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Followers() {
  const { data, loading, error } = useDashboardData();
  const demographics = (data?.demographics as Record<string, Record<string, number>> | undefined) ?? {};
  const followersCount = data?.profile?.followers_count ?? 0;
  const followsCount = data?.profile?.follows_count ?? 0;

  const ageGroups = demographics.audience_gender_age
    ? (() => {
        const out: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const age = key.split(".")[1];
          if (age) out[age] = (out[age] || 0) + value;
        });
        return Object.entries(out).map(([range, value]) => ({ range, value }));
      })()
    : [];

  const countries = demographics.audience_country
    ? Object.entries(demographics.audience_country)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({ key, value }))
    : [];

  const cities = demographics.audience_city
    ? Object.entries(demographics.audience_city)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({ key, value }))
    : [];

  const genders = demographics.audience_gender_age
    ? (() => {
        const genderTotals: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const gender = key.split(".")[0];
          genderTotals[gender] = (genderTotals[gender] || 0) + value;
        });
        return Object.entries(genderTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([key, value]) => ({ key, value }));
      })()
    : [];

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
          <div className="metrics-card">
            <div className="metric-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Followers</span>
                <span className="metric-value">{followersCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="metrics-card">
            <div className="metric-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Follows</span>
                <span className="metric-value">{followsCount.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: "#a0aec0" }}>N/A</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 24 }}>
          <div className="card">
            <h3 className="card-title">Followers By Age Group</h3>
            <div className="chart-legend" style={{ marginBottom: 16 }}>
              <div className="legend-item">
                <span className="legend-dot solid" /> Followers
              </div>
            </div>
            <div className="bar-chart" style={{ height: 200 }}>
              <div className="bar-chart-y" style={{ fontSize: 10 }}>
                <span>600</span>
                <span>400</span>
                <span>200</span>
                <span>0</span>
              </div>
              {ageGroups.map((group, idx) => (
                <div key={group.range} className="bar-group" style={idx === 0 ? { marginLeft: 35 } : undefined}>
                  <div className="bar" style={{ height: Math.max(8, Math.min(160, group.value / 3)), width: 24 }} />
                  <span className="bar-label">{group.range}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="chart-header">
              <h3 className="card-title">Followers By Location</h3>
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
            <div style={{ position: "relative", height: 220, background: "#f0f7ff", borderRadius: 8, overflow: "hidden" }}>
              <svg viewBox="0 0 800 400" style={{ width: "100%", height: "100%" }}>
                <path d="M150,180 L160,175 L165,180 L170,178 L175,182 L180,185 L178,190 L172,195 L165,192 L158,188 L155,185 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
                <path d="M200,160 L230,155 L250,160 L260,165 L265,175 L260,185 L250,190 L235,188 L220,185 L210,180 L205,170 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
                <path d="M280,140 L350,135 L400,140 L420,150 L430,165 L425,180 L410,190 L380,195 L340,192 L300,185 L285,170 L280,155 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
                <path d="M440,120 L520,115 L580,125 L620,140 L640,160 L635,185 L610,200 L560,210 L500,205 L460,190 L445,165 L440,140 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
                <path d="M320,200 L340,195 L355,200 L360,210 L355,225 L340,235 L320,230 L310,220 L315,205 Z" fill="#4facfe" stroke="#2196f3" strokeWidth="1"/>
                <circle cx="338" cy="215" r="8" fill="#2196f3"/>
                <path d="M480,240 L510,235 L530,245 L540,260 L535,280 L515,295 L490,290 L475,275 L478,255 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
                <path d="M560,250 L580,245 L595,250 L605,265 L600,285 L585,300 L565,295 L555,280 L558,260 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
                <path d="M600,180 L700,170 L750,190 L760,220 L745,260 L700,280 L640,275 L610,250 L605,215 Z" fill="#e3f2fd" stroke="#90cdf4" strokeWidth="0.5"/>
              </svg>
              <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#718096" }}>
                <span style={{ background: "#e3f2fd", padding: "2px 8px", borderRadius: 4 }}>1</span>
                <div style={{ width: 120, height: 8, background: "linear-gradient(90deg,#e3f2fd 0%,#4facfe 100%)", borderRadius: 4 }} />
                <span>{countries[0]?.value?.toLocaleString() ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Follower Demographics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, marginTop: 20 }}>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: "#718096", paddingBottom: 8, borderBottom: "1px solid #f0f2f5" }}>
                <span>Country</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 12 }}>
                {countries.map((row) => (
                  <div key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                    <span>{row.key}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{row.value.toLocaleString()}</span>
                      <div style={{ width: 60, height: 6, background: "#e8f4fd", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (row.value / (countries[0]?.value || 1)) * 100)}%`, height: "100%", background: "#4facfe" }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: "#718096", paddingBottom: 8, borderBottom: "1px solid #f0f2f5" }}>
                <span>City</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 12 }}>
                {cities.map((row) => (
                  <div key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                    <span>{row.key}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{row.value.toLocaleString()}</span>
                      <div style={{ width: 60, height: 6, background: "#e8f4fd", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (row.value / (cities[0]?.value || 1)) * 100)}%`, height: "100%", background: "#4facfe" }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: "#718096", paddingBottom: 8, borderBottom: "1px solid #f0f2f5" }}>
                <span>Age</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 12 }}>
                {ageGroups.map((row) => (
                  <div key={row.range} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                    <span>{row.range}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{row.value.toLocaleString()}</span>
                      <div style={{ width: 60, height: 6, background: "#e8f4fd", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (row.value / (ageGroups[0]?.value || 1)) * 100)}%`, height: "100%", background: "#4facfe" }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, color: "#718096", paddingBottom: 8, borderBottom: "1px solid #f0f2f5" }}>
                <span>Gender</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 12 }}>
                {genders.map((row) => (
                  <div key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                    <span>{row.key}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{row.value.toLocaleString()}</span>
                      <div style={{ width: 60, height: 6, background: "#e8f4fd", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (row.value / (genders[0]?.value || 1)) * 100)}%`, height: "100%", background: "#4facfe" }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
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
