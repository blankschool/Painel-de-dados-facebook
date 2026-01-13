import { useState } from "react";
import { Filter, X, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useFilters, type DayFilter, type MediaType, type DateRangePreset } from "@/contexts/FiltersContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  { value: "custom", label: "Personalizado..." },
];

const quickFilters: DateRangePreset[] = ["7d", "30d", "90d"];

export function FiltersBar({ showMediaType = false }: { showMediaType?: boolean }) {
  const { 
    filters, 
    setDayFilter, 
    setMediaType, 
    setDateRangePreset, 
    setCustomDateRange,
    resetFilters, 
    activeFiltersCount,
    getDateRangeFromPreset 
  } = useFilters();
  
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    filters.customDateRange || undefined
  );
  
  const selectedDay = dayOptions.find((d) => d.value === filters.dayFilter)?.label || "Dias";
  const selectedMediaType = mediaTypeOptions.find((m) => m.value === filters.mediaType)?.label || "Tipo";
  
  // Get the actual date range for display (like Minter.io: "Jan 6, 2026 – Jan 12, 2026")
  const getActualDateRange = () => {
    const range = getDateRangeFromPreset();
    if (range.from && range.to) {
      const fromStr = format(range.from, "MMM d, yyyy", { locale: enUS });
      const toStr = format(range.to, "MMM d, yyyy", { locale: enUS });
      return `${fromStr} – ${toStr}`;
    }
    return null;
  };
  
  // Get display text for date range dropdown
  const getDateRangeDisplay = () => {
    if (filters.dateRangePreset === 'custom' && filters.customDateRange?.from) {
      const from = format(filters.customDateRange.from, "dd MMM", { locale: enUS });
      const to = filters.customDateRange.to 
        ? format(filters.customDateRange.to, "dd MMM", { locale: enUS })
        : "...";
      return `${from} - ${to}`;
    }
    return dateRangeOptions.find((r) => r.value === filters.dateRangePreset)?.label || "Período";
  };

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setCustomPickerOpen(true);
    } else {
      setDateRangePreset(preset);
    }
  };

  const handleCustomSelect = (range: DateRange | undefined) => {
    setTempRange(range);
    if (range?.from && range?.to) {
      setCustomDateRange(range);
      setCustomPickerOpen(false);
    }
  };

  return (
    <div className="filters-bar flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
      {/* Filter Button with count */}
      <Button
        variant={activeFiltersCount > 0 ? "default" : "outline"}
        size="sm"
        className="gap-1.5 md:gap-2 h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
        onClick={resetFilters}
        disabled={activeFiltersCount === 0}
      >
        <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden xs:inline">Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="ml-0.5 md:ml-1 px-1.5 md:px-2 py-0.5 bg-primary-foreground/20 rounded-full text-[10px] md:text-xs">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {/* Date Range Selector with actual date display */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs md:text-sm" type="button">
              <CalendarIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              <span className="max-w-[80px] md:max-w-none truncate">{getDateRangeDisplay()}</span>
              <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {dateRangeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
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
        
        {/* Actual date range display (like Minter.io) - hidden on mobile */}
        {getActualDateRange() && (
          <span className="text-xs md:text-sm text-muted-foreground hidden md:inline">
            {getActualDateRange()}
          </span>
        )}
      </div>

      {/* Custom Date Range Picker Popover */}
      <Popover open={customPickerOpen} onOpenChange={setCustomPickerOpen}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium">Selecione o período</p>
            <p className="text-xs text-muted-foreground">
              {tempRange?.from ? (
                tempRange.to ? (
                  <>
                    {format(tempRange.from, "MMMM d", { locale: enUS })} to{" "}
                    {format(tempRange.to, "MMMM d", { locale: enUS })}
                  </>
                ) : (
                  <>Start: {format(tempRange.from, "MMMM d", { locale: enUS })}</>
                )
              ) : (
                "Click to select dates"
              )}
            </p>
          </div>
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleCustomSelect}
            numberOfMonths={1}
            locale={enUS}
            disabled={(date) => date > new Date()}
            className="pointer-events-auto"
          />
          <div className="p-3 border-t border-border flex justify-end gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setTempRange(undefined);
                setCustomPickerOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                if (tempRange?.from && tempRange?.to) {
                  setCustomDateRange(tempRange);
                  setCustomPickerOpen(false);
                }
              }}
              disabled={!tempRange?.from || !tempRange?.to}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Day Filter - hidden on very small screens */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hidden sm:flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs md:text-sm" type="button">
            <span>{filters.dayFilter !== "all" ? selectedDay : "Dias"}</span>
            <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
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

      {/* Media Type Filter (conditional) - hidden on very small screens */}
      {showMediaType && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden sm:flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs md:text-sm" type="button">
              <span>{filters.mediaType !== "all" ? selectedMediaType : "Tipo"}</span>
              <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
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

      {/* Quick Filters - pushed to right, hidden on small screens */}
      <div className="hidden md:flex items-center gap-1 ml-auto">
        {quickFilters.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDateRangePreset(preset)}
            className={cn(
              "px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors",
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
          className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2 text-xs md:text-sm"
        >
          <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span className="hidden sm:inline">Limpar</span>
        </Button>
      )}
    </div>
  );
}
