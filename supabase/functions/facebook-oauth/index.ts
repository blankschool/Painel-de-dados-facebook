import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS - dynamically allow any Lovable preview URL
const allowedOrigins = [
  'https://insta-glow-up-39.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Also allow any *.lovableproject.com origin for previews
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  // Allow Lovable preview URLs
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  return false;
};

const getCorsHeaders = (origin: string | null) => {
  const allowed = isAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

// Input validation
const isValidToken = (token: unknown): boolean => {
  return typeof token === 'string' && token.length >= 10 && token.length <= 2000;
};

const isValidCode = (code: unknown): boolean => {
  return typeof code === 'string' && code.length >= 10 && code.length <= 1000;
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[facebook-oauth] Request started');

  try {
    // Step 1: Verify JWT and get authenticated user
    console.log('[facebook-oauth] Step 1: Verifying JWT...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[facebook-oauth] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[facebook-oauth] Auth error:', authError?.message || 'No user');
      throw new Error('Unauthorized');
    }
    console.log('[facebook-oauth] User authenticated:', user.id);

    // Step 2: Parse and validate request body
    console.log('[facebook-oauth] Step 2: Parsing request body...');
    const body = await req.json();
    const { code, access_token: directAccessToken, redirect_uri: clientRedirectUri } = body;
    
    const facebookClientId = Deno.env.get('FACEBOOK_APP_ID');
    const facebookClientSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    const instagramAppId = Deno.env.get('INSTAGRAM_APP_ID') || facebookClientId;
    const instagramAppSecret = Deno.env.get('INSTAGRAM_APP_SECRET') || facebookClientSecret;
    
    // Use client-provided redirect URI or fall back to default
    const redirectUri = clientRedirectUri || origin + '/auth/callback' || 'https://insta-glow-up-39.lovable.app/auth/callback';

    if (!facebookClientId || !facebookClientSecret) {
      console.error('[facebook-oauth] Missing Facebook credentials');
      throw new Error('Facebook app credentials not configured');
    }
    
    console.log('[facebook-oauth] Using redirect URI:', redirectUri);

    let accessToken: string;
    let expiresIn: number;

    // Check if we received a direct access_token (from SDK popup) or a code (from redirect)
    if (directAccessToken && isValidToken(directAccessToken)) {
      console.log('[facebook-oauth] Using direct access token from SDK');
      
      // Exchange short-lived token for long-lived token
      console.log('[facebook-oauth] Exchanging for long-lived token...');
      const longLivedUrl = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${facebookClientId}&client_secret=${facebookClientSecret}&fb_exchange_token=${directAccessToken}`;
      
      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        console.error('[facebook-oauth] Long-lived token error:', JSON.stringify(longLivedData.error));
        throw new Error(`Long-lived token error: ${longLivedData.error.message || longLivedData.error.type}`);
      }

      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000; // 60 days default
      console.log('[facebook-oauth] Long-lived token received, expires in:', expiresIn, 'seconds');
      
    } else if (code && isValidCode(code)) {
      console.log('[facebook-oauth] Using authorization code from redirect, length:', code.length);
      
      // Step 3: Exchange code for short-lived access token
      console.log('[facebook-oauth] Step 3: Exchanging code for access token...');
      const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${facebookClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${facebookClientSecret}&code=${code}`;
      console.log('[facebook-oauth] Requesting token from Facebook...');
      
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('[facebook-oauth] Token exchange error:', JSON.stringify(tokenData.error));
        throw new Error(`Facebook token error: ${tokenData.error.message || tokenData.error.type}`);
      }
      console.log('[facebook-oauth] Short-lived token received');

      // Step 4: Exchange for long-lived token
      console.log('[facebook-oauth] Step 4: Getting long-lived token...');
      const longLivedUrl = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${facebookClientId}&client_secret=${facebookClientSecret}&fb_exchange_token=${tokenData.access_token}`;
      
      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        console.error('[facebook-oauth] Long-lived token error:', JSON.stringify(longLivedData.error));
        throw new Error(`Long-lived token error: ${longLivedData.error.message || longLivedData.error.type}`);
      }

      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000; // 60 days default
      console.log('[facebook-oauth] Long-lived token received, expires in:', expiresIn, 'seconds');
      
    } else {
      console.error('[facebook-oauth] Neither valid code nor access_token provided');
      throw new Error('Invalid request: must provide either code or access_token');
    }

    // Step 5: Get Facebook Pages
    console.log('[facebook-oauth] Step 5: Fetching Facebook Pages...');
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error('[facebook-oauth] Pages fetch error:', JSON.stringify(pagesData.error));
      throw new Error(`Pages fetch error: ${pagesData.error.message}`);
    }

    console.log('[facebook-oauth] Pages found:', pagesData.data?.length || 0);

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('[facebook-oauth] No Facebook Pages found');
      throw new Error('No Facebook Pages found. Please create a Facebook Page and link it to your Instagram Business account.');
    }

    // Step 6: Find Instagram Business Account
    console.log('[facebook-oauth] Step 6: Looking for Instagram Business Account...');
    let instagramUserId: string | null = null;
    let pageAccessToken: string = accessToken;
    let selectedPage: { id: string; name: string } | null = null;

    for (const page of pagesData.data) {
      console.log('[facebook-oauth] Checking page:', page.name, '(ID:', page.id, ')');
      
      if (page.instagram_business_account) {
        instagramUserId = page.instagram_business_account.id;
        pageAccessToken = page.access_token || accessToken;
        selectedPage = { id: page.id, name: page.name };
        console.log('[facebook-oauth] Found Instagram Business Account:', instagramUserId, 'on page:', page.name);
        break;
      }

      // If not returned in initial query, fetch separately
      const igResponse = await fetch(
        `https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
      );
      const igData = await igResponse.json();
      
      if (igData.instagram_business_account) {
        instagramUserId = igData.instagram_business_account.id;
        pageAccessToken = page.access_token || accessToken;
        selectedPage = { id: page.id, name: page.name };
        console.log('[facebook-oauth] Found Instagram Business Account (separate query):', instagramUserId);
        break;
      }
    }

    if (!instagramUserId) {
      console.error('[facebook-oauth] No Instagram Business Account linked to any Facebook Page');
      const pageNames = pagesData.data.map((p: { name: string }) => p.name).join(', ');
      throw new Error(`No Instagram Business Account found. Your Facebook Pages (${pageNames}) are not linked to an Instagram Business account. Please link your Instagram Business/Creator account to a Facebook Page.`);
    }

    // Step 7: Fetch Instagram profile data
    console.log('[facebook-oauth] Step 7: Fetching Instagram profile...');
    const profileResponse = await fetch(
      `https://graph.facebook.com/v24.0/${instagramUserId}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count&access_token=${pageAccessToken}`
    );
    const profileData = await profileResponse.json();

    if (profileData.error) {
      console.error('[facebook-oauth] Profile fetch error:', JSON.stringify(profileData.error));
      throw new Error(`Profile fetch error: ${profileData.error.message}`);
    }

    console.log('[facebook-oauth] Profile fetched:', {
      username: profileData.username,
      name: profileData.name,
      followers: profileData.followers_count,
    });

    // Step 8: Save to database
    console.log('[facebook-oauth] Step 8: Saving to database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        provider: 'facebook',
        provider_account_id: instagramUserId,
        access_token: pageAccessToken, // Use page access token for API calls
        token_expires_at: tokenExpiresAt,
        account_username: profileData.username || null,
        account_name: profileData.name || null,
        profile_picture_url: profileData.profile_picture_url || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider,provider_account_id',
      });

    if (upsertError) {
      console.error('[facebook-oauth] Database upsert error:', upsertError.message);
      throw new Error('Failed to save connected account');
    }

    const duration = Date.now() - startTime;
    console.log('[facebook-oauth] Success! Duration:', duration, 'ms');

    return new Response(JSON.stringify({
      success: true,
      provider: 'facebook',
      instagram_user_id: instagramUserId,
      username: profileData.username,
      name: profileData.name,
      profile_picture_url: profileData.profile_picture_url,
      page_name: selectedPage?.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    console.error('[facebook-oauth] Error after', duration, 'ms:', errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage, 
      success: false,
      duration_ms: duration,
    }), {
      status: error instanceof Error && errorMessage === 'Unauthorized' ? 401 : 500,
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' },
    });
  }
});
