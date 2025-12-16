import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstagram } from '@/contexts/InstagramContext';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, User, Loader2, Unlink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const { connectedAccounts, connectWithInstagram, connectWithFacebook, disconnectAccount } = useAuth();
  const { profile, loading, refreshData } = useInstagram();
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use profile from API, or fallback to connected_accounts data
  const displayProfile = profile || (connectedAccounts[0] ? {
    id: connectedAccounts[0].provider_account_id,
    username: connectedAccounts[0].account_username,
    name: connectedAccounts[0].account_name,
    profile_picture_url: connectedAccounts[0].profile_picture_url,
  } : null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
    toast.success('Dados atualizados');
  };

  const hasConnectedAccount = connectedAccounts && connectedAccounts.length > 0;

  const handleDisconnect = async (accountId: string) => {
    setDisconnecting(true);
    const { error } = await disconnectAccount(accountId);
    setDisconnecting(false);
    
    if (error) {
      toast.error('Erro ao desconectar conta');
    } else {
      toast.success('Conta desconectada com sucesso');
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Profile</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Informações do seu perfil e configurações da conta.
          </p>
        </div>
        <div className="chip">
          <span className="text-muted-foreground">Atualizado</span>
          <strong className="font-semibold">12 Dez 2025 • 01:30</strong>
        </div>
      </section>

      {!hasConnectedAccount ? (
        <div className="chart-card p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Conecte sua conta</h2>
            <p className="text-muted-foreground max-w-md">
              Conecte sua conta do Instagram ou Facebook para ver as informações do perfil e acessar análises detalhadas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={connectWithInstagram}
              className="gap-2"
            >
              <Instagram className="w-4 h-4" />
              Conectar com Instagram
            </Button>
            <Button 
              onClick={connectWithFacebook}
              variant="outline"
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
              Conectar com Facebook
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="chart-card p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      ) : displayProfile ? (
        <div className="chart-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {displayProfile.profile_picture_url ? (
                <img 
                  src={displayProfile.profile_picture_url} 
                  alt={displayProfile.username || 'Profile'}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {displayProfile.username ? `@${displayProfile.username}` : (displayProfile.name || 'Instagram Business')}
                </h2>
                {displayProfile.name && displayProfile.username && (
                  <p className="text-muted-foreground">{displayProfile.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  via {connectedAccounts[0]?.provider === 'facebook' ? 'Facebook' : 'Instagram'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {profile && (
            <div className="flex flex-wrap gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{profile.media_count?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.followers_count?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Seguidores</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.follows_count?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Seguindo</p>
              </div>
            </div>
          )}

          {profile?.biography && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
              <p className="text-sm">{profile.biography}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDisconnect(connectedAccounts[0].id)}
              disabled={disconnecting}
              className="gap-2"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              Desconectar conta
            </Button>
          </div>
        </div>
      ) : (
        <div className="chart-card p-8 text-center">
          <p className="text-muted-foreground">Não foi possível carregar os dados do perfil.</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
