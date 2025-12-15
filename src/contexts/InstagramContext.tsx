import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstagramApi, InstagramProfile, InstagramAccount, InstagramMedia, AudienceDemographics } from '@/hooks/useInstagramApi';

interface InstagramContextType {
  accounts: InstagramAccount[];
  selectedAccount: InstagramAccount | null;
  profile: InstagramProfile | null;
  media: InstagramMedia[];
  demographics: AudienceDemographics;
  onlineFollowers: Record<string, number>;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  selectAccount: (account: InstagramAccount) => void;
  refreshData: () => Promise<void>;
}

const InstagramContext = createContext<InstagramContextType | undefined>(undefined);

// Demo data for when user is not authenticated
const demoProfile: InstagramProfile = {
  id: 'demo',
  username: 'usuario_demo',
  name: 'Usuário Demo',
  biography: 'Esta é uma conta de demonstração para visualização do painel.',
  followers_count: 15234,
  follows_count: 892,
  media_count: 156,
  profile_picture_url: 'https://via.placeholder.com/150',
};

const demoDemographics: AudienceDemographics = {
  audience_gender_age: {
    'F.18-24': 1823,
    'F.25-34': 2456,
    'F.35-44': 1234,
    'F.45-54': 567,
    'F.55-64': 234,
    'F.65+': 123,
    'M.18-24': 1456,
    'M.25-34': 2134,
    'M.35-44': 1567,
    'M.45-54': 789,
    'M.55-64': 345,
    'M.65+': 156,
  },
  audience_country: {
    'BR': 12456,
    'PT': 1234,
    'US': 567,
    'ES': 345,
    'AR': 234,
    'MX': 189,
    'CO': 123,
    'CL': 86,
  },
  audience_city: {
    'São Paulo, SP': 3456,
    'Rio de Janeiro, RJ': 2345,
    'Belo Horizonte, MG': 1234,
    'Curitiba, PR': 987,
    'Brasília, DF': 876,
    'Salvador, BA': 765,
    'Fortaleza, CE': 654,
    'Recife, PE': 543,
  },
};

const demoOnlineFollowers: Record<string, number> = {
  '0': 234, '1': 189, '2': 145, '3': 123, '4': 156, '5': 234,
  '6': 456, '7': 789, '8': 1234, '9': 1567, '10': 1789, '11': 1890,
  '12': 2123, '13': 2345, '14': 2456, '15': 2567, '16': 2678, '17': 2789,
  '18': 2890, '19': 2678, '20': 2456, '21': 2123, '22': 1567, '23': 876,
};

const demoMedia: InstagramMedia[] = [
  { id: '1', media_type: 'IMAGE', caption: 'Post de exemplo #1', timestamp: '2024-01-15T10:00:00Z', like_count: 1234, comments_count: 56 },
  { id: '2', media_type: 'CAROUSEL_ALBUM', caption: 'Carrossel de exemplo', timestamp: '2024-01-14T15:30:00Z', like_count: 2345, comments_count: 89 },
  { id: '3', media_type: 'VIDEO', caption: 'Reels de exemplo', timestamp: '2024-01-13T09:00:00Z', like_count: 5678, comments_count: 234 },
  { id: '4', media_type: 'IMAGE', caption: 'Post de exemplo #2', timestamp: '2024-01-12T14:00:00Z', like_count: 987, comments_count: 34 },
  { id: '5', media_type: 'IMAGE', caption: 'Post de exemplo #3', timestamp: '2024-01-11T11:00:00Z', like_count: 1567, comments_count: 67 },
];

export function InstagramProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const api = useInstagramApi();
  
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [demographics, setDemographics] = useState<AudienceDemographics>({});
  const [onlineFollowers, setOnlineFollowers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for Instagram token from localStorage (direct Instagram OAuth)
  const instagramToken = localStorage.getItem('instagram_access_token');
  const instagramUserId = localStorage.getItem('instagram_user_id');
  const isAuthenticated = !!(instagramToken && instagramUserId) || !!session?.provider_token;
  
  const isDemoMode = localStorage.getItem('demoMode') === 'true' && !user && !isAuthenticated;

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

  // Load Instagram accounts when user logs in or has localStorage token
  useEffect(() => {
    const loadAccounts = async () => {
      // Check for direct Instagram OAuth (localStorage token)
      if (instagramToken && instagramUserId) {
        setLoading(true);
        try {
          // For direct Instagram OAuth, get profile directly
          const profileData = await api.getUserProfile(instagramUserId);
          if (profileData) {
            setProfile(profileData);
            // Create a synthetic account for compatibility
            const syntheticAccount: InstagramAccount = {
              pageId: instagramUserId,
              pageName: profileData.username || 'Instagram Account',
              instagram: profileData,
            };
            setAccounts([syntheticAccount]);
            setSelectedAccount(syntheticAccount);
            
            // Load additional data
            const [mediaData, demographicsData, onlineData] = await Promise.all([
              api.getMedia(instagramUserId),
              api.getAudienceDemographics(instagramUserId),
              api.getOnlineFollowers(instagramUserId),
            ]);
            setMedia(mediaData);
            setDemographics(demographicsData);
            setOnlineFollowers(onlineData);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check for Facebook OAuth (Supabase session)
      if (user && session?.provider_token) {
        setLoading(true);
        try {
          const accountsList = await api.getInstagramAccounts();
          setAccounts(accountsList);
          
          // Auto-select first account if available
          if (accountsList.length > 0) {
            selectAccount(accountsList[0]);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Demo mode fallback
      if (isDemoMode) {
        setProfile(demoProfile);
        setMedia(demoMedia);
        setDemographics(demoDemographics);
        setOnlineFollowers(demoOnlineFollowers);
      }
    };

    loadAccounts();
  }, [user, session, isDemoMode, api, selectAccount, instagramToken, instagramUserId]);

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
      isDemoMode,
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
