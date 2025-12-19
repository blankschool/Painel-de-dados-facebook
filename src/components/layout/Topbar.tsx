import { useLocation } from 'react-router-dom';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useDashboardData } from '@/hooks/useDashboardData';

const pageNames: Record<string, string> = {
  '/': 'Minhas Contas',
  '/posts': 'Posts',
  '/stories': 'Stories',
  '/optimization': 'Optimization',
  '/profile': 'Perfil',
  '/mentions': 'Menções',
  '/benchmarks': 'Benchmarks',
  '/overview': 'Visão Geral',
  '/growth': 'Crescimento',
  '/performance': 'Performance',
  '/demographics': 'Demografia',
  '/reels': 'Reels & Vídeos',
  '/online': 'Seguidores Online',
  '/api-status': 'Status API',
  '/developer': 'Desenvolvedor',
};

export function Topbar() {
  const location = useLocation();
  const { dateRange, setDateRange } = useDateRange();
  const { data } = useDashboardData();
  const pageName = pageNames[location.pathname] || 'Dashboard';

  const username = data?.profile?.username ? `@${data.profile.username}` : 'Instagram Business';

  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Handle */}
          <div className="chip">
            {data?.profile?.profile_picture_url ? (
              <img 
                src={data.profile.profile_picture_url} 
                alt={username}
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full border border-border bg-secondary" />
            )}
            <span className="flex flex-col leading-tight">
              <b className="text-sm font-semibold">{username}</b>
              <small className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{pageName}</small>
            </span>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker 
            date={dateRange} 
            onDateChange={setDateRange} 
          />
        </div>

        <div />
      </div>
    </header>
  );
}
