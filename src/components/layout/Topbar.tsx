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

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/overview": "Dashboard",
  "/followers": "Followers",
  "/content": "Content",
  "/time": "Time",
};

export function Topbar() {
  const location = useLocation();
  const { getDateRangeFromPreset, setDateRangePreset, filters } = useFilters();
  const { data, refresh } = useDashboardData();
  const { theme, setTheme } = useTheme();
  
  const pageName = pageNames[location.pathname] || "Dashboard";
  const accountName = data?.profile?.username || "Instagram Business";
  const profilePicture = data?.profile?.profile_picture_url;
  
  // Get current date range from FiltersContext
  const dateRange = getDateRangeFromPreset();
  
  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`
      : format(dateRange.from, "d 'de' MMM", { locale: ptBR })
    : "Selecionar período";

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Handle calendar date selection - for now, just show the date range but don't change filters
  // To support custom date ranges, we'd need to extend FiltersContext
  const handleDateSelect = (range: DateRange | undefined) => {
    // Currently the calendar is view-only - the date range is controlled by the preset buttons
    // If custom date selection is needed, we can extend FiltersContext to support it
    console.log('[Topbar] Calendar date selected (read-only mode):', range);
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{pageName}</h1>
        <div className="header-actions">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
              <p className="text-xs text-muted-foreground">Instagram Business Account</p>
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

        {/* Date Range Picker - shows current preset range */}
        <Popover>
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
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              Use os botões de filtro (7D, 30D, 90D) para alterar o período
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
