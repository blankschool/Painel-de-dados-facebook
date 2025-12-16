import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ConnectedAccount {
  id: string;
  provider: 'instagram' | 'facebook';
  provider_account_id: string;
  account_username: string | null;
  account_name: string | null;
  profile_picture_url: string | null;
  token_expires_at: string | null;
}

interface AccountContextType {
  selectedAccount: ConnectedAccount | null;
  selectAccount: (account: ConnectedAccount) => void;
  selectedAccountId: string | null;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { connectedAccounts } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Auto-select first account when accounts load
  useEffect(() => {
    if (connectedAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(connectedAccounts[0].id);
    }
    // Clear selection if account was removed
    if (selectedAccountId && !connectedAccounts.find(a => a.id === selectedAccountId)) {
      setSelectedAccountId(connectedAccounts[0]?.id || null);
    }
  }, [connectedAccounts, selectedAccountId]);

  const selectedAccount = connectedAccounts.find(a => a.id === selectedAccountId) || null;

  const selectAccount = (account: ConnectedAccount) => {
    setSelectedAccountId(account.id);
  };

  return (
    <AccountContext.Provider value={{ selectedAccount, selectAccount, selectedAccountId }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
