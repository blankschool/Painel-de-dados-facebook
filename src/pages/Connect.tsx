import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFacebookSDK } from '@/hooks/useFacebookSDK';
import { 
  Facebook, 
  Instagram, 
  CheckCircle2, 
  LogOut, 
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

export default function Connect() {
  const { user, connectedAccount, isLoadingAccount, signOut, refreshConnectedAccount } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { isSDKLoaded, isLoading: isSDKLoading, loginStatus, checkLoginStatus } = useFacebookSDK();

  // Handle login status changes from FB SDK
  const handleFacebookLogin = useCallback(async (accessToken: string) => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    console.log('[Connect] Facebook login successful, exchanging token...');
    
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: {
          access_token: accessToken,
        },
      });

      if (error) {
        console.error('[Connect] Edge function error:', error);
        throw new Error(error.message || 'Erro ao processar autenticação');
      }

      if (data?.error) {
        console.error('[Connect] Data error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: 'Sucesso!',
        description: 'Conta do Instagram conectada com sucesso.',
      });

      await refreshConnectedAccount();
    } catch (err) {
      console.error('[Connect] Error:', err);
      toast({
        title: 'Erro na conexão',
        description: err instanceof Error ? err.message : 'Não foi possível conectar ao Facebook.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, refreshConnectedAccount, toast]);

  // Setup global callback for FB login button
  useEffect(() => {
    // Define global callback that FB button will call
    (window as any).checkLoginState = () => {
      if (!window.FB) return;
      
      window.FB.getLoginStatus((response) => {
        console.log('[Connect] FB login status callback:', response.status);
        if (response.status === 'connected' && response.authResponse) {
          handleFacebookLogin(response.authResponse.accessToken);
        } else if (response.status === 'not_authorized') {
          toast({
            title: 'Acesso não autorizado',
            description: 'Você precisa autorizar o app para continuar.',
            variant: 'destructive',
          });
        }
      });
    };

    return () => {
      delete (window as any).checkLoginState;
    };
  }, [handleFacebookLogin, toast]);

  // Re-render FB XFBML elements when SDK loads
  useEffect(() => {
    if (isSDKLoaded && window.FB && !connectedAccount) {
      // Parse XFBML to render the login button
      window.FB.XFBML?.parse();
    }
  }, [isSDKLoaded, connectedAccount]);

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

  if (isLoadingAccount || isSDKLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">
            {isSDKLoading ? 'Carregando SDK do Facebook...' : 'Verificando conta conectada...'}
          </p>
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

        {/* Facebook Login Status Indicator */}
        {loginStatus && loginStatus.status === 'connected' && !connectedAccount && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600 dark:text-blue-400">
              Você está logado no Facebook. Clique para conectar o Instagram.
            </span>
          </div>
        )}

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
                {/* Native Facebook Login Button */}
                <div className="flex justify-center py-2">
                  {isConnecting ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Conectando...</span>
                    </div>
                  ) : isSDKLoaded ? (
                    <div 
                      className="fb-login-button" 
                      data-width=""
                      data-size="large"
                      data-button-type="continue_with"
                      data-layout="rounded"
                      data-auto-logout-link="false"
                      data-use-continue-as="true"
                      data-scope={SCOPES}
                      data-onlogin="checkLoginState();"
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  )}
                </div>

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
