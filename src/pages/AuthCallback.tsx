import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshConnectedAccounts } = useAuth();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const stateParam = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        setStatus('Authentication error: ' + error);
        setTimeout(() => navigate('/auth?error=unknown'), 2000);
        return;
      }

      if (!code) {
        setStatus('Authorization code not found');
        setTimeout(() => navigate('/auth?error=unknown'), 2000);
        return;
      }

      // Validate state parameter
      const storedState = localStorage.getItem('oauth_state');
      if (!stateParam || stateParam !== storedState) {
        console.error('State mismatch:', { stateParam, storedState });
        setStatus('Invalid authentication session');
        localStorage.removeItem('oauth_state');
        setTimeout(() => navigate('/auth?error=invalid_state'), 2000);
        return;
      }

      // Parse state to get login method
      let loginMethod = 'instagram';
      try {
        const stateData = JSON.parse(atob(stateParam));
        loginMethod = stateData.login_method || 'instagram';
      } catch (e) {
        console.warn('Could not parse state data');
      }

      // Clear stored state
      localStorage.removeItem('oauth_state');

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('Please sign in first');
        localStorage.setItem('pending_oauth_code', code);
        localStorage.setItem('pending_oauth_method', loginMethod);
        setTimeout(() => navigate('/auth?error=no_session'), 2000);
        return;
      }

      try {
        setStatus('Exchanging code for token...');
        
        const { data, error: fnError } = await supabase.functions.invoke('instagram-oauth', {
          body: { 
            code,
            user_id: session.user.id,
            provider: loginMethod
          }
        });

        if (fnError) throw fnError;

        if (data?.success) {
          setStatus('Account connected successfully! Redirecting...');
          // Clear any old localStorage tokens
          localStorage.removeItem('instagram_access_token');
          localStorage.removeItem('instagram_user_id');
          localStorage.removeItem('auth_redirect_to');
          
          // Refresh connected accounts in context
          await refreshConnectedAccounts();
          
          // Always redirect to /profile after successful connection
          setTimeout(() => navigate('/profile'), 1000);
        } else {
          throw new Error(data?.error || 'Token not received');
        }
      } catch (err: any) {
        console.error('OAuth error:', err);
        setStatus('Error processing authentication: ' + err.message);
        setTimeout(() => navigate('/auth?error=token_exchange_failed'), 3000);
      }
    };

    handleCallback();
  }, [navigate, refreshConnectedAccounts]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground">{status}</p>
      </div>
    </div>
  );
}
