import { Filter, X, ChevronDown, Calendar } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilters, type DayFilter, type MediaType, type DateRangePreset } from "@/contexts/FiltersContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dayOptions: { value: DayFilter; label: string }[] = [
  { value: "all", label: "Todos os dias" },
  { value: "weekdays", label: "Dias úteis (Seg-Sex)" },
  { value: "weekends", label: "Finais de semana" },
  { value: "best", label: "Melhores dias (auto)" },
];

const mediaTypeOptions: { value: MediaType; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "IMAGE", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "CAROUSEL_ALBUM", label: "Carrossel" },
  { value: "REELS", label: "Reels" },
];

const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "14d", label: "Últimos 14 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "60d", label: "Últimos 60 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "1y", label: "Último ano" },
];

const quickFilters: DateRangePreset[] = ["7d", "30d", "90d"];

export function FiltersBar({ showMediaType = false }: { showMediaType?: boolean }) {
  const { data } = useDashboardData();
  const { filters, setDayFilter, setMediaType, setDateRangePreset, resetFilters, activeFiltersCount } = useFilters();
  
  const accountName = data?.profile?.username ? data.profile.username : "Instagram Business";
  const profilePicture = data?.profile?.profile_picture_url;

  const selectedDay = dayOptions.find((d) => d.value === filters.dayFilter)?.label || "Dias";
  const selectedMediaType = mediaTypeOptions.find((m) => m.value === filters.mediaType)?.label || "Tipo";
  const selectedDateRange = dateRangeOptions.find((r) => r.value === filters.dateRangePreset)?.label || "Período";

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border border-border/40 shadow-card mb-6">
      {/* Filter Button with count */}
      <Button
        variant={activeFiltersCount > 0 ? "default" : "outline"}
        size="sm"
        className="gap-2"
        onClick={resetFilters}
        disabled={activeFiltersCount === 0}
      >
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-primary-foreground/20 rounded-full text-xs">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {/* Account Display */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
        {profilePicture ? (
          <img src={profilePicture} alt={accountName} className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[10px] font-medium text-muted-foreground">IG</span>
          </div>
        )}
        <span className="text-sm font-medium">{accountName}</span>
      </div>

      {/* Date Range Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-sm" type="button">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{selectedDateRange}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {dateRangeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setDateRangePreset(option.value)}
              className={cn(
                "cursor-pointer",
                filters.dateRangePreset === option.value && "bg-accent font-medium"
              )}
            >
              {option.label}
              {filters.dateRangePreset === option.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Day Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-sm" type="button">
            <span>{filters.dayFilter !== "all" ? selectedDay : "Dias"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {dayOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setDayFilter(option.value)}
              className={cn(
                "cursor-pointer",
                filters.dayFilter === option.value && "bg-accent font-medium"
              )}
            >
              {option.label}
              {filters.dayFilter === option.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Media Type Filter (conditional) */}
      {showMediaType && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-sm" type="button">
              <span>{filters.mediaType !== "all" ? selectedMediaType : "Tipo"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {mediaTypeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setMediaType(option.value)}
                className={cn(
                  "cursor-pointer",
                  filters.mediaType === option.value && "bg-accent font-medium"
                )}
              >
                {option.label}
                {filters.mediaType === option.value && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Quick Filters - pushed to right */}
      <div className="flex items-center gap-1 ml-auto">
        {quickFilters.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDateRangePreset(preset)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filters.dateRangePreset === preset
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {preset.toUpperCase().replace("D", "D").replace("M", "M").replace("Y", "A")}
          </button>
        ))}
      </div>

      {/* Clear Filters Button */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
