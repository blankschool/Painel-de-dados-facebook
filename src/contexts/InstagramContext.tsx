import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstagramApi, InstagramProfile, InstagramAccount, InstagramMedia, AudienceDemographics } from '@/hooks/useInstagramApi';
import { supabase } from '@/integrations/supabase/client';

interface InstagramContextType {
  accounts: InstagramAccount[];
  selectedAccount: InstagramAccount | null;
  profile: InstagramProfile | null;
  media: InstagramMedia[];
  demographics: AudienceDemographics;
  onlineFollowers: Record<string, number>;
  loading: boolean;
  error: string | null;
  selectAccount: (account: InstagramAccount) => void;
  refreshData: () => Promise<void>;
}

const InstagramContext = createContext<InstagramContextType | undefined>(undefined);

export function InstagramProvider({ children }: { children: React.ReactNode }) {
  const { user, connectedAccounts } = useAuth();
  const api = useInstagramApi();
  
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [demographics, setDemographics] = useState<AudienceDemographics>({});
  const [onlineFollowers, setOnlineFollowers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track if data has been loaded for the current user
  const loadedUserIdRef = useRef<string | null>(null);

  const loadAccountData = useCallback(async (account: InstagramAccount) => {
    setLoading(true);
    setError(null);
    
    try {
      const [profileData, mediaData, demographicsData, onlineData] = await Promise.all([
        api.getUserProfile(account.instagram.id),
        api.getMedia(account.instagram.id),
        api.getAudienceDemographics(account.instagram.id),
        api.getOnlineFollowers(account.instagram.id),
      ]);

      if (profileData) setProfile(profileData);
      setMedia(mediaData);
      setDemographics(demographicsData);
      setOnlineFollowers(onlineData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const selectAccount = useCallback((account: InstagramAccount) => {
    setSelectedAccount(account);
    loadAccountData(account);
  }, [loadAccountData]);

  const refreshData = useCallback(async () => {
    if (selectedAccount) {
      await loadAccountData(selectedAccount);
    }
  }, [selectedAccount, loadAccountData]);

  // Load Instagram data when user has connected accounts
  useEffect(() => {
    // Clear data if no user or no connected accounts
    if (!user || connectedAccounts.length === 0) {
      setAccounts([]);
      setSelectedAccount(null);
      setProfile(null);
      setMedia([]);
      setDemographics({});
      setOnlineFollowers({});
      loadedUserIdRef.current = null;
      return;
    }

    // Skip if already loaded for this user
    if (loadedUserIdRef.current === user.id) {
      return;
    }

    const loadAccounts = async () => {
      setLoading(true);
      try {
        // Get the access token from database via edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-instagram-token', {
          body: {}
        });

        if (tokenError) {
          console.error('Error fetching token:', tokenError);
          setError('Failed to load account data');
          setLoading(false);
          return;
        }

        if (tokenData?.access_token && tokenData?.instagram_user_id) {
          // Store token temporarily in sessionStorage for API calls
          sessionStorage.setItem('instagram_access_token', tokenData.access_token);
          sessionStorage.setItem('instagram_user_id', tokenData.instagram_user_id);

          // Get profile directly
          let profileData = await api.getUserProfile(tokenData.instagram_user_id);
          
          // If API profile fetch fails, use data from connected_accounts as fallback
          if (!profileData && connectedAccounts[0]) {
            const account = connectedAccounts[0];
            profileData = {
              id: account.provider_account_id,
              username: account.account_username || undefined,
              name: account.account_name || undefined,
              profile_picture_url: account.profile_picture_url || undefined,
            };
          }
          
          if (profileData) {
            setProfile(profileData);
            
            // Create a synthetic account for compatibility
            const syntheticAccount: InstagramAccount = {
              pageId: tokenData.instagram_user_id,
              pageName: profileData.username || connectedAccounts[0]?.account_name || 'Instagram Account',
              instagram: profileData,
            };
            setAccounts([syntheticAccount]);
            setSelectedAccount(syntheticAccount);
            
            // Load additional data
            const [mediaData, demographicsData, onlineData] = await Promise.all([
              api.getMedia(tokenData.instagram_user_id),
              api.getAudienceDemographics(tokenData.instagram_user_id),
              api.getOnlineFollowers(tokenData.instagram_user_id),
            ]);
            setMedia(mediaData);
            setDemographics(demographicsData);
            setOnlineFollowers(onlineData);
            
            // Mark as loaded for this user
            loadedUserIdRef.current = user.id;
          } else {
            setError('Could not load profile data');
          }
        }
      } catch (err: any) {
        console.error('Error loading accounts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [user?.id, connectedAccounts.length, api]);

  return (
    <InstagramContext.Provider value={{
      accounts,
      selectedAccount,
      profile,
      media,
      demographics,
      onlineFollowers,
      loading,
      error,
      selectAccount,
      refreshData,
    }}>
      {children}
    </InstagramContext.Provider>
  );
}

export function useInstagram() {
  const context = useContext(InstagramContext);
  if (context === undefined) {
    throw new Error('useInstagram must be used within an InstagramProvider');
  }
  return context;
}
