import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/contexts/AccountContext';
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
  User,
  Server,
  Code,
  Instagram,
  LogOut,
  Facebook,
  X,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
      { label: 'Minhas Contas', href: '/', icon: <Home className="h-[18px] w-[18px]" /> },
      { label: 'Visão Geral', href: '/overview', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    title: 'Análises',
    defaultOpen: true,
    items: [
      { label: 'Crescimento', href: '/growth', icon: <TrendingUp className="h-[18px] w-[18px]" /> },
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
      { label: 'Perfil', href: '/profile', icon: <User className="h-[18px] w-[18px]" /> },
      { label: 'Status API', href: '/api-status', icon: <Server className="h-[18px] w-[18px]" /> },
      { label: 'Desenvolvedor', href: '/developer', icon: <Code className="h-[18px] w-[18px]" /> },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, connectedAccounts, connectWithInstagram, connectWithFacebook, disconnectAccount } = useAuth();
  const { selectedAccount, selectAccount } = useAccount();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    navGroups.reduce((acc, group) => ({ ...acc, [group.title]: group.defaultOpen ?? true }), {})
  );
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const hasConnectedAccount = connectedAccounts && connectedAccounts.length > 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[272px] flex-col border-r border-border bg-background p-4 overflow-y-auto">
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

      {/* Account Switcher */}
      {hasConnectedAccount && (
        <div className="mt-4 relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="w-full flex items-center gap-2.5 rounded-xl border border-border bg-secondary/50 p-3 hover:bg-secondary transition-colors"
          >
            {selectedAccount?.profile_picture_url ? (
              <img 
                src={selectedAccount.profile_picture_url} 
                alt="Profile" 
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center">
                <Instagram className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-sm font-medium">
                {selectedAccount?.account_username 
                  ? `@${selectedAccount.account_username}` 
                  : selectedAccount?.account_name 
                    || 'Selecionar conta'
                }
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {connectedAccounts.length} conta{connectedAccounts.length > 1 ? 's' : ''} conectada{connectedAccounts.length > 1 ? 's' : ''}
              </p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showAccountMenu && "rotate-180")} />
          </button>

          {/* Account Dropdown */}
          {showAccountMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
              <div className="p-1 max-h-[300px] overflow-y-auto">
                {connectedAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      selectAccount(account);
                      setShowAccountMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg p-2.5 hover:bg-secondary transition-colors",
                      selectedAccount?.id === account.id && "bg-secondary"
                    )}
                  >
                    {account.profile_picture_url ? (
                      <img 
                        src={account.profile_picture_url} 
                        alt="Profile" 
                        className="h-8 w-8 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full border border-border bg-secondary flex items-center justify-center">
                        {account.provider === 'facebook' ? (
                          <Facebook className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Instagram className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate text-sm font-medium">
                        {account.account_username 
                          ? `@${account.account_username}` 
                          : account.account_name 
                            || 'Instagram'
                        }
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        via {account.provider === 'facebook' ? 'Facebook' : 'Instagram'}
                      </p>
                    </div>
                    {selectedAccount?.id === account.id && (
                      <Check className="h-4 w-4 text-foreground" />
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const { error } = await disconnectAccount(account.id);
                        if (error) {
                          toast.error('Erro ao desconectar');
                        } else {
                          toast.success('Conta desconectada');
                        }
                      }}
                      className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                      title="Desconectar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </button>
                ))}
              </div>
              
              {/* Add Account Options */}
              <div className="border-t border-border p-2 space-y-1">
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    connectWithInstagram();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <Instagram className="h-4 w-4" />
                  Adicionar Instagram
                </button>
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    connectWithFacebook();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <Facebook className="h-4 w-4" />
                  Adicionar via Facebook
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-4 flex flex-col gap-1 flex-1">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <button
              onClick={() => toggleGroup(group.title)}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {group.title}
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                expandedGroups[group.title] ? "" : "-rotate-90"
              )} />
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
                      location.pathname === item.href && 'border-border bg-secondary text-foreground'
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

      {/* User section */}
      <div className="mt-auto pt-4 border-t border-border">
        {!hasConnectedAccount && (
          <div className="mb-3 space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-3">Conecte sua conta</p>
            <Button 
              onClick={connectWithInstagram}
              size="sm"
              className="w-full gap-2"
            >
              <Instagram className="h-4 w-4" />
              Conectar Instagram
            </Button>
            <Button 
              onClick={connectWithFacebook}
              size="sm"
              variant="outline"
              className="w-full gap-2"
            >
              <Facebook className="h-4 w-4" />
              Conectar Facebook
            </Button>
          </div>
        )}
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
