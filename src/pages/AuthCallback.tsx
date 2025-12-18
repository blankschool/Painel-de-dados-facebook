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

      // Validate state parameter (use sessionStorage)
      const storedState = sessionStorage.getItem('oauth_state');
      if (!stateParam || stateParam !== storedState) {
        console.error('State mismatch');
        setStatus('Invalid authentication session');
        sessionStorage.removeItem('oauth_state');
        setTimeout(() => navigate('/auth?error=invalid_state'), 2000);
        return;
      }

      // Validate state timestamp (max 10 minutes)
      try {
        const stateData = JSON.parse(atob(stateParam));
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          setStatus('Authentication session expired');
          sessionStorage.removeItem('oauth_state');
          setTimeout(() => navigate('/auth?error=invalid_state'), 2000);
          return;
        }
      } catch (e) {
        console.warn('Could not validate state timestamp');
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
      sessionStorage.removeItem('oauth_state');

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('Please sign in first');
        sessionStorage.setItem('pending_oauth_code', code);
        sessionStorage.setItem('pending_oauth_method', loginMethod);
        setTimeout(() => navigate('/auth?error=no_session'), 2000);
        return;
      }

      try {
        setStatus('Exchanging code for token...');
        
        // Always use facebook-oauth edge function
        console.log('[AuthCallback] Calling facebook-oauth');
        
        const { data, error: fnError } = await supabase.functions.invoke('facebook-oauth', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { code }
        });

        if (fnError) {
          console.error('[AuthCallback] facebook-oauth error:', fnError);
          throw fnError;
        }

        if (data?.success) {
          setStatus('Account connected successfully! Redirecting...');
          sessionStorage.removeItem('instagram_access_token');
          sessionStorage.removeItem('instagram_user_id');
          sessionStorage.removeItem('auth_redirect_to');
          
          await refreshConnectedAccounts();
          
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
