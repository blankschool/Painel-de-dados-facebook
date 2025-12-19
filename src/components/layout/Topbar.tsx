import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const pageNames: Record<string, string> = {
  "/overview": "Business Overview",
  "/followers": "Followers",
  "/content": "Content",
  "/time": "Time",
};

export function Topbar() {
  const location = useLocation();
  const { dateRange, setDateRange } = useDateRange();
  const { data } = useDashboardData();
  const pageName = pageNames[location.pathname] || "Dashboard";

  const accountName = data?.profile?.username ? data.profile.username : "Instagram Business";
  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`
      : format(dateRange.from, "d 'de' MMM", { locale: ptBR })
    : "Month Posted";

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{pageName}</h1>
        <div className="header-actions">
          <button className="header-btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Get template
          </button>
          <button className="header-btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Glossary
          </button>
          <button className="header-btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16,6 12,2 8,6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="account-badge">
          <div className="instagram-icon">
            <svg viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="18" cy="6" r="1" fill="white" />
            </svg>
          </div>
          <span className="account-name">{accountName}</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="date-range">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span id="dateRangeText">{dateLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
