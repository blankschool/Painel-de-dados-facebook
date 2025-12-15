import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const { user, loading, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithFacebook();
    } catch (error) {
      toast({
        title: 'Erro ao entrar',
        description: 'Ocorreu um erro ao tentar entrar com Facebook. Tente novamente.',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  };

  const handleDemoMode = () => {
    // Store demo mode in localStorage
    localStorage.setItem('demoMode', 'true');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-secondary">
      <div className="w-full max-w-md animate-slide-up p-8">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-card">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
              <Instagram className="h-8 w-8 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Painel de Dados</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Análise completa do seu perfil Instagram
            </p>
          </div>

          {/* Login Button */}
          <Button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full gap-3 rounded-xl bg-primary py-6 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-hover"
          >
            {isSigningIn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
              </svg>
            )}
            Entrar com Facebook / Instagram
          </Button>

          {/* Demo Mode Button */}
          <Button
            variant="outline"
            onClick={handleDemoMode}
            className="mt-3 w-full gap-2 rounded-xl py-6 text-sm font-medium"
          >
            Ver demonstração
          </Button>

          {/* Info */}
          <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-4">
            <p className="text-center text-xs text-muted-foreground">
              Ao continuar, você autoriza o acesso às informações do seu perfil Instagram vinculado ao Facebook.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Seus dados estão protegidos e seguros.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
