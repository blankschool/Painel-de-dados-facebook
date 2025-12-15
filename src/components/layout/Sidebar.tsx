import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Grid3X3,
  Layers,
  Settings,
  User,
  MessageSquare,
  TrendingUp,
  Instagram,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { label: 'Audience', href: '/', icon: <Users className="h-[18px] w-[18px]" /> },
  { label: 'Posts', href: '/posts', icon: <Grid3X3 className="h-[18px] w-[18px]" /> },
  { label: 'Stories', href: '/stories', icon: <Layers className="h-[18px] w-[18px]" /> },
  { label: 'Optimization', href: '/optimization', icon: <Settings className="h-[18px] w-[18px]" /> },
  { label: 'Profile', href: '/profile', icon: <User className="h-[18px] w-[18px]" /> },
  { label: 'Mentions', href: '/mentions', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
  { label: 'Benchmarks', href: '/benchmarks', icon: <TrendingUp className="h-[18px] w-[18px]" /> },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isDemoMode = localStorage.getItem('demoMode') === 'true';

  const handleSignOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('demoMode');
      navigate('/auth');
    } else {
      await signOut();
      navigate('/auth');
    }
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[272px] flex-col border-r border-border bg-background p-4">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-secondary">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary">
          <Instagram className="h-[18px] w-[18px] text-foreground" />
        </span>
        <span className="flex flex-col leading-tight">
          <strong className="text-sm font-semibold">Analytics</strong>
          <span className="text-xs text-muted-foreground">Painel de Dados</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="mt-6 flex flex-col gap-1">
        <h3 className="mb-1.5 ml-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Relatórios
        </h3>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            aria-current={location.pathname === item.href ? 'page' : undefined}
            className={cn(
              'nav-link',
              location.pathname === item.href && 'border-border bg-secondary text-foreground'
            )}
          >
            <span className={cn('nav-icon', location.pathname === item.href && 'text-foreground')}>
              {item.icon}
            </span>
            {item.label}
            {item.badge && (
              <span className="ml-auto rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="mt-auto">
        <div className="mb-3 rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full border border-border bg-background" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {isDemoMode ? 'Demo User' : user?.email || 'Usuário'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isDemoMode ? 'Modo demonstração' : 'Conta conectada'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
