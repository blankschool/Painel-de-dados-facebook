import { useAuth } from '@/contexts/AuthContext';
import { useInstagram } from '@/contexts/InstagramContext';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, User, Loader2 } from 'lucide-react';

const Profile = () => {
  const { connectedAccounts, connectWithInstagram, connectWithFacebook } = useAuth();
  const { profile, loading } = useInstagram();

  const hasConnectedAccount = connectedAccounts && connectedAccounts.length > 0;

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
      ) : profile ? (
        <div className="chart-card p-6 space-y-6">
          <div className="flex items-center gap-4">
            {profile.profile_picture_url ? (
              <img 
                src={profile.profile_picture_url} 
                alt={profile.username}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">@{profile.username}</h2>
              {profile.name && (
                <p className="text-muted-foreground">{profile.name}</p>
              )}
            </div>
          </div>

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

          {profile.biography && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
              <p className="text-sm">{profile.biography}</p>
            </div>
          )}
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
