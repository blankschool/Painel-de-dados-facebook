import { Fragment, useMemo, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilteredMedia } from "@/hooks/useFilteredMedia";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import {
  formatNumberOrDash,
  formatPercent,
  getComputedNumber,
  getEngagement,
  getReach,
  getSaves,
  getScore,
  getShares,
  getViews,
  isReel,
  isVideoNonReel,
  type IgMediaItem,
} from "@/utils/ig";

type MediaFilter = "all" | "reels" | "video" | "image" | "carousel";
type OrderBy = "score" | "views" | "reach" | "er" | "interactions_per_1000_reach";
type HeatMetric = "score" | "views" | "engagement";

function formatLabel(item: IgMediaItem): string {
  if (isReel(item)) return "Reels";
  if (isVideoNonReel(item)) return "Vídeo";
  if (item.media_type === "CAROUSEL_ALBUM") return "Carrossel";
  return "Imagem";
}

function weekdayShortPt(day: number): string {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][day] ?? String(day);
}

export default function AdvancedAnalysis() {
  const { data, loading, error } = useDashboardData();
  const allMedia = data?.media ?? [];
  
  // Use the centralized filter hook
  const media = useFilteredMedia(allMedia);

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [orderBy, setOrderBy] = useState<OrderBy>("score");
  const [heatMetric, setHeatMetric] = useState<HeatMetric>("score");

  const profile = data?.profile ?? null;
  
  // Debug logging
  console.log(`[AdvancedAnalysis] All media: ${allMedia.length}, Filtered: ${media.length}`);

  const filtered = useMemo(() => {
    return media.filter((item) => {
      if (mediaFilter === "all") return true;
      if (mediaFilter === "reels") return isReel(item);
      if (mediaFilter === "video") return isVideoNonReel(item);
      if (mediaFilter === "carousel") return item.media_type === "CAROUSEL_ALBUM";
      if (mediaFilter === "image") return item.media_type === "IMAGE";
      return true;
    });
  }, [media, mediaFilter]);

  const sorted = useMemo(() => {
    const key = orderBy;
    const arr = [...filtered];
    arr.sort((a: IgMediaItem, b: IgMediaItem) => {
      if (key === "score") return getScore(b) - getScore(a);
      if (key === "views") return (getViews(b) ?? -1) - (getViews(a) ?? -1);
      if (key === "reach") return (getReach(b) ?? -1) - (getReach(a) ?? -1);
      if (key === "er") return (getComputedNumber(b, "er") ?? -1) - (getComputedNumber(a, "er") ?? -1);
      return (
        (getComputedNumber(b, "interactions_per_1000_reach") ?? -1) -
        (getComputedNumber(a, "interactions_per_1000_reach") ?? -1)
      );
    });
    return arr;
  }, [filtered, orderBy]);

  const exportCSV = () => {
    const items = sorted;
    if (!items.length) return;

    const headers = [
      "id",
      "timestamp",
      "media_type",
      "media_product_type",
      "permalink",
      "likes",
      "comments",
      "saves",
      "shares",
      "reach",
      "views",
      "engagement",
      "er",
      "reach_rate",
      "views_rate",
      "interactions_per_1000_reach",
      "score",
    ];

    const rows = items.map((p: IgMediaItem) => [
      p.id,
      p.timestamp ?? "",
      p.media_type ?? "",
      p.media_product_type ?? "",
      p.permalink ?? "",
      p.like_count ?? 0,
      p.comments_count ?? 0,
      getSaves(p) ?? "",
      getShares(p) ?? "",
      getReach(p) ?? "",
      getViews(p) ?? "",
      getComputedNumber(p, "engagement") ?? p.insights?.engagement ?? getEngagement(p),
      getComputedNumber(p, "er") ?? "",
      getComputedNumber(p, "reach_rate") ?? "",
      getComputedNumber(p, "views_rate") ?? "",
      getComputedNumber(p, "interactions_per_1000_reach") ?? "",
      getScore(p),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advanced-${data?.snapshot_date ?? "export"}.csv`;
    a.click();
  };

  const totals = useMemo(() => {
    const savesValues = sorted.map(getSaves).filter((v): v is number => typeof v === "number");
    const sharesValues = sorted.map(getShares).filter((v): v is number => typeof v === "number");
    const reachValues = sorted.map(getReach).filter((v): v is number => typeof v === "number");
    const viewsValues = sorted.map(getViews).filter((v): v is number => typeof v === "number");

    const erValues = sorted.map((m) => getComputedNumber(m, "er")).filter((v): v is number => typeof v === "number");
    const reachRateValues = sorted
      .map((m) => getComputedNumber(m, "reach_rate"))
      .filter((v): v is number => typeof v === "number");
    const interactionsValues = sorted
      .map((m) => getComputedNumber(m, "interactions_per_1000_reach"))
      .filter((v): v is number => typeof v === "number");

    return {
      totalScore: sorted.reduce((s, m) => s + getScore(m), 0),
      totalSaves: savesValues.length ? savesValues.reduce((s, v) => s + v, 0) : null,
      totalShares: sharesValues.length ? sharesValues.reduce((s, v) => s + v, 0) : null,
      totalReach: reachValues.length ? reachValues.reduce((s, v) => s + v, 0) : null,
      totalViews: viewsValues.length ? viewsValues.reduce((s, v) => s + v, 0) : null,
      avgEr: erValues.length ? erValues.reduce((s, v) => s + v, 0) / erValues.length : null,
      avgReachRate: reachRateValues.length ? reachRateValues.reduce((s, v) => s + v, 0) / reachRateValues.length : null,
      avgInteractionsPer1000: interactionsValues.length ? interactionsValues.reduce((s, v) => s + v, 0) / interactionsValues.length : null,
    };
  }, [sorted]);

  const heatmap = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();

    for (const item of sorted) {
      if (!item.timestamp) continue;
      if (heatMetric === "views" && !isReel(item)) continue;

      const dt = new Date(item.timestamp);
      const day = dt.getDay();
      const hour = dt.getHours();
      const key = `${day}-${hour}`;

      const prev = buckets.get(key) ?? { sum: 0, count: 0 };
      const v =
        heatMetric === "score"
          ? getScore(item)
          : heatMetric === "views"
            ? getViews(item) ?? 0
            : getEngagement(item);
      prev.sum += v;
      prev.count += 1;
      buckets.set(key, prev);
    }

    let maxAvg = 0;
    for (const v of buckets.values()) {
      if (v.count === 0) continue;
      maxAvg = Math.max(maxAvg, v.sum / v.count);
    }

    return { buckets, maxAvg };
  }, [sorted, heatMetric]);

  const insights = useMemo(() => {
    const scoreBuckets = new Map<string, { sum: number; count: number }>();
    for (const item of sorted) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const key = `${dt.getDay()}-${dt.getHours()}`;
      const prev = scoreBuckets.get(key) ?? { sum: 0, count: 0 };
      prev.sum += getScore(item);
      prev.count += 1;
      scoreBuckets.set(key, prev);
    }
    let bestWindow: { day: number; hour: number; avg: number; count: number } | null = null;
    for (const [key, v] of scoreBuckets) {
      if (v.count === 0) continue;
      const avg = v.sum / v.count;
      const [dayStr, hourStr] = key.split("-");
      const day = Number(dayStr);
      const hour = Number(hourStr);
      if (!bestWindow || avg > bestWindow.avg) bestWindow = { day, hour, avg, count: v.count };
    }

    const byFormatScore = new Map<string, { sum: number; count: number }>();
    const byFormatEr = new Map<string, { sum: number; count: number }>();

    for (const item of sorted) {
      const label = formatLabel(item);
      const prevScore = byFormatScore.get(label) ?? { sum: 0, count: 0 };
      prevScore.sum += getScore(item);
      prevScore.count += 1;
      byFormatScore.set(label, prevScore);

      const er = getComputedNumber(item, "er");
      if (er !== null) {
        const prevEr = byFormatEr.get(label) ?? { sum: 0, count: 0 };
        prevEr.sum += er;
        prevEr.count += 1;
        byFormatEr.set(label, prevEr);
      }
    }

    const bestFormatScore = Array.from(byFormatScore.entries())
      .map(([k, v]) => ({ k, avg: v.count ? v.sum / v.count : 0, count: v.count }))
      .sort((a, b) => b.avg - a.avg)[0];

    const bestFormatEr = Array.from(byFormatEr.entries())
      .map(([k, v]) => ({ k, avg: v.count ? v.sum / v.count : 0, count: v.count }))
      .sort((a, b) => b.avg - a.avg)[0];

    const topInteractions = [...sorted]
      .filter((i) => getComputedNumber(i, "interactions_per_1000_reach") !== null)
      .sort(
        (a, b) =>
          (getComputedNumber(b, "interactions_per_1000_reach") ?? -1) -
          (getComputedNumber(a, "interactions_per_1000_reach") ?? -1),
      )
      .slice(0, 3);

    return { bestWindow, bestFormatScore, bestFormatEr, topInteractions };
  }, [sorted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = (data?.media?.length ?? 0) > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Análise Avançada</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ranking completo, filtros, heatmap e export.</p>
          </div>
        </section>

        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Conecte uma conta do Instagram via Facebook para visualizar as métricas.
          </p>
          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análise Avançada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking completo com filtros e heatmap baseado em score. Export CSV respeita os filtros.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2" disabled={!sorted.length}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Itens no período" value={sorted.length.toLocaleString()} />
        <MetricCard label="Score total" value={totals.totalScore > 0 ? totals.totalScore.toLocaleString() : "--"} />
        <MetricCard label="ER médio" value={formatPercent(totals.avgEr)} tooltip="Engagement ÷ seguidores × 100 (quando seguidores disponível)." />
        <MetricCard label="Interações / 1.000 alcance" value={totals.avgInteractionsPer1000 === null ? "--" : Math.round(totals.avgInteractionsPer1000).toLocaleString()} />
      </div>

      <ChartCard
        title="Filtros"
        subtitle={profile?.username ? `@${profile.username}` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={mediaFilter} onValueChange={(v) => setMediaFilter(v as MediaFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de mídia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="carousel">Carrossel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={orderBy} onValueChange={(v) => setOrderBy(v as OrderBy)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Ordenação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="views">Views</SelectItem>
                <SelectItem value="reach">Reach</SelectItem>
                <SelectItem value="er">ER</SelectItem>
                <SelectItem value="interactions_per_1000_reach">Interações/1.000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Preview</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Score</th>
                <th>ER</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Saves</th>
                <th>Shares</th>
                <th>Reach</th>
                <th>Views</th>
                <th>Inter/1.000</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 200).map((item, idx: number) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => {
                    if (item.permalink) window.open(item.permalink, "_blank", "noopener,noreferrer");
                  }}
                >
                  <td className="font-bold text-muted-foreground">{idx + 1}</td>
                  <td>
                    <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                      {(item.thumbnail_url || item.media_url) ? (
                        <img src={item.thumbnail_url || item.media_url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-secondary rounded" />
                      )}
                    </a>
                  </td>
                  <td>
                    <span className="tag">{formatLabel(item)}</span>
                  </td>
                  <td className="text-xs">{item.timestamp ? new Date(item.timestamp).toLocaleDateString("pt-BR") : "--"}</td>
                  <td className="font-medium">{getScore(item).toLocaleString()}</td>
                  <td>{formatPercent(getComputedNumber(item, "er"))}</td>
                  <td>{(item.like_count ?? 0).toLocaleString()}</td>
                  <td>{(item.comments_count ?? 0).toLocaleString()}</td>
                  <td>{formatNumberOrDash(getSaves(item))}</td>
                  <td>{formatNumberOrDash(getShares(item))}</td>
                  <td>{formatNumberOrDash(getReach(item))}</td>
                  <td>{formatNumberOrDash(getViews(item))}</td>
                  <td>{formatNumberOrDash(getComputedNumber(item, "interactions_per_1000_reach"))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length > 200 && (
            <p className="mt-2 text-xs text-muted-foreground">Mostrando 200 de {sorted.length.toLocaleString()} itens (export inclui todos).</p>
          )}
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Heatmap dia x hora"
          subtitle={
            heatMetric === "score"
              ? "Score médio"
              : heatMetric === "views"
                ? "Views médio (apenas reels)"
                : "Engagement médio"
          }
          actions={
            <Select value={heatMetric} onValueChange={(v) => setHeatMetric(v as HeatMetric)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Métrica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score médio</SelectItem>
                <SelectItem value="views">Views médio (reels)</SelectItem>
                <SelectItem value="engagement">Engagement médio</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <div className="inline-grid gap-1" style={{ gridTemplateColumns: "80px repeat(24, 18px)" }}>
                <div />
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={`h-${h}`} className="text-[10px] text-muted-foreground text-center">
                    {h}
                  </div>
                ))}
                {Array.from({ length: 7 }).map((_, day) => (
                  <Fragment key={`row-${day}`}>
                    <div key={`d-${day}`} className="text-xs text-muted-foreground pr-2 flex items-center">
                      {weekdayShortPt(day)}
                    </div>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const key = `${day}-${hour}`;
                      const bucket = heatmap.buckets.get(key);
                      const avg = bucket && bucket.count ? bucket.sum / bucket.count : null;
                      const ratio = avg !== null && heatmap.maxAvg > 0 ? avg / heatmap.maxAvg : 0;
                      const alpha = avg !== null ? Math.min(0.75, 0.12 + ratio * 0.63) : 0;
                      const bg = avg !== null ? `hsl(var(--primary) / ${alpha})` : "hsl(var(--border) / 0.25)";
                      return (
                        <Tooltip key={`c-${key}`}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="h-[18px] w-[18px] rounded-sm border border-border/40"
                              style={{ backgroundColor: bg }}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            <div className="font-medium">
                              {weekdayShortPt(day)} {String(hour).padStart(2, "0")}h
                            </div>
                            <div className="text-muted-foreground">
                              {avg === null ? "Sem dados" : `Média: ${avg.toFixed(1)} • n=${bucket?.count ?? 0}`}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Células mais escuras = melhor média. Baseado em horário local do navegador.
            </p>
          </div>
        </ChartCard>

        <ChartCard title="Insights automáticos" subtitle="Determinísticos (sem IA)">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="tag">Melhor janela</span>
              <span className="text-muted-foreground">
                {insights.bestWindow
                  ? `${weekdayShortPt(insights.bestWindow.day)} ${String(insights.bestWindow.hour).padStart(2, "0")}h (score médio ${insights.bestWindow.avg.toFixed(1)}, n=${insights.bestWindow.count})`
                  : "Sem dados suficientes."}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="tag">Melhor formato (score)</span>
              <span className="text-muted-foreground">
                {insights.bestFormatScore
                  ? `${insights.bestFormatScore.k}: score médio ${insights.bestFormatScore.avg.toFixed(1)} (n=${insights.bestFormatScore.count})`
                  : "Sem dados suficientes."}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="tag">Melhor formato (ER)</span>
              <span className="text-muted-foreground">
                {insights.bestFormatEr
                  ? `${insights.bestFormatEr.k}: ER médio ${insights.bestFormatEr.avg.toFixed(2)}% (n=${insights.bestFormatEr.count})`
                  : "Sem ER disponível."}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="tag">Top eficiência</span>
              <span className="text-muted-foreground">
                {insights.topInteractions.length === 0
                  ? "Sem reach suficiente para calcular."
                  : insights.topInteractions.map((p, i: number) => (
                      <span key={p.id}>
                        <a className="underline" href={p.permalink} target="_blank" rel="noopener noreferrer">
                          #{i + 1}
                        </a>
                        {i < insights.topInteractions.length - 1 ? " • " : ""}
                      </span>
                    ))}
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {data?.messages && data.messages.length > 0 && (
        <div className="p-4 bg-secondary/50 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {data.messages.join(" • ")}
          </p>
        </div>
      )}
    </div>
  );
}
