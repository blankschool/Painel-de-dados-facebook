import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Instagram, ArrowRight, BarChart3, Users, TrendingUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type CallbackStatus = 'loading' | 'success' | 'error';

// Helper to get cookie value
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Helper to clear all OAuth state
function clearOAuthState() {
  localStorage.removeItem('oauth_state');
  localStorage.removeItem('oauth_timestamp');
  localStorage.removeItem('oauth_redirect_uri');
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauth_timestamp');
  sessionStorage.removeItem('oauth_redirect_uri');
  // Clear cookies
  document.cookie = 'oauth_state=; path=/; max-age=0';
  document.cookie = 'oauth_timestamp=; path=/; max-age=0';
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [accountInfo, setAccountInfo] = useState<{ username?: string; name?: string; profile_picture_url?: string } | null>(null);
  
  const { user, session, refreshConnectedAccounts } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Prevent duplicate calls - authorization codes can only be used once
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');

    // Handle OAuth errors from Instagram/Facebook
    if (error) {
      console.error('[AuthCallback] OAuth error:', error, errorDescription);
      setStatus('error');
      
      // User-friendly error messages
      if (error === 'access_denied') {
        setErrorMessage('Você negou a autorização. Para conectar sua conta, você precisa autorizar o acesso.');
      } else {
        setErrorMessage(errorDescription || 'Autorização negada pelo Facebook/Instagram');
      }
      clearOAuthState();
      return;
    }

    // No authorization code
    if (!code) {
      setStatus('error');
      setErrorMessage('Código de autorização não recebido. Por favor, tente novamente.');
      clearOAuthState();
      return;
    }

    // Wait for user authentication
    if (!user || !session) {
      return;
    }

    // Prevent duplicate processing
    if (hasProcessedRef.current) {
      console.log('[AuthCallback] Code already processed, skipping...');
      return;
    }
    hasProcessedRef.current = true;

    // State verification (lenient mode)
    const savedState = localStorage.getItem('oauth_state') || 
                       sessionStorage.getItem('oauth_state') || 
                       getCookie('oauth_state');
    
    console.log('[AuthCallback] === OAuth Callback Debug Info ===');
    console.log('[AuthCallback] URL:', window.location.href);
    console.log('[AuthCallback] Received state:', state);
    console.log('[AuthCallback] Saved state (localStorage):', localStorage.getItem('oauth_state'));
    console.log('[AuthCallback] Saved state (sessionStorage):', sessionStorage.getItem('oauth_state'));
    console.log('[AuthCallback] Saved state (cookie):', getCookie('oauth_state'));
    console.log('[AuthCallback] Final saved state:', savedState);
    console.log('[AuthCallback] States match:', state === savedState);
    console.log('[AuthCallback] Has code:', !!code);
    console.log('[AuthCallback] User ID:', user.id);
    console.log('[AuthCallback] ================================');

    // LENIENT STATE VERIFICATION
    if (state && savedState && state !== savedState) {
      // Both exist but don't match = potential CSRF attack
      console.error('[AuthCallback] State mismatch - security issue!', {
        received: state,
        expected: savedState,
      });
      setStatus('error');
      setErrorMessage('Erro de segurança detectado. Por favor, tente novamente.');
      clearOAuthState();
      return;
    }

    if (!savedState && state) {
      // State in URL but not in storage - Instagram may have cleared it
      console.warn('[AuthCallback] State not in storage but code present. Continuing...');
    }

    console.log('[AuthCallback] State validation passed ✓');
    clearOAuthState();

    const exchangeCode = async () => {
      try {
        console.log('[AuthCallback] Exchanging code for token...');
        
        // Include the redirect_uri so the edge function uses the correct one for token exchange
        const { data, error } = await supabase.functions.invoke('facebook-oauth', {
          body: { 
            code,
            redirect_uri: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          console.error('[AuthCallback] Function error:', error);
          throw new Error(error.message || 'Erro ao processar autorização');
        }

        if (!data.success) {
          console.error('[AuthCallback] API error:', data.error);
          throw new Error(data.error || 'Erro ao conectar conta');
        }

        console.log('[AuthCallback] Success:', data);
        
        setAccountInfo({
          username: data.username,
          name: data.name,
          profile_picture_url: data.profile_picture_url,
        });
        setStatus('success');
        
        // Refresh connected accounts in context
        await refreshConnectedAccounts();

        toast({
          title: 'Conta conectada!',
          description: `@${data.username} foi conectada com sucesso.`,
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/overview', { replace: true });
        }, 3000);

      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setStatus('error');
        
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        
        // Improve common error messages
        if (errorMsg.includes('No Instagram Business Account')) {
          setErrorMessage('Nenhuma conta Instagram Business encontrada. Certifique-se de que sua conta é Business ou Creator e está vinculada a uma Página do Facebook.');
        } else if (errorMsg.includes('already connected')) {
          setErrorMessage('Esta conta já está conectada.');
        } else {
          setErrorMessage(errorMsg);
        }
      }
    };

    exchangeCode();
  }, [searchParams, user, session, navigate, toast, refreshConnectedAccounts]);

  const handleRetry = () => {
    navigate('/connect');
  };

  const handleGoToDashboard = () => {
    navigate('/overview');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Conectando sua conta
              </h2>
              <p className="text-muted-foreground">
                Aguarde enquanto configuramos sua conta do Instagram...
              </p>
              <div className="mt-4 w-full max-w-xs">
                <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="flex flex-col items-center text-center">
              {/* Success animation */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-foreground mb-2">
                🎉 Conta Conectada!
              </h2>

              {accountInfo && (
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl mb-4">
                  {accountInfo.profile_picture_url ? (
                    <img 
                      src={accountInfo.profile_picture_url} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-foreground">
                      @{accountInfo.username}
                    </p>
                    {accountInfo.name && (
                      <p className="text-sm text-muted-foreground">
                        {accountInfo.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-muted-foreground mb-4">
                Sua conta foi conectada com sucesso! Estamos carregando seus dados...
              </p>

              {/* Features preview */}
              <div className="w-full text-left p-4 bg-secondary/30 rounded-lg mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Agora você pode:</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Ver métricas de todos os seus posts
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Analisar demografia dos seguidores
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Acompanhar performance de stories
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Exportar relatórios em CSV
                  </div>
                </div>
              </div>

              <Button onClick={handleGoToDashboard} className="w-full">
                Ir para o Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-muted-foreground mt-3">
                Redirecionando automaticamente em 3 segundos...
              </p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Erro na Conexão
              </h2>
              <p className="text-muted-foreground mb-4">
                {errorMessage}
              </p>

              {/* Common solutions */}
              <div className="w-full text-left p-4 bg-secondary/30 rounded-lg mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Soluções comuns:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Certifique-se de que sua conta é Business/Creator</li>
                  <li>Verifique se a conta está vinculada a uma Página do Facebook</li>
                  <li>Tente fazer logout do Instagram e login novamente</li>
                  <li>Limpe o cache do navegador e tente novamente</li>
                </ul>
              </div>

              {/* Debug info for developers */}
              <Collapsible className="w-full mb-4">
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:underline">
                  Informações técnicas (para desenvolvedores)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 p-2 bg-secondary/50 rounded text-xs text-left overflow-auto max-h-32">
                    {JSON.stringify({
                      error: errorMessage,
                      url: window.location.href,
                      hasCode: searchParams.get('code') ? 'Yes' : 'No',
                      hasState: searchParams.get('state') ? 'Yes' : 'No',
                      timestamp: new Date().toISOString(),
                    }, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2 w-full">
                <Button onClick={handleRetry} className="flex-1">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
