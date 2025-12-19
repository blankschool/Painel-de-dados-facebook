import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface ConnectedAccount {
  id: string;
  provider: string;
  provider_account_id: string;
  account_username: string | null;
  account_name: string | null;
  profile_picture_url: string | null;
  token_expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  connectedAccount: ConnectedAccount | null;
  isLoadingAccount: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshConnectedAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  const fetchConnectedAccount = async (userId: string) => {
    setIsLoadingAccount(true);
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('id, provider, provider_account_id, account_username, account_name, profile_picture_url, token_expires_at')
        .eq('user_id', userId)
        .eq('provider', 'facebook')
        .maybeSingle();

      if (error) {
        console.error('Error fetching connected account:', error);
        setConnectedAccount(null);
      } else {
        setConnectedAccount(data);
      }
    } catch (err) {
      console.error('Error fetching connected account:', err);
      setConnectedAccount(null);
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const refreshConnectedAccount = async () => {
    if (user) {
      await fetchConnectedAccount(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Fetch connected account when user signs in
        if (session?.user) {
          setTimeout(() => {
            fetchConnectedAccount(session.user.id);
          }, 0);
        } else {
          setConnectedAccount(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        fetchConnectedAccount(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setConnectedAccount(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        connectedAccount,
        isLoadingAccount,
        signIn,
        signUp,
        signOut,
        refreshConnectedAccount,
      }}
    >
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
