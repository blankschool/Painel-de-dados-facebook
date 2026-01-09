import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface ConnectedAccount {
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
  connectedAccounts: ConnectedAccount[];
  selectedAccount: ConnectedAccount | null;
  isLoadingAccounts: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshConnectedAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => void;
}

const SELECTED_ACCOUNT_KEY = 'selected_account_id';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const fetchConnectedAccounts = async (userId: string) => {
    setIsLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('id, provider, provider_account_id, account_username, account_name, profile_picture_url, token_expires_at')
        .eq('user_id', userId)
        .eq('provider', 'facebook')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connected accounts:', error);
        setConnectedAccounts([]);
        setSelectedAccount(null);
      } else {
        const accounts = data || [];
        setConnectedAccounts(accounts);
        
        // Restore previously selected account or select first one
        const savedAccountId = localStorage.getItem(SELECTED_ACCOUNT_KEY);
        const savedAccount = accounts.find(acc => acc.id === savedAccountId);
        
        if (savedAccount) {
          setSelectedAccount(savedAccount);
        } else if (accounts.length > 0) {
          setSelectedAccount(accounts[0]);
          localStorage.setItem(SELECTED_ACCOUNT_KEY, accounts[0].id);
        } else {
          setSelectedAccount(null);
          localStorage.removeItem(SELECTED_ACCOUNT_KEY);
        }
      }
    } catch (err) {
      console.error('Error fetching connected accounts:', err);
      setConnectedAccounts([]);
      setSelectedAccount(null);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const refreshConnectedAccounts = async () => {
    if (user) {
      await fetchConnectedAccounts(user.id);
    }
  };

  const selectAccount = (accountId: string) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccount(account);
      localStorage.setItem(SELECTED_ACCOUNT_KEY, accountId);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Fetch connected accounts when user signs in
        if (session?.user) {
          setTimeout(() => {
            fetchConnectedAccounts(session.user.id);
          }, 0);
        } else {
          setConnectedAccounts([]);
          setSelectedAccount(null);
          localStorage.removeItem(SELECTED_ACCOUNT_KEY);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        fetchConnectedAccounts(session.user.id);
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
    setConnectedAccounts([]);
    setSelectedAccount(null);
    localStorage.removeItem(SELECTED_ACCOUNT_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        connectedAccounts,
        selectedAccount,
        isLoadingAccounts,
        signIn,
        signUp,
        signOut,
        refreshConnectedAccounts,
        selectAccount,
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
