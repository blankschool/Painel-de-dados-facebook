import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = [
  'https://painel-de-dados-instagram.lovable.app',
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

    // Step 2: Parse request (same as facebook-oauth)
    console.log('[instagram-oauth] Step 2: Parsing request body...');
    let body: any;
    try {
      body = await req.json();
      console.log('[instagram-oauth] Body parsed successfully:', typeof body);
      console.log('[instagram-oauth] Body keys:', Object.keys(body || {}));
    } catch (e) {
      console.error('[instagram-oauth] Failed to parse body with req.json():', e);
      console.error('[instagram-oauth] Error message:', e instanceof Error ? e.message : String(e));
      throw new Error(`Failed to parse request body: ${e instanceof Error ? e.message : String(e)}`);
    }

    const { code, redirect_uri: clientRedirectUri } = body;
    console.log('[instagram-oauth] Request params - code:', code?.substring(0, 20) + '...', 'redirect_uri:', clientRedirectUri);
    
    const instagramAppId = Deno.env.get('INSTAGRAM_APP_ID');
    const instagramAppSecret = Deno.env.get('INSTAGRAM_APP_SECRET');
    
    if (!instagramAppId || !instagramAppSecret) {
      throw new Error('Instagram OAuth credentials not configured');
    }
    
    console.log('[instagram-oauth] Using Instagram App ID:', instagramAppId);
    
    // CRITICAL: Use the EXACT redirect_uri provided by client
    // This MUST match what was used when initiating OAuth
    let redirectUri: string;
    if (clientRedirectUri) {
      redirectUri = clientRedirectUri;
      console.log('[instagram-oauth] Using client-provided redirect URI:', redirectUri);
    } else if (origin) {
      redirectUri = `${origin}/auth/callback`;
      console.log('[instagram-oauth] Constructed redirect URI from origin:', redirectUri);
    } else {
      // Fallback - this should never happen
      redirectUri = 'https://insta-glow-up-39.lovable.app/auth/callback';
      console.warn('[instagram-oauth] Using fallback redirect URI:', redirectUri);
    }

    if (!code) {
      throw new Error('Missing authorization code');
    }

    // Step 3: Exchange code for token (Instagram endpoint)
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
    console.log('[instagram-oauth] Token response body:', tokenText.substring(0, 500));

    if (!tokenResponse.ok) {
      console.error('[instagram-oauth] Token request failed with status:', tokenResponse.status);
      console.error('[instagram-oauth] Response body:', tokenText);
      throw new Error(`Instagram token request failed: ${tokenResponse.status} - ${tokenText.substring(0, 200)}`);
    }

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('[instagram-oauth] Failed to parse response:', tokenText);
      throw new Error('Invalid token response from Instagram');
    }

    console.log('[instagram-oauth] Parsed token data:', JSON.stringify(tokenData, null, 2));

    if (tokenData.error_type || tokenData.error_message || tokenData.error) {
      console.error('[instagram-oauth] Token error:', tokenData);
      const errorMsg = tokenData.error_message || tokenData.error?.message || tokenData.error_type || 'Unknown error';
      throw new Error(`Instagram error: ${errorMsg}`);
    }

    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;
    
    if (!accessToken || !userId) {
      throw new Error('Invalid token response: missing required fields');
    }

    console.log('[instagram-oauth] Access token received for user:', userId);

    // Step 4: Get long-lived token
    console.log('[instagram-oauth] Step 4: Getting long-lived token...');
    
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${accessToken}`;
    
    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData = await longLivedResponse.json();

    const finalAccessToken = longLivedData.access_token || accessToken;
    const expiresIn = longLivedData.expires_in || 3600;

    if (longLivedData.access_token) {
      console.log('[instagram-oauth] Long-lived token received, expires in:', expiresIn);
    } else {
      console.warn('[instagram-oauth] Using short-lived token');
    }

    // Step 5: Fetch profile
    console.log('[instagram-oauth] Step 5: Fetching Instagram profile...');
    
    const profileResponse = await fetch(
      `https://graph.instagram.com/${userId}?fields=id,username,account_type,media_count&access_token=${finalAccessToken}`
    );
    
    const profileData = await profileResponse.json();

    if (profileData.error) {
      throw new Error(`Profile error: ${profileData.error.message}`);
    }

    console.log('[instagram-oauth] Profile:', {
      username: profileData.username,
      account_type: profileData.account_type,
    });

    // Verify Business/Creator account
    if (profileData.account_type !== 'BUSINESS' && profileData.account_type !== 'CREATOR') {
      throw new Error('Only Instagram Business or Creator accounts can be connected. Please convert your account in Instagram app settings.');
    }

    // Step 6: Save to database
    console.log('[instagram-oauth] Step 6: Saving to database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        provider: 'instagram',
        provider_account_id: userId.toString(),
        access_token: finalAccessToken,
        token_expires_at: tokenExpiresAt,
        account_username: profileData.username,
        account_name: profileData.username,
        profile_picture_url: null,
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
      instagram_user_id: userId,
      username: profileData.username,
      account_type: profileData.account_type,
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
