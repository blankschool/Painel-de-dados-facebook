import { useState, useEffect } from "react";
import { Filter, X, ChevronDown, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useFilters, type DayFilter, type MediaType, type DateRangePreset } from "@/contexts/FiltersContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  
  const { refresh, loading, lastUpdated } = useDashboardData();
  
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    filters.customDateRange || undefined
  );
  
  // Sync tempRange when calendar opens
  useEffect(() => {
    if (calendarOpen) {
      setTempRange(getDateRangeFromPreset());
    }
  }, [calendarOpen]);
  
  const selectedDay = dayOptions.find((d) => d.value === filters.dayFilter)?.label || "Dias";
  const selectedMediaType = mediaTypeOptions.find((m) => m.value === filters.mediaType)?.label || "Tipo";
  
  // Get the actual date range for display
  const dateRange = getDateRangeFromPreset();
  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "d MMM", { locale: ptBR })} - ${format(dateRange.to, "d MMM", { locale: ptBR })}`
      : format(dateRange.from, "d MMM", { locale: ptBR })
    : "Selecionar período";
  
  // Get display text for date range dropdown
  const getDateRangeDisplay = () => {
    if (filters.dateRangePreset === 'custom' && filters.customDateRange?.from) {
      const from = format(filters.customDateRange.from, "dd MMM", { locale: ptBR });
      const to = filters.customDateRange.to 
        ? format(filters.customDateRange.to, "dd MMM", { locale: ptBR })
        : "...";
      return `${from} - ${to}`;
    }
    return dateRangeOptions.find((r) => r.value === filters.dateRangePreset)?.label || "Período";
  };
  
  // Get last updated text
  const getLastUpdatedText = () => {
    if (!lastUpdated) return "Nunca atualizado";
    return `Atualizado ${formatDistanceToNow(lastUpdated, { locale: ptBR, addSuffix: true })}`;
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

  // Handle calendar date selection
  const handleDateSelect = (range: DateRange | undefined) => {
    setTempRange(range);
  };
  
  // Apply the selected date range
  const handleApplyRange = () => {
    if (tempRange?.from && tempRange?.to) {
      setCustomDateRange(tempRange);
      setCalendarOpen(false);
    }
  };
  
  // Cancel and close
  const handleCancel = () => {
    setTempRange(undefined);
    setCalendarOpen(false);
  };

  return (
    <div className="filters-bar flex flex-wrap items-center gap-3 mb-4 md:mb-6">
      {/* Left Section: Date Controls + Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh Button with Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getLastUpdatedText()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Filter Button with count */}
        {activeFiltersCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 h-8 text-xs px-2"
            onClick={resetFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{activeFiltersCount}</span>
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Quick Filters */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
          {quickFilters.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDateRangePreset(preset)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                filters.dateRangePreset === preset
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {preset.toUpperCase().replace("D", "d").replace("M", "m").replace("Y", "a")}
            </button>
          ))}
        </div>

        {/* Preset Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs font-medium" type="button">
              <span>{getDateRangeDisplay()}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
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

        {/* Date Range Picker - Calendar Button */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{dateLabel}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={tempRange}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              locale={ptBR}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="p-3 border-t border-border flex justify-between items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {tempRange?.from ? (
                  tempRange.to ? (
                    <>
                      {format(tempRange.from, "dd MMM", { locale: ptBR })} - {format(tempRange.to, "dd MMM", { locale: ptBR })}
                    </>
                  ) : (
                    "Selecione a data final"
                  )
                ) : (
                  "Selecione a data inicial"
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleApplyRange} disabled={!tempRange?.from || !tempRange?.to}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Custom Date Range Picker Popover (hidden trigger) */}
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
                    {format(tempRange.from, "d 'de' MMMM", { locale: ptBR })} a{" "}
                    {format(tempRange.to, "d 'de' MMMM", { locale: ptBR })}
                  </>
                ) : (
                  <>Início: {format(tempRange.from, "d 'de' MMMM", { locale: ptBR })}</>
                )
              ) : (
                "Clique para selecionar"
              )}
            </p>
          </div>
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleCustomSelect}
            numberOfMonths={1}
            locale={ptBR}
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

      {/* Right Section: Additional Filters */}
      {(showMediaType || filters.dayFilter !== "all") && (
        <>
          <div className="hidden sm:block w-px h-6 bg-border" />
          
          <div className="hidden sm:flex items-center gap-2">
            {/* Day Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs" type="button">
                  <span>{filters.dayFilter !== "all" ? selectedDay : "Dias"}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs" type="button">
                    <span>{filters.mediaType !== "all" ? selectedMediaType : "Tipo"}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
          </div>
        </>
      )}
    </div>
  );
}
