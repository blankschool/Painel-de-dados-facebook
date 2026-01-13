import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, User, Settings, LogOut, ChevronDown, Download } from "lucide-react";
import { useFilters } from "@/contexts/FiltersContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildExportFileBaseName,
  buildExportPayload,
  exportCsvBundle,
  exportJson,
  exportPdf,
} from "@/utils/exportData";

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
  const { filters, getDateRangeFromPreset } = useFilters();
  const { data, refresh, loading } = useDashboardData();
  const { selectedAccount } = useAuth();
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
  
  // Get date range for export
  const dateRange = getDateRangeFromPreset();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleExport = (format: "csv" | "json" | "pdf") => {
    if (!data) return;
    const timezone = selectedAccount?.timezone || "America/Sao_Paulo";
    const payload = buildExportPayload({
      data,
      filters,
      dateRange,
      timezone,
    });
    const baseName = buildExportFileBaseName(payload);

    if (format === "csv") {
      exportCsvBundle(payload, baseName);
      return;
    }
    if (format === "json") {
      exportJson(payload, baseName);
      return;
    }
    exportPdf(payload, baseName);
  };

  return (
    <header className="header">
      <div className="header-left pl-12 md:pl-0">
        <span className="page-hero-kicker text-[10px] md:text-[11px]">Relatório do Instagram</span>
        <h1 className="page-title text-xl md:text-[28px]">{meta.title}</h1>
        <p className="page-hero-subtitle text-xs md:text-sm hidden sm:block">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 md:h-9 md:w-9"
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
            <button type="button" className="account-badge cursor-pointer hover:opacity-80 transition-opacity px-2 py-1.5 md:px-4 md:py-2">
              <div className="instagram-icon w-6 h-6 md:w-[26px] md:h-[26px]">
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
              <span className="account-name text-sm md:text-base hidden sm:inline">{accountName}</span>
              <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
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

        {/* Export - Hidden on very small screens */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 md:gap-2 px-2 md:px-3 h-8 md:h-9 text-xs md:text-sm" disabled={loading || !data}>
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleExport("csv")} disabled={!data}>
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")} disabled={!data}>
              Exportar JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={!data}>
              Exportar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
