import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [accountInfo, setAccountInfo] = useState<{ username?: string; name?: string } | null>(null);
  
  const { user, session, refreshConnectedAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || 'Autorização negada pelo Facebook');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Código de autorização não encontrado');
      return;
    }

    if (!user || !session) {
      // Wait for auth to be ready
      return;
    }

    const exchangeCode = async () => {
      try {
        console.log('[AuthCallback] Exchanging code for token...');
        
        const { data, error } = await supabase.functions.invoke('facebook-oauth', {
          body: { code },
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
        });
        setStatus('success');
        
        // Refresh connected account in context
        await refreshConnectedAccount();

        toast({
          title: 'Conta conectada!',
          description: `@${data.username} foi conectada com sucesso.`,
        });

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/overview', { replace: true });
        }, 2000);

      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    };

    exchangeCode();
  }, [searchParams, user, session, navigate, toast, refreshConnectedAccount]);

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
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Conta conectada!
              </h2>
              {accountInfo && (
                <div className="flex items-center gap-2 mb-4">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    @{accountInfo.username}
                    {accountInfo.name && ` (${accountInfo.name})`}
                  </span>
                </div>
              )}
              <p className="text-muted-foreground mb-4">
                Redirecionando para o dashboard...
              </p>
              <Button onClick={handleGoToDashboard}>
                Ir para o Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Erro na conexão
              </h2>
              <p className="text-muted-foreground mb-4">
                {errorMessage}
              </p>
              <Button onClick={handleRetry}>
                Tentar novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
