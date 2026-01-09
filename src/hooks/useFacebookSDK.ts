import { useState, useEffect, useCallback } from 'react';

const FACEBOOK_APP_ID = '698718192521096';
const FACEBOOK_API_VERSION = 'v24.0';

interface FacebookAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
}

interface FacebookLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: FacebookAuthResponse;
}

interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: FacebookAuthResponse;
}

declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      getLoginStatus: (callback: (response: FacebookLoginStatusResponse) => void) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options?: { scope: string; return_scopes?: boolean }
      ) => void;
      logout: (callback: () => void) => void;
      XFBML?: {
        parse: (element?: HTMLElement) => void;
      };
      AppEvents: {
        logPageView: () => void;
      };
    };
    fbAsyncInit: () => void;
  }
}

export function useFacebookSDK() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginStatus, setLoginStatus] = useState<FacebookLoginStatusResponse | null>(null);

  useEffect(() => {
    // Check if SDK is already loaded
    if (window.FB) {
      setIsSDKLoaded(true);
      setIsLoading(false);
      checkLoginStatus();
      return;
    }

    // Define the callback for when SDK loads
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: FACEBOOK_API_VERSION,
      });

      window.FB.AppEvents.logPageView();
      setIsSDKLoaded(true);
      setIsLoading(false);
      
      // Check login status after SDK initializes
      checkLoginStatus();
    };

    // Load the SDK asynchronously
    const loadSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        return;
      }

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      script.async = true;
      script.defer = true;
      
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(script, firstScript);
    };

    loadSDK();
  }, []);

  const checkLoginStatus = useCallback(() => {
    if (!window.FB) return;
    
    window.FB.getLoginStatus((response) => {
      console.log('[Facebook SDK] Login status:', response.status);
      setLoginStatus(response);
    });
  }, []);

  const login = useCallback((scopes: string): Promise<FacebookLoginResponse> => {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      window.FB.login(
        (response) => {
          console.log('[Facebook SDK] Login response:', response.status);
          setLoginStatus(response);
          resolve(response);
        },
        { scope: scopes, return_scopes: true }
      );
    });
  }, []);

  const logout = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.FB) {
        resolve();
        return;
      }

      window.FB.logout(() => {
        setLoginStatus({ status: 'unknown' });
        resolve();
      });
    });
  }, []);

  return {
    isSDKLoaded,
    isLoading,
    loginStatus,
    checkLoginStatus,
    login,
    logout,
  };
}
