import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface ConnectedAccount {
  id: string;
  provider: 'instagram' | 'facebook';
  provider_account_id: string;
  account_username: string | null;
  account_name: string | null;
  profile_picture_url: string | null;
  token_expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  connectedAccounts: ConnectedAccount[];
  loadingAccounts: boolean;
  connectWithFacebook: () => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshConnectedAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const devAutoLoginRanRef = React.useRef(false);
  const devSeedRanRef = React.useRef(false);
  const devInsightsSecret = import.meta.env.VITE_DEV_INSIGHTS_SECRET as string | undefined;
  const devIgUserId = import.meta.env.VITE_DEV_IG_USER_ID as string | undefined;
  const devIgUsername = import.meta.env.VITE_DEV_IG_USERNAME as string | undefined;
  const isDevNoAuth = import.meta.env.DEV && !!devInsightsSecret;

  const fetchConnectedAccounts = async (userId: string) => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('id, provider, provider_account_id, account_username, account_name, profile_picture_url, token_expires_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching connected accounts:', error);
        return;
      }

      setConnectedAccounts(data || []);
    } catch (err) {
      console.error('Error fetching connected accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const refreshConnectedAccounts = async () => {
    if (user) {
      await fetchConnectedAccounts(user.id);
    }
  };

  useEffect(() => {
    // DEV only: when using the no-auth dev insights endpoint, bypass Supabase auth and
    // synthesize a connected account for UI routing/selection.
    if (isDevNoAuth) {
      setLoading(false);
      setUser(null);
      setSession(null);
      setConnectedAccounts([
        {
          id: 'dev',
          provider: 'facebook',
          provider_account_id: devIgUserId || 'dev',
          account_username: devIgUsername || null,
          account_name: null,
          profile_picture_url: null,
          token_expires_at: null,
        },
      ]);
      setLoadingAccounts(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch connected accounts when user logs in
        if (session?.user) {
          setTimeout(() => {
            fetchConnectedAccounts(session.user.id);
          }, 0);
        } else {
          setConnectedAccounts([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchConnectedAccounts(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDevNoAuth, devIgUserId, devIgUsername]);

  // DEV convenience: auto-login a test user and seed a fixed account (from Supabase secrets).
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const testEmail = import.meta.env.VITE_DEV_TEST_EMAIL as string | undefined;
    const testPassword = import.meta.env.VITE_DEV_TEST_PASSWORD as string | undefined;
    const shouldSeed = (import.meta.env.VITE_DEV_SEED_TEST_ACCOUNT as string | undefined) === 'true';

    if (isDevNoAuth) return;
    if (!isDev) return;
    if (devAutoLoginRanRef.current) return;
    if (!testEmail || !testPassword) return;
    if (session) return;
    if (loading) return;

    devAutoLoginRanRef.current = true;

    (async () => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

        if (error) {
          console.warn('[dev] auto-login failed:', error.message);
          return;
        }

        if (shouldSeed) {
          const { error: seedError } = await supabase.functions.invoke('seed-test-account', { body: {} });
          if (seedError) console.warn('[dev] seed-test-account failed:', seedError.message);
        }

        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession?.user) {
          await fetchConnectedAccounts(freshSession.user.id);
        }
      } catch (e) {
        console.warn('[dev] auto-login error:', e);
      }
    })();
  }, [loading, session]);

  // DEV convenience: if user is already logged-in (session restored) but no connected account exists yet,
  // seed the fixed test account once to bypass the Facebook connect step.
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const shouldSeed = (import.meta.env.VITE_DEV_SEED_TEST_ACCOUNT as string | undefined) === 'true';
    if (isDevNoAuth) return;
    if (!isDev || !shouldSeed) return;
    if (devSeedRanRef.current) return;
    if (loading || loadingAccounts) return;
    if (!user || !session) return;
    if (connectedAccounts.length > 0) return;

    devSeedRanRef.current = true;
    (async () => {
      try {
        const { error: seedError } = await supabase.functions.invoke('seed-test-account', { body: {} });
        if (seedError) {
          console.warn('[dev] seed-test-account failed:', seedError.message);
          return;
        }
        await fetchConnectedAccounts(user.id);
      } catch (e) {
        console.warn('[dev] seed-test-account error:', e);
      }
    })();
  }, [user, session, loading, loadingAccounts, connectedAccounts.length]);

  const generateOAuthState = (redirectTo: string = '/profile') => {
    const state = btoa(JSON.stringify({
      nonce: crypto.randomUUID(),
      login_method: 'facebook',
      redirect_to: redirectTo,
      timestamp: Date.now(),
    }));
    sessionStorage.setItem('oauth_state', state);
    return state;
  };

  const connectWithFacebook = async () => {
    const clientId = '698718192521096';
    const redirectUri = 'https://insta-glow-up-39.lovable.app/auth/callback';
    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement'
    ].join(',');
    
    const state = generateOAuthState(sessionStorage.getItem('auth_redirect_to') || '/profile');
    
    const facebookAuthUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
    
    window.location.href = facebookAuthUrl;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error disconnecting account:', error);
        return { error: new Error(error.message) };
      }

      // Clear session storage tokens
      sessionStorage.removeItem('instagram_access_token');
      sessionStorage.removeItem('instagram_user_id');

      // Refresh the accounts list
      if (user) {
        await fetchConnectedAccounts(user.id);
      }

      return { error: null };
    } catch (err) {
      console.error('Error disconnecting account:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear storage data
    sessionStorage.removeItem('instagram_access_token');
    sessionStorage.removeItem('instagram_user_id');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('auth_redirect_to');
    setConnectedAccounts([]);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      connectedAccounts,
      loadingAccounts,
      connectWithFacebook,
      disconnectAccount,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshConnectedAccounts,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
