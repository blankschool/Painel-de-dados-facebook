import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS
const allowedOrigins = [
  'https://insta-glow-up-39.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

// Valid providers
const validProviders = ['instagram', 'facebook'] as const;

// Input validation
const isValidCode = (code: unknown): boolean => {
  return typeof code === 'string' && code.length >= 10 && code.length <= 1000;
};

const isValidProvider = (provider: unknown): provider is typeof validProviders[number] => {
  return typeof provider === 'string' && validProviders.includes(provider as typeof validProviders[number]);
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's JWT to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { code, provider = 'instagram' } = body;
    
    // Validate inputs
    if (!isValidCode(code)) {
      throw new Error('Invalid authorization code format');
    }

    if (!isValidProvider(provider)) {
      throw new Error('Invalid provider parameter');
    }

    const redirectUri = 'https://insta-glow-up-39.lovable.app/auth/callback';

    let accessToken: string;
    let instagramUserId: string;
    let expiresIn: number;

    if (provider === 'facebook') {
      // Facebook OAuth flow - use Facebook credentials
      const facebookClientId = Deno.env.get('FACEBOOK_APP_ID');
      const facebookClientSecret = Deno.env.get('FACEBOOK_APP_SECRET');
      
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${facebookClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${facebookClientSecret}&code=${code}`
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error.message);
      }

      // Get long-lived token for Facebook
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${facebookClientId}&client_secret=${facebookClientSecret}&fb_exchange_token=${tokenData.access_token}`
      );

      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        throw new Error(longLivedData.error.message);
      }

      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000;

      // Get Instagram business account ID via Facebook Pages
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v24.0/me/accounts?access_token=${accessToken}`
      );
      const pagesData = await pagesResponse.json();
      
      if (pagesData.data && pagesData.data.length > 0) {
        const page = pagesData.data[0];
        const igResponse = await fetch(
          `https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
        );
        const igData = await igResponse.json();
        
        if (igData.instagram_business_account) {
          instagramUserId = igData.instagram_business_account.id;
        } else {
          throw new Error('No Instagram business account linked to Facebook page');
        }
      } else {
        throw new Error('No Facebook pages found');
      }

    } else {
      // Instagram Direct OAuth flow - use Instagram credentials
      const instagramClientId = Deno.env.get('INSTAGRAM_APP_ID');
      const instagramClientSecret = Deno.env.get('INSTAGRAM_APP_SECRET');
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: instagramClientId!,
          client_secret: instagramClientSecret!,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error_message) {
        throw new Error(tokenData.error_message);
      }

      const { access_token: shortLivedToken, user_id: igUserId } = tokenData;
      instagramUserId = igUserId;

      // Exchange short-lived token for long-lived token
      const longLivedResponse = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramClientSecret}&access_token=${shortLivedToken}`
      );

      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        throw new Error(longLivedData.error.message);
      }

      accessToken = longLivedData.access_token || shortLivedToken;
      expiresIn = longLivedData.expires_in || 5184000;
    }

    // Get Instagram profile info
    const profileResponse = await fetch(
      `https://graph.instagram.com/v18.0/${instagramUserId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
    );
    const profileData = await profileResponse.json();

    // Save to database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        provider: provider,
        provider_account_id: instagramUserId,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        account_username: profileData.username || null,
        account_name: profileData.name || null,
        profile_picture_url: profileData.profile_picture_url || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider,provider_account_id',
      });

    if (upsertError) {
      console.error('Database upsert error:', upsertError.message);
      throw new Error('Failed to save connected account');
    }

    return new Response(JSON.stringify({
      success: true,
      provider: provider,
      instagram_user_id: instagramUserId,
      username: profileData.username,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Instagram OAuth error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: error instanceof Error && errorMessage === 'Unauthorized' ? 401 : 500,
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' },
    });
  }
});