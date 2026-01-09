import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ConnectedAccount } from '@/contexts/AuthContext';
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
  AlertCircle,
  Trash2,
  Check
} from 'lucide-react';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

export default function Connect() {
  const { user, connectedAccounts, selectedAccount, isLoadingAccounts, signOut, refreshConnectedAccounts, selectAccount } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { isSDKLoaded, isLoading: isSDKLoading, loginStatus } = useFacebookSDK();

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

      await refreshConnectedAccounts();
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
  }, [isConnecting, refreshConnectedAccounts, toast]);

  // Setup global callback for FB login button
  useEffect(() => {
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
    if (isSDKLoaded && window.FB) {
      window.FB.XFBML?.parse();
    }
  }, [isSDKLoaded, connectedAccounts]);

  const handleDeleteAccount = async (account: ConnectedAccount) => {
    setDeletingAccountId(account.id);
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .delete()
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: 'Conta removida',
        description: `@${account.account_username || 'Conta'} foi removida.`,
      });

      await refreshConnectedAccounts();
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a conta.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    selectAccount(accountId);
    toast({
      title: 'Conta selecionada',
      description: 'Esta conta será usada no dashboard.',
    });
  };

  const handleGoToDashboard = () => {
    navigate('/overview');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoadingAccounts || isSDKLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">
            {isSDKLoading ? 'Carregando SDK do Facebook...' : 'Verificando contas conectadas...'}
          </p>
        </div>
      </div>
    );
  }

  const hasAccounts = connectedAccounts.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Instagram className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Contas do Instagram</h1>
          <p className="mt-2 text-muted-foreground">
            {hasAccounts 
              ? 'Selecione uma conta para usar no dashboard ou conecte outra'
              : 'Conecte sua conta do Instagram Business para visualizar suas métricas'}
          </p>
        </div>

        {/* Facebook Login Status Indicator */}
        {loginStatus && loginStatus.status === 'connected' && !hasAccounts && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600 dark:text-blue-400">
              Você está logado no Facebook. Clique para conectar o Instagram.
            </span>
          </div>
        )}

        {/* Connected Accounts List */}
        {hasAccounts && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <CardTitle className="text-lg">Contas Conectadas</CardTitle>
                </div>
                <span className="text-sm text-muted-foreground">{connectedAccounts.length} conta(s)</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectedAccounts.map((account) => {
                const isSelected = selectedAccount?.id === account.id;
                return (
                  <div
                    key={account.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                    onClick={() => handleSelectAccount(account.id)}
                  >
                    {account.profile_picture_url ? (
                      <img
                        src={account.profile_picture_url}
                        alt={account.account_username || 'Profile'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        @{account.account_username || 'instagram_user'}
                      </p>
                      {account.account_name && (
                        <p className="text-sm text-muted-foreground truncate">{account.account_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="flex items-center gap-1 text-primary text-sm">
                          <Check className="h-4 w-4" />
                          <span>Ativa</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(account);
                        }}
                        disabled={deletingAccountId === account.id}
                      >
                        {deletingAccountId === account.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}

              <Button onClick={handleGoToDashboard} className="w-full mt-4">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ir para o Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connect New Account Card */}
        <Card>
          <CardHeader>
            <CardTitle>{hasAccounts ? 'Conectar Outra Conta' : 'Conectar com Facebook'}</CardTitle>
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
                  data-button-type={hasAccounts ? "login_with" : "continue_with"}
                  data-layout="rounded"
                  data-auto-logout-link="false"
                  data-use-continue-as={hasAccounts ? "false" : "true"}
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

            {!hasAccounts && (
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
            )}
          </CardContent>
        </Card>

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
