import { useMemo, useState } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { formatPercent, getComputedNumber, getReach } from "@/utils/ig";
import { Image, Play, Clock, Grid2X2 } from "lucide-react";

type ContentTab = "overview" | "posts" | "reels" | "stories";

export default function Content() {
  const { data, loading, error } = useDashboardData();
  const allMedia = data?.media ?? [];
  const media = useFilteredMedia(allMedia);
  const [activeTab, setActiveTab] = useState<ContentTab>("overview");

  // Debug logging
  console.log(`[Content] All media: ${allMedia.length}, Filtered: ${media.length}`);

  const counts = useMemo(() => {
    const posts = media.filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM");
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
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const tabs: { id: ContentTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "posts", label: "Posts" },
    { id: "reels", label: "Reels" },
    { id: "stories", label: "Stories" },
  ];

  return (
    <>
      <FiltersBar showMediaType />

      <div className="content-area space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Metrics + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="metrics-card flex-row p-4">
              <div className="metric-icon blue w-11 h-11">
                <Grid2X2 className="w-5 h-5" />
              </div>
              <div className="metric-item">
                <span className="metric-label">Media</span>
                <span className="metric-value">{counts.media}</span>
              </div>
            </div>
            <div className="metrics-card flex-row p-4">
              <div className="metric-icon blue w-11 h-11">
                <Image className="w-5 h-5" />
              </div>
              <div className="metric-item">
                <span className="metric-label">Posts</span>
                <span className="metric-value">{counts.posts}</span>
              </div>
            </div>
            <div className="metrics-card flex-row p-4">
              <div className="metric-icon blue w-11 h-11">
                <Play className="w-5 h-5" />
              </div>
              <div className="metric-item">
                <span className="metric-label">Reels</span>
                <span className="metric-value">{counts.reels || "-"}</span>
              </div>
            </div>
            <div className="metrics-card flex-row p-4">
              <div className="metric-icon blue w-11 h-11">
                <Clock className="w-5 h-5" />
              </div>
              <div className="metric-item">
                <span className="metric-label">Stories</span>
                <span className="metric-value">{counts.stories || "-"}</span>
              </div>
            </div>
          </div>
          
          <div className="card lg:col-span-3">
            <div className="chart-header">
              <h3 className="card-title">Posted Content Over Time</h3>
            </div>
            <div className="chart-legend mb-4">
              <div className="legend-item"><span className="legend-dot solid" /> FEED</div>
            </div>
            <div className="h-48 relative">
              <div className="chart-grid" style={{ paddingBottom: 30 }}>
                <div className="grid-line"><span className="grid-label">5</span></div>
                <div className="grid-line"><span className="grid-label">4</span></div>
                <div className="grid-line"><span className="grid-label">3</span></div>
                <div className="grid-line"><span className="grid-label">2</span></div>
                <div className="grid-line"><span className="grid-label">1</span></div>
                <div className="grid-line"><span className="grid-label">0</span></div>
              </div>
              <div className="absolute top-5 left-10 right-2 bottom-10">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,140 L100,110 L200,40 L300,50 L400,30 L500,60" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                  {weekly.map((_, idx) => (
                    <circle key={idx} cx={idx * 100} cy={idx === 0 ? 140 : 110} r="4" fill="hsl(var(--primary))" />
                  ))}
                </svg>
              </div>
              <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[9px] text-muted-foreground">
                {weekly.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Media Type Analysis Table */}
        <div className="card">
          <div className="chart-header">
            <h3 className="card-title">Media Type Analysis</h3>
          </div>
          <div className="flex gap-2 mb-4 text-xs text-muted-foreground items-center">
            <span>Media ID</span>
            <span className="text-foreground">Contém</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="6,9 12,15 18,9"/></svg>
            <span className="text-muted-foreground ml-2">Insira um valor</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Media Product Type</th>
                  <th>Media reach ▼</th>
                  <th>Engagement rate</th>
                  <th>Likes</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {mediaTypes.map((row, idx) => (
                  <tr key={row.key}>
                    <td className="text-muted-foreground">{idx + 1}.</td>
                    <td className="font-medium">{row.key}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{row.reach.toLocaleString()}</span>
                        <div className="w-20 h-2 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary rounded" style={{ width: "100%" }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{formatPercent(row.er)}</span>
                        <div className="w-20 h-2 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary/60 rounded" style={{ width: "75%" }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{row.likes.toLocaleString()}</span>
                        <div className="w-20 h-2 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary rounded" style={{ width: "100%" }} />
                        </div>
                      </div>
                    </td>
                    <td>{row.comments.toLocaleString()}</td>
                  </tr>
                ))}
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
