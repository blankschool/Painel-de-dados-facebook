import { useLocation } from 'react-router-dom';
import { ExportDropdown } from '@/components/ExportDropdown';

const pageNames: Record<string, string> = {
  '/': 'Audience',
  '/posts': 'Posts',
  '/stories': 'Stories',
  '/optimization': 'Optimization',
  '/profile': 'Profile',
  '/mentions': 'Mentions',
  '/benchmarks': 'Benchmarks',
  '/overview': 'Overview',
  '/growth': 'Growth',
  '/performance': 'Performance',
  '/demographics': 'Demographics',
  '/reels': 'Reels & Videos',
  '/online-followers': 'Online Followers',
};

export function Topbar() {
  const location = useLocation();
  const pageName = pageNames[location.pathname] || 'Dashboard';

  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Handle */}
          <div className="chip">
            <div className="h-7 w-7 rounded-full border border-border bg-secondary" />
            <span className="flex flex-col leading-tight">
              <b className="text-sm font-semibold">@seuperfil</b>
              <small className="text-xs text-muted-foreground">{pageName}</small>
            </span>
          </div>

          {/* Date Range */}
          <div className="chip">
            <span className="text-muted-foreground">Período</span>
            <strong className="font-semibold">12 Set 2025 – 12 Dez 2025</strong>
          </div>

          {/* Aggregation */}
          <div className="chip">
            <span className="text-muted-foreground">Unidade</span>
            <strong className="font-semibold">Mês</strong>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <ExportDropdown />
        </div>
      </div>
    </header>
  );
}
