import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = [
  'https://painel-de-dados-instagram.lovable.app',
  'https://insta-glow-up-39.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  return false;
};

const getCorsHeaders = (origin: string | null) => {
  const allowed = isAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[instagram-oauth] Request started');
  console.log('[instagram-oauth] Method:', req.method);
  console.log('[instagram-oauth] URL:', req.url);
  console.log('[instagram-oauth] Origin:', origin);
  console.log('[instagram-oauth] Content-Type:', req.headers.get('content-type'));

  try {
    // Step 1: Verify JWT
    console.log('[instagram-oauth] Step 1: Verifying JWT...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      throw new Error('Unauthorized');
    }
    console.log('[instagram-oauth] User authenticated:', user.id);

    // Step 2: Parse and validate request body
    console.log('[instagram-oauth] Step 2: Parsing request body...');
    const body = await req.json();
    const { code, redirect_uri: clientRedirectUri } = body;
    console.log('[instagram-oauth] Request params - code:', code?.substring(0, 20) + '...', 'redirect_uri:', clientRedirectUri);

    // Instagram Business Login API uses Instagram app credentials
    const instagramAppId = Deno.env.get('INSTAGRAM_APP_ID');
    const instagramAppSecret = Deno.env.get('INSTAGRAM_APP_SECRET');

    if (!instagramAppId || !instagramAppSecret) {
      throw new Error('Instagram OAuth credentials not configured');
    }

    console.log('[instagram-oauth] Using Instagram App ID:', instagramAppId);

    // CRITICAL: Use the EXACT redirect_uri provided by client
    let redirectUri: string;
    if (clientRedirectUri) {
      redirectUri = clientRedirectUri;
      console.log('[instagram-oauth] Using client-provided redirect URI:', redirectUri);
    } else if (origin) {
      redirectUri = `${origin}/auth/callback`;
      console.log('[instagram-oauth] Constructed redirect URI from origin:', redirectUri);
    } else {
      redirectUri = 'https://insta-glow-up-39.lovable.app/auth/callback';
      console.warn('[instagram-oauth] Using fallback redirect URI:', redirectUri);
    }

    if (!code) {
      throw new Error('Missing authorization code');
    }

    // Step 3: Exchange code for short-lived access token (Instagram API)
    console.log('[instagram-oauth] Step 3: Exchanging code for access token...');

    const tokenFormData = new URLSearchParams({
      client_id: instagramAppId,
      client_secret: instagramAppSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenFormData.toString(),
    });

    const tokenText = await tokenResponse.text();
    console.log('[instagram-oauth] Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('[instagram-oauth] Token request failed:', tokenText);
      throw new Error(`Instagram token request failed: ${tokenResponse.status}`);
    }

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('[instagram-oauth] Failed to parse token response:', tokenText);
      throw new Error('Invalid token response from Instagram');
    }

    // Check for errors in response
    if (tokenData.error_type || tokenData.error_message) {
      const errorMsg = tokenData.error_message || tokenData.error_type || 'Unknown error';
      console.error('[instagram-oauth] Token error:', tokenData);
      throw new Error(`Instagram error: ${errorMsg}`);
    }

    // DIAGNOSTIC: Log full token response structure
    console.log('[instagram-oauth] FULL TOKEN RESPONSE:', JSON.stringify(tokenData, null, 2));

    // Instagram Business Login returns data array
    const tokenInfo = tokenData.data?.[0] || tokenData;
    const shortLivedToken = tokenInfo.access_token;
    const instagramUserId = tokenInfo.user_id;

    if (!shortLivedToken || !instagramUserId) {
      console.error('[instagram-oauth] Missing token or user_id:', tokenData);
      throw new Error('Invalid token response: missing access_token or user_id');
    }

    console.log('[instagram-oauth] Short-lived token received for user:', instagramUserId);
    console.log('[instagram-oauth] Token info structure:', {
      has_data_array: !!tokenData.data,
      permissions: tokenInfo.permissions,
      user_id: instagramUserId,
      token_prefix: shortLivedToken.substring(0, 20) + '...'
    });

    // Step 4: Exchange for long-lived token (60 days)
    console.log('[instagram-oauth] Step 4: Getting long-lived token...');
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${shortLivedToken}`;

    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData = await longLivedResponse.json();

    console.log('[instagram-oauth] Long-lived token response:', JSON.stringify(longLivedData, null, 2));

    const accessToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 3600;

    if (longLivedData.access_token) {
      console.log('[instagram-oauth] Long-lived token received, expires in:', expiresIn, 'seconds');
    } else {
      console.warn('[instagram-oauth] Using short-lived token, long-lived exchange failed:', longLivedData.error);
    }

    // Step 5: Get Instagram Business Account ID via Facebook Pages
    // The user_id from Instagram OAuth is a personal ID, not the Business Account ID
    // We need to query Facebook Pages to get the instagram_business_account ID
    console.log('[instagram-oauth] Step 5: Fetching Facebook Pages to get Instagram Business Account...');

    const pagesResponse = await fetch(
      `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    );

    console.log('[instagram-oauth] Pages response status:', pagesResponse.status);
    const pagesData = await pagesResponse.json();
    console.log('[instagram-oauth] FULL PAGES RESPONSE:', JSON.stringify(pagesData, null, 2));

    if (pagesData.error) {
      console.error('[instagram-oauth] Pages fetch error:', pagesData.error);
      throw new Error(`Failed to fetch Facebook Pages: ${pagesData.error.message}`);
    }

    // Find a page with an Instagram Business Account
    const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      console.error('[instagram-oauth] No Instagram Business Account found in pages:', pagesData);
      throw new Error('No Instagram Business Account found. Please ensure your Instagram account is connected to a Facebook Page and converted to a Business or Creator account.');
    }

    const businessAccountId = pageWithInstagram.instagram_business_account.id;
    console.log('[instagram-oauth] Found Instagram Business Account ID:', businessAccountId);
    console.log('[instagram-oauth] Connected to Facebook Page:', pageWithInstagram.name);

    // Step 6: Fetch Instagram profile using the Business Account ID
    console.log('[instagram-oauth] Step 6: Fetching Instagram profile...');
    console.log('[instagram-oauth] Profile URL:', `https://graph.instagram.com/v24.0/${businessAccountId}?fields=id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count`);

    const profileResponse = await fetch(
      `https://graph.instagram.com/v24.0/${businessAccountId}?fields=id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count&access_token=${accessToken}`
    );

    console.log('[instagram-oauth] Profile response status:', profileResponse.status);
    const profileData = await profileResponse.json();

    console.log('[instagram-oauth] FULL PROFILE RESPONSE:', JSON.stringify(profileData, null, 2));

    if (profileData.error) {
      console.error('[instagram-oauth] Profile fetch error details:', {
        message: profileData.error.message,
        type: profileData.error.type,
        code: profileData.error.code,
        error_subcode: profileData.error.error_subcode,
        fbtrace_id: profileData.error.fbtrace_id,
        user_id_used: instagramUserId,
        token_type: longLivedData.access_token ? 'long-lived' : 'short-lived'
      });

      // Provide helpful error messages based on the error
      if (profileData.error.code === 190 || profileData.error.code === 10) {
        throw new Error('Instagram account access denied. Please ensure your account is a Business or Creator account and has granted all required permissions.');
      } else if (profileData.error.message.includes('does not exist')) {
        throw new Error('Instagram account not found. This may indicate a personal account that needs to be converted to Business or Creator type. Please convert your account in the Instagram app settings.');
      } else {
        throw new Error(`Profile fetch error: ${profileData.error.message}`);
      }
    }

    // Extract profile data (direct user query, not wrapped in data array)
    const profileInfo = profileData;
    const finalInstagramUserId = profileInfo.id || businessAccountId;

    console.log('[instagram-oauth] Profile fetched successfully:', {
      user_id: finalInstagramUserId,
      username: profileInfo.username,
      name: profileInfo.name,
      account_type: profileInfo.account_type,
      followers: profileInfo.followers_count,
      has_username: !!profileInfo.username,
      has_name: !!profileInfo.name,
    });

    // Verify Business/Creator account
    if (profileInfo.account_type && profileInfo.account_type !== 'BUSINESS' && profileInfo.account_type !== 'MEDIA_CREATOR') {
      throw new Error('Only Instagram Business or Creator accounts can be connected. Please convert your account in Instagram app settings.');
    }

    // Warn if account seems incomplete
    if (!profileInfo.username && !profileInfo.name) {
      console.warn('[instagram-oauth] WARNING: Account has no username or name - may be incomplete profile');
    }

    // Step 7: Save to database
    console.log('[instagram-oauth] Step 7: Saving to database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        provider: 'instagram',
        provider_account_id: finalInstagramUserId,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        account_username: profileInfo.username || null,
        account_name: profileInfo.name || null,
        profile_picture_url: profileInfo.profile_picture_url || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider,provider_account_id',
      });

    if (upsertError) {
      console.error('[instagram-oauth] Database error:', upsertError.message);
      throw new Error('Failed to save connected account');
    }

    const duration = Date.now() - startTime;
    console.log('[instagram-oauth] Success! Duration:', duration, 'ms');

    return new Response(JSON.stringify({
      success: true,
      provider: 'instagram',
      instagram_user_id: finalInstagramUserId,
      username: profileInfo.username,
      name: profileInfo.name,
      account_type: profileInfo.account_type,
      profile_picture_url: profileInfo.profile_picture_url,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    console.error('[instagram-oauth] Error:', errorMessage, 'Duration:', duration, 'ms');
    
    return new Response(JSON.stringify({ 
      error: errorMessage, 
      success: false,
    }), {
      status: error instanceof Error && errorMessage === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
