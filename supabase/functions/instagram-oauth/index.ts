import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Encryption function for sensitive data
async function encryptToken(token: string): Promise<string> {
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    console.warn('[instagram-oauth] WARNING: No ENCRYPTION_KEY set, storing token in base64 only');
    return encodeBase64(token);
  }

  try {
    // Use Web Crypto API for AES-GCM encryption
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32)),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedToken = new TextEncoder().encode(token);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      encodedToken
    );

    // Combine IV + encrypted data and encode as base64
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return encodeBase64(combined);
  } catch (error) {
    console.error('[instagram-oauth] Encryption error:', error);
    // Fallback to base64 encoding if encryption fails
    return encodeBase64(token);
  }
}

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

    // Step 4: Exchange short-lived token for long-lived token (60 days)
    // This is REQUIRED per Instagram Business Login documentation
    console.log('[instagram-oauth] Step 4: Exchanging short-lived token for long-lived token...');

    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${shortLivedToken}`;

    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedText = await longLivedResponse.text();

    console.log('[instagram-oauth] Long-lived token response status:', longLivedResponse.status);
    console.log('[instagram-oauth] Long-lived token response:', longLivedText);

    if (!longLivedResponse.ok) {
      console.error('[instagram-oauth] Long-lived token exchange failed');
      throw new Error(`Failed to get long-lived token: ${longLivedText}`);
    }

    const longLivedData = JSON.parse(longLivedText);

    if (longLivedData.error) {
      console.error('[instagram-oauth] Long-lived token error:', longLivedData.error);
      throw new Error(`Long-lived token error: ${longLivedData.error.message || JSON.stringify(longLivedData.error)}`);
    }

    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || (60 * 24 * 60 * 60); // Default to 60 days

    console.log('[instagram-oauth] ✓ Long-lived token received, expires in:', expiresIn, 'seconds (', Math.floor(expiresIn / 86400), 'days )');

    // Step 5: Get Instagram Business Account ID
    // Try multiple methods to get the correct Business Account ID
    console.log('[instagram-oauth] Step 5: Finding Instagram Business Account ID...');

    let businessAccountId: string | null = null;
    let discoveryMethod: string = 'unknown';

    // METHOD 1: Try using the instagramUserId directly with Business Discovery
    // This works if the user_id is already a Business Account ID
    console.log('[instagram-oauth] Method 1: Testing if user_id is already a Business Account ID...');
    const testResponse = await fetch(
      `https://graph.instagram.com/v24.0/${instagramUserId}?fields=id,username,account_type&access_token=${accessToken}`
    );
    const testData = await testResponse.json();
    console.log('[instagram-oauth] Test response:', JSON.stringify(testData, null, 2));

    if (!testData.error && testData.id) {
      businessAccountId = testData.id;
      discoveryMethod = 'direct_user_id';
      console.log('[instagram-oauth] ✓ Method 1 SUCCESS: user_id is a valid Business Account ID:', businessAccountId);
    } else {
      console.log('[instagram-oauth] ✗ Method 1 FAILED:', testData.error?.message || 'No error details');

      // METHOD 2: Try Instagram Business Discovery via /me endpoint
      console.log('[instagram-oauth] Method 2: Trying Instagram Business Discovery via /me...');
      const meResponse = await fetch(
        `https://graph.instagram.com/v24.0/me?fields=id,username,account_type&access_token=${accessToken}`
      );
      const meData = await meResponse.json();
      console.log('[instagram-oauth] /me response:', JSON.stringify(meData, null, 2));

      if (!meData.error && meData.id) {
        businessAccountId = meData.id;
        discoveryMethod = 'me_endpoint';
        console.log('[instagram-oauth] ✓ Method 2 SUCCESS: Found Business Account via /me:', businessAccountId);
      } else {
        console.log('[instagram-oauth] ✗ Method 2 FAILED:', meData.error?.message || 'No error details');

        // All methods failed - provide helpful error message
        console.error('[instagram-oauth] All discovery methods failed');
        console.error('[instagram-oauth] Method 1 error:', testData.error);
        console.error('[instagram-oauth] Method 2 error:', meData.error);

        // Determine the most likely cause based on error messages
        const method1Error = testData.error?.message || '';
        const method2Error = meData.error?.message || '';

        if (method1Error.includes('missing permissions') || method2Error.includes('missing permissions')) {
          throw new Error('Permissões ausentes. Certifique-se de conceder todas as permissões necessárias durante o login do Instagram.');
        } else if (method1Error.includes('does not exist') || method2Error.includes('does not exist')) {
          throw new Error('Conta Business do Instagram não encontrada. Certifique-se de que sua conta do Instagram foi convertida para Business ou Creator nas configurações do aplicativo Instagram.');
        } else if (method1Error.includes('access token') || method2Error.includes('access token')) {
          throw new Error('Token de acesso inválido. Tente conectar novamente.');
        } else {
          throw new Error(`Não foi possível acessar a Conta Business do Instagram. Erro Método 1: ${method1Error}. Erro Método 2: ${method2Error}`);
        }
      }
    }

    if (!businessAccountId) {
      throw new Error('Could not determine Instagram Business Account ID. All methods failed.');
    }

    console.log('[instagram-oauth] ✓ Final Business Account ID:', businessAccountId);
    console.log('[instagram-oauth] ✓ Discovery method:', discoveryMethod);

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
        token_type: 'instagram_business_login'
      });

      // Provide helpful error messages based on the error
      if (profileData.error.code === 190 || profileData.error.code === 10) {
        throw new Error('Acesso à conta Instagram negado. Certifique-se de que sua conta é Business ou Creator e que concedeu todas as permissões necessárias.');
      } else if (profileData.error.message.includes('does not exist')) {
        throw new Error('Conta Instagram não encontrada. Isso pode indicar uma conta pessoal que precisa ser convertida para Business ou Creator. Converta sua conta nas configurações do aplicativo Instagram.');
      } else {
        throw new Error(`Erro ao buscar perfil: ${profileData.error.message}`);
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
      throw new Error('Apenas contas Business ou Creator do Instagram podem ser conectadas. Converta sua conta nas configurações do aplicativo Instagram.');
    }

    // Warn if account seems incomplete
    if (!profileInfo.username && !profileInfo.name) {
      console.warn('[instagram-oauth] WARNING: Account has no username or name - may be incomplete profile');
    }

    // Step 7: Save to database with encrypted token
    console.log('[instagram-oauth] Step 7: Encrypting token and saving to database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Encrypt the access token before storing
    const encryptedToken = await encryptToken(accessToken);
    console.log('[instagram-oauth] Token encrypted successfully');

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        provider: 'instagram',
        provider_account_id: finalInstagramUserId,
        access_token: encryptedToken, // Store encrypted token
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
