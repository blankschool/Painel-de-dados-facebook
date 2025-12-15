import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processando autenticação...');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('Erro na autenticação: ' + error);
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        setStatus('Código de autorização não encontrado');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      try {
        setStatus('Trocando código por token...');
        
        const { data, error: fnError } = await supabase.functions.invoke('instagram-oauth', {
          body: { code }
        });

        if (fnError) throw fnError;

        if (data?.access_token) {
          localStorage.setItem('instagram_access_token', data.access_token);
          localStorage.setItem('instagram_user_id', data.user_id);
          setStatus('Autenticação concluída! Redirecionando...');
          navigate('/');
        } else {
          throw new Error('Token não recebido');
        }
      } catch (err: any) {
        console.error('OAuth error:', err);
        setStatus('Erro ao processar autenticação: ' + err.message);
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground">{status}</p>
      </div>
    </div>
  );
}
