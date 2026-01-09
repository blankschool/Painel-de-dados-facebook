import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ConnectedAccount } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFacebookSDK } from '@/hooks/useFacebookSDK';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Facebook, 
  Instagram, 
  CheckCircle2, 
  LogOut, 
  Loader2,
  ExternalLink,
  AlertCircle,
  Trash2,
  Check,
  RefreshCw,
  ChevronDown,
  Shield,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

// Instagram OAuth config (for direct Instagram OAuth flow)
const INSTAGRAM_APP_ID = '1728352261135208';
const INSTAGRAM_SCOPES = 'instagram_business_basic,instagram_business_manage_insights,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish';

// Generate secure random state for CSRF protection
function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get redirect URI based on environment
function getRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

export default function Connect() {
  const { user, connectedAccounts, selectedAccount, isLoadingAccounts, signOut, refreshConnectedAccounts, selectAccount } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
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

  // Handle Instagram OAuth redirect (alternative flow)
  const handleConnectClick = () => {
    setShowInstructions(true);
  };

  const handleProceedToOAuth = () => {
    setShowInstructions(false);
    setIsRedirecting(true);

    // Generate and save state for CSRF protection
    const state = generateSecureState();
    const redirectUri = getRedirectUri();
    const timestamp = Date.now().toString();

    // Save to both localStorage AND sessionStorage for redundancy
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_timestamp', timestamp);
    localStorage.setItem('oauth_redirect_uri', redirectUri);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_timestamp', timestamp);
    sessionStorage.setItem('oauth_redirect_uri', redirectUri);

    // Also save to cookie as additional fallback (expires in 10 minutes)
    document.cookie = `oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;
    document.cookie = `oauth_timestamp=${timestamp}; path=/; max-age=600; SameSite=Lax`;

    console.log('[OAuth] === OAuth State Saved ===');
    console.log('[OAuth] State:', state);
    console.log('[OAuth] Redirect URI:', redirectUri);
    console.log('[OAuth] Current origin:', window.location.origin);
    console.log('[OAuth] Timestamp:', new Date(parseInt(timestamp)).toISOString());
    console.log('[OAuth] ============================');

    // Build Instagram OAuth URL with force_reauth for multiple accounts
    const params = new URLSearchParams({
      force_reauth: 'true',
      client_id: INSTAGRAM_APP_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: INSTAGRAM_SCOPES,
      state: state
    });

    const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
    
    console.log('[OAuth] Redirecting to Instagram OAuth...');
    
    // Small delay to ensure storage is written
    setTimeout(() => {
      window.location.href = authUrl;
    }, 100);
  };

  // Reconnect flow (force re-auth)
  const handleReconnect = () => {
    setShowInstructions(true);
  };

  // Show redirect loading screen
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center mb-4">
                <Instagram className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Redirecionando para Instagram
              </h2>
              <p className="text-muted-foreground mb-4">
                Aguarde enquanto você é redirecionado...
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Instagram OAuth Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Instagram className="h-5 w-5 text-white" />
              </div>
              <DialogTitle>Conectar Instagram Business</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <DialogDescription>
              Você será redirecionado para fazer login no Instagram e autorizar o acesso aos seus dados de analytics.
            </DialogDescription>

            {/* Step by step */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Passo a passo:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    1
                  </span>
                  <span className="text-sm text-muted-foreground">Faça login com seu usuário e senha do Instagram</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    2
                  </span>
                  <span className="text-sm text-muted-foreground">Revise e autorize as permissões solicitadas</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    3
                  </span>
                  <span className="text-sm text-muted-foreground">Aguarde o redirecionamento automático de volta</span>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Requisitos importantes:</p>
                  <ul className="text-muted-foreground space-y-0.5 text-xs">
                    <li>• Conta do tipo Business ou Creator</li>
                    <li>• Vinculada a uma Página do Facebook</li>
                    <li>• Você deve ser administrador da conta</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* What we access */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Shield className="h-4 w-4" />
                O que podemos acessar?
                <ChevronDown className="h-3 w-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 pl-6 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1"><Eye className="h-3 w-3 text-green-500" /> Informações do perfil (nome, username, foto)</p>
                <p className="flex items-center gap-1"><Eye className="h-3 w-3 text-green-500" /> Métricas de posts (curtidas, comentários, alcance)</p>
                <p className="flex items-center gap-1"><Eye className="h-3 w-3 text-green-500" /> Demografia dos seguidores</p>
                <p className="flex items-center gap-1"><Eye className="h-3 w-3 text-green-500" /> Insights de stories</p>
                <p className="flex items-center gap-1 text-muted-foreground/60"><EyeOff className="h-3 w-3" /> Não podemos postar ou modificar seu conteúdo</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInstructions(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleProceedToOAuth} className="flex-1">
              Continuar para Instagram
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
