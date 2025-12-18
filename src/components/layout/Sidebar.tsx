import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BarChart3,
  TrendingUp,
  Activity,
  Grid3X3,
  Layers,
  Users,
  Clock,
  Play,
  User as UserIcon,
  Server,
  Code,
  Instagram,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    defaultOpen: true,
    items: [
      { label: 'Início', href: '/', icon: <Home className="h-[18px] w-[18px]" /> },
      { label: 'Visão Geral', href: '/overview', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    title: 'Análises',
    defaultOpen: true,
    items: [
      { label: 'Performance', href: '/performance', icon: <Activity className="h-[18px] w-[18px]" /> },
      { label: 'Posts', href: '/posts', icon: <Grid3X3 className="h-[18px] w-[18px]" /> },
      { label: 'Stories', href: '/stories', icon: <Layers className="h-[18px] w-[18px]" /> },
      { label: 'Reels', href: '/reels', icon: <Play className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    title: 'Audiência',
    defaultOpen: true,
    items: [
      { label: 'Demografia', href: '/demographics', icon: <Users className="h-[18px] w-[18px]" /> },
      { label: 'Online', href: '/online', icon: <Clock className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    title: 'Configurações',
    defaultOpen: false,
    items: [
      { label: 'Perfil', href: '/profile', icon: <UserIcon className="h-[18px] w-[18px]" /> },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    navGroups.reduce((acc, group) => ({ ...acc, [group.title]: group.defaultOpen ?? true }), {}),
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[272px] flex-col border-r border-border bg-background p-4 overflow-y-auto">
      <Link to="/" className="flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-secondary">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary">
          <Instagram className="h-[18px] w-[18px] text-foreground" />
        </span>
        <span className="flex flex-col leading-tight">
          <strong className="text-sm font-semibold">Analytics</strong>
          <span className="text-xs text-muted-foreground">Painel de Dados</span>
        </span>
      </Link>

      <nav className="mt-4 flex flex-col gap-1 flex-1">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <button
              onClick={() => toggleGroup(group.title)}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {group.title}
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  expandedGroups[group.title] ? '' : '-rotate-90',
                )}
              />
            </button>
            {expandedGroups[group.title] && (
              <div className="flex flex-col gap-0.5 mt-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={location.pathname === item.href ? 'page' : undefined}
                    className={cn(
                      'nav-link',
                      location.pathname === item.href && 'border-border bg-secondary text-foreground',
                    )}
                  >
                    <span className={cn('nav-icon', location.pathname === item.href && 'text-foreground')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
