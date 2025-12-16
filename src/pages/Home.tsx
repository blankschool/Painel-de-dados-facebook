import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Instagram, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Users,
  MoreVertical
} from 'lucide-react';
import { ConnectAccountModal } from '@/components/ConnectAccountModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const Home = () => {
  const navigate = useNavigate();
  const { connectedAccounts, disconnectAccount } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const filteredAccounts = connectedAccounts.filter(account => {
    const searchLower = search.toLowerCase();
    return (
      account.account_username?.toLowerCase().includes(searchLower) ||
      account.account_name?.toLowerCase().includes(searchLower) ||
      account.provider.toLowerCase().includes(searchLower)
    );
  });

  const handleRemove = async (accountId: string) => {
    setRemovingId(accountId);
    const { error } = await disconnectAccount(accountId);
    setRemovingId(null);
    
    if (error) {
      toast.error('Erro ao remover conta');
    } else {
      toast.success('Conta removida com sucesso');
    }
  };

  const handleOpenDashboard = (accountId: string) => {
    navigate(`/dashboard/${accountId}`);
  };

  // Empty state
  if (connectedAccounts.length === 0 && !search) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <Instagram className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Nenhuma conta conectada</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Conecte sua conta do Instagram ou Facebook para começar a analisar seus dados e métricas.
        </p>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar conta
        </Button>
        <ConnectAccountModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Contas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie suas contas conectadas e acesse os dashboards de análise.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar conta
        </Button>
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou @usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Accounts Grid */}
      {filteredAccounts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="chart-card p-5 hover:shadow-hover transition-shadow cursor-pointer group"
              onClick={() => handleOpenDashboard(account.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {account.profile_picture_url ? (
                    <img
                      src={account.profile_picture_url}
                      alt={account.account_username || 'Profile'}
                      className="w-12 h-12 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center border border-border">
                      <Instagram className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {account.account_name || account.account_username || 'Instagram Business'}
                    </h3>
                    {account.account_username && (
                      <p className="text-sm text-muted-foreground">@{account.account_username}</p>
                    )}
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(account.id);
                      }}
                      className="text-destructive focus:text-destructive"
                      disabled={removingId === account.id}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover conta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats placeholder - will show real data when API works */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>--</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <span className="text-success text-xs">--</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  via {account.provider === 'facebook' ? 'Facebook' : 'Instagram'}
                </span>
                <span className="text-xs font-medium text-primary group-hover:underline">
                  Abrir dashboard →
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="chart-card p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma conta encontrada para "{search}"
          </p>
        </div>
      )}

      <ConnectAccountModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default Home;