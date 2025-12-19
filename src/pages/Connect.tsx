import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Facebook, 
  Instagram, 
  CheckCircle2, 
  LogOut, 
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

const FACEBOOK_APP_ID = '1159498662342560';
const REDIRECT_URI = 'https://insta-glow-up-39.lovable.app/auth/callback';
const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

export default function Connect() {
  const { user, connectedAccount, isLoadingAccount, signOut, refreshConnectedAccount } = useAuth();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConnectFacebook = () => {
    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&response_type=code`;
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!connectedAccount) return;

    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .delete()
        .eq('id', connectedAccount.id);

      if (error) throw error;

      toast({
        title: 'Conta desconectada',
        description: 'Sua conta do Instagram foi desconectada com sucesso.',
      });

      await refreshConnectedAccount();
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar a conta.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/overview');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoadingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verificando conta conectada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Instagram className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Conectar Instagram</h1>
          <p className="mt-2 text-muted-foreground">
            Conecte sua conta do Instagram Business para visualizar suas métricas
          </p>
        </div>

        {/* Connected Account Card */}
        {connectedAccount ? (
          <Card className="border-success/30 bg-success/5">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <div>
                  <CardTitle className="text-lg">Conta Conectada</CardTitle>
                  <CardDescription>Sua conta do Instagram está conectada</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                {connectedAccount.profile_picture_url ? (
                  <img
                    src={connectedAccount.profile_picture_url}
                    alt={connectedAccount.account_username || 'Profile'}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                    <Instagram className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    @{connectedAccount.account_username || 'instagram_user'}
                  </p>
                  {connectedAccount.account_name && (
                    <p className="text-sm text-muted-foreground">{connectedAccount.account_name}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGoToDashboard}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ir para o Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Desconectar'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Connect Card */}
            <Card>
              <CardHeader>
                <CardTitle>Conectar com Facebook</CardTitle>
                <CardDescription>
                  Conecte sua conta do Facebook para acessar as métricas do Instagram Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleConnectFacebook}
                  className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                  size="lg"
                >
                  <Facebook className="mr-2 h-5 w-5" />
                  Conectar com Facebook
                </Button>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Requisitos:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Conta do Instagram Business ou Creator</li>
                        <li>Conta vinculada a uma página do Facebook</li>
                        <li>Permissões de acesso às métricas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* User Info & Sign Out */}
        <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Logado</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
