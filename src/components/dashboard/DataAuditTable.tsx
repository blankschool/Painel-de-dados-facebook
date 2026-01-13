import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DailyInsightRow {
  insight_date: string;
  reach?: number | null;
  impressions?: number | null;
  accounts_engaged?: number | null;
  profile_views?: number | null;
  follower_count?: number | null;
}

interface DataAuditTableProps {
  dailyInsights: DailyInsightRow[];
  dateRange?: { from?: Date; to?: Date };
  className?: string;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('pt-BR');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function DataAuditTable({ dailyInsights, dateRange, className }: DataAuditTableProps) {
  // Calculate coverage and totals
  const analysis = useMemo(() => {
    const sortedData = [...dailyInsights].sort((a, b) => 
      a.insight_date.localeCompare(b.insight_date)
    );

    // Calculate expected days from date range
    let expectedDays = 0;
    if (dateRange?.from && dateRange?.to) {
      const diffTime = dateRange.to.getTime() - dateRange.from.getTime();
      expectedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const coveredDays = sortedData.length;
    const completenessPercent = expectedDays > 0 ? (coveredDays / expectedDays) * 100 : 100;

    // Calculate totals
    const totals = {
      reach: sortedData.reduce((sum, d) => sum + (d.reach ?? 0), 0),
      impressions: sortedData.reduce((sum, d) => sum + (d.impressions ?? 0), 0),
      accountsEngaged: sortedData.reduce((sum, d) => sum + (d.accounts_engaged ?? 0), 0),
      profileViews: sortedData.reduce((sum, d) => sum + (d.profile_views ?? 0), 0),
    };

    // Check which metrics have data
    const hasReach = sortedData.some(d => d.reach != null && d.reach > 0);
    const hasImpressions = sortedData.some(d => d.impressions != null && d.impressions > 0);
    const hasAccountsEngaged = sortedData.some(d => d.accounts_engaged != null && d.accounts_engaged > 0);

    // Days with missing data
    const daysWithMissingReach = sortedData.filter(d => d.reach == null).length;
    const daysWithMissingImpressions = sortedData.filter(d => d.impressions == null).length;

    return {
      sortedData,
      expectedDays,
      coveredDays,
      completenessPercent,
      totals,
      hasReach,
      hasImpressions,
      hasAccountsEngaged,
      daysWithMissingReach,
      daysWithMissingImpressions,
    };
  }, [dailyInsights, dateRange]);

  if (dailyInsights.length === 0) {
    return (
      <div className={cn("p-6 text-center text-muted-foreground", className)}>
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum dado diário disponível para o período selecionado.</p>
        <p className="text-xs mt-1">O Instagram só disponibiliza métricas diárias dos últimos 30 dias.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Section */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-1.5">
          {analysis.completenessPercent >= 100 ? (
            <CheckCircle2 className="w-3 h-3 text-success" />
          ) : analysis.completenessPercent >= 80 ? (
            <AlertTriangle className="w-3 h-3 text-warning" />
          ) : (
            <XCircle className="w-3 h-3 text-destructive" />
          )}
          Cobertura: {analysis.coveredDays}/{analysis.expectedDays || analysis.coveredDays} dias ({analysis.completenessPercent.toFixed(0)}%)
        </Badge>
        
        {!analysis.hasImpressions && (
          <Badge variant="secondary" className="gap-1.5 bg-muted">
            <XCircle className="w-3 h-3" />
            Impressões indisponível
          </Badge>
        )}
        
        {analysis.daysWithMissingReach > 0 && (
          <Badge variant="secondary" className="gap-1.5 bg-muted">
            <AlertTriangle className="w-3 h-3" />
            {analysis.daysWithMissingReach} dias sem reach
          </Badge>
        )}
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Alcance (soma)</div>
          <div className="text-lg font-semibold">{formatNumber(analysis.totals.reach)}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Impressões (soma)</div>
          <div className="text-lg font-semibold">{formatNumber(analysis.totals.impressions || null)}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Engajados</div>
          <div className="text-lg font-semibold">{formatNumber(analysis.totals.accountsEngaged)}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Visitas perfil</div>
          <div className="text-lg font-semibold">{formatNumber(analysis.totals.profileViews)}</div>
        </div>
      </div>

      {/* Data Source Warning */}
      <div className="p-3 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
        <strong>⚠️ Nota:</strong> A soma do alcance diário pode ser maior que o alcance "único" mostrado no app do Instagram, 
        pois a mesma conta pode ser alcançada em múltiplos dias. O Instagram deduplica contas no período selecionado, 
        mas a API só fornece valores diários.
      </div>

      {/* Daily Data Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="max-h-[300px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead className="text-right">Alcance</TableHead>
                <TableHead className="text-right">Impressões</TableHead>
                <TableHead className="text-right">Engajados</TableHead>
                <TableHead className="text-right">Vis. Perfil</TableHead>
                <TableHead className="text-right">Seguidores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.sortedData.map((row) => (
                <TableRow key={row.insight_date}>
                  <TableCell className="font-medium">{formatDate(row.insight_date)}</TableCell>
                  <TableCell className={cn("text-right", row.reach == null && "text-muted-foreground")}>
                    {formatNumber(row.reach)}
                  </TableCell>
                  <TableCell className={cn("text-right", row.impressions == null && "text-muted-foreground")}>
                    {formatNumber(row.impressions)}
                  </TableCell>
                  <TableCell className={cn("text-right", row.accounts_engaged == null && "text-muted-foreground")}>
                    {formatNumber(row.accounts_engaged)}
                  </TableCell>
                  <TableCell className={cn("text-right", row.profile_views == null && "text-muted-foreground")}>
                    {formatNumber(row.profile_views)}
                  </TableCell>
                  <TableCell className={cn("text-right", row.follower_count == null && "text-muted-foreground")}>
                    {formatNumber(row.follower_count)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
