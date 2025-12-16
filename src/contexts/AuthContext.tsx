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
  connectWithInstagram: () => Promise<void>;
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
  }, []);

  const generateOAuthState = (loginMethod: string, redirectTo: string = '/profile') => {
    const state = btoa(JSON.stringify({
      nonce: crypto.randomUUID(),
      login_method: loginMethod,
      redirect_to: redirectTo,
      timestamp: Date.now(),
    }));
    // Use sessionStorage instead of localStorage for shorter lifetime
    sessionStorage.setItem('oauth_state', state);
    return state;
  };

  const connectWithInstagram = async () => {
    const state = generateOAuthState('instagram', sessionStorage.getItem('auth_redirect_to') || '/profile');
    
    // Instagram Direct OAuth with force_reauth=true for multi-account support
    // Scopes: instagram_business_basic, instagram_business_manage_messages, 
    // instagram_business_manage_comments, instagram_business_content_publish, instagram_business_manage_insights
    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1728352261135208&redirect_uri=https://insta-glow-up-39.lovable.app/auth/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights&state=${encodeURIComponent(state)}`;
    
    window.location.href = instagramAuthUrl;
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
    
    const state = generateOAuthState('facebook', sessionStorage.getItem('auth_redirect_to') || '/profile');
    
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
      connectWithInstagram, 
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
