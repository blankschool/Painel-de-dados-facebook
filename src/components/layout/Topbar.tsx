import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "next-themes";
import { Sun, Moon, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useFilters } from "@/contexts/FiltersContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Visão Geral",
    subtitle: "Panorama do desempenho e principais métricas do período.",
  },
  "/overview": {
    title: "Visão Geral",
    subtitle: "Panorama do desempenho e principais métricas do período.",
  },
  "/followers": {
    title: "Seguidores",
    subtitle: "Distribuição, crescimento e padrões da audiência.",
  },
  "/content": {
    title: "Conteúdo",
    subtitle: "Performance por formato e análise editorial.",
  },
  "/time": {
    title: "Tempo",
    subtitle: "Leitura temporal para alcance e engajamento.",
  },
  "/posts": {
    title: "Posts",
    subtitle: "Ranking e métricas detalhadas por publicação.",
  },
  "/performance": {
    title: "Performance",
    subtitle: "Comparativos de engajamento por tipo de mídia.",
  },
  "/stories": {
    title: "Stories",
    subtitle: "Insights de consumo, resposta e retenção.",
  },
  "/reels": {
    title: "Reels",
    subtitle: "Acompanhamento de plays, alcance e engajamento.",
  },
  "/profile": {
    title: "Perfil",
    subtitle: "Visitas ao perfil e alcance do público.",
  },
  "/optimization": {
    title: "Otimização",
    subtitle: "Ajustes recomendados a partir dos dados.",
  },
  "/demographics": {
    title: "Demografia",
    subtitle: "Distribuição geográfica e perfil da audiência.",
  },
  "/online": {
    title: "Online",
    subtitle: "Quando sua audiência está ativa.",
  },
  "/advanced": {
    title: "Análise Avançada",
    subtitle: "Leituras profundas de performance e eficiência.",
  },
};

export function Topbar() {
  const location = useLocation();
  const { getDateRangeFromPreset, setDateRangePreset, setCustomDateRange, filters } = useFilters();
  const { data, refresh } = useDashboardData();
  const { theme, setTheme } = useTheme();
  
  const meta =
    pageMeta[location.pathname] ||
    (location.pathname.startsWith("/media/") ? {
      title: "Detalhe do Post",
      subtitle: "Dados completos do conteúdo selecionado.",
    } : {
      title: "Dashboard",
      subtitle: "Resumo geral do desempenho da conta.",
    });
  const accountName = data?.profile?.username || "Instagram Business";
  const profilePicture = data?.profile?.profile_picture_url;
  
  // Get current date range from FiltersContext
  const dateRange = getDateRangeFromPreset();
  
  // State for calendar popover
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
  
  // Sync tempRange when calendar opens
  useEffect(() => {
    if (isCalendarOpen) {
      setTempRange(dateRange);
    }
  }, [isCalendarOpen]);
  
  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`
      : format(dateRange.from, "d 'de' MMM", { locale: ptBR })
    : "Selecionar período";

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Handle calendar date selection
  const handleDateSelect = (range: DateRange | undefined) => {
    setTempRange(range);
  };
  
  // Apply the selected date range
  const handleApplyRange = () => {
    if (tempRange?.from && tempRange?.to) {
      setCustomDateRange(tempRange);
      setIsCalendarOpen(false);
    }
  };
  
  // Cancel and close
  const handleCancel = () => {
    setTempRange(undefined);
    setIsCalendarOpen(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <span className="page-hero-kicker">Relatório do Instagram</span>
        <h1 className="page-title">{meta.title}</h1>
        <p className="page-hero-subtitle">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="account-badge cursor-pointer hover:opacity-80 transition-opacity">
              <div className="instagram-icon">
                {profilePicture ? (
                  <img src={profilePicture} alt={accountName} className="w-full h-full object-cover rounded" />
                ) : (
                  <svg viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
                    <circle cx="18" cy="6" r="1" fill="white" />
                  </svg>
                )}
              </div>
              <span className="account-name">{accountName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{accountName}</p>
              <p className="text-xs text-muted-foreground">Conta Business do Instagram</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => refresh()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 h-4 w-4">
                <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Atualizar dados
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Ver perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Desconectar conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Picker - functional custom date selection */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="date-range hover:bg-accent/50 transition-colors rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span id="dateRangeText">{dateLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={tempRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="p-3 border-t border-border flex justify-between items-center">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApplyRange}
                  disabled={!tempRange?.from || !tempRange?.to}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
