import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same decryption function as ig-dashboard
async function decryptToken(storedToken: string): Promise<string> {
  console.log('[test-instagram-token] Decrypting token...');
  console.log('[test-instagram-token] Stored token format:', {
    starts_with_encrypted: storedToken.startsWith('ENCRYPTED:'),
    starts_with_igaa: storedToken.startsWith('IGAA'),
    starts_with_ig: storedToken.startsWith('IG'),
    starts_with_eaa: storedToken.startsWith('EAA'),
    first_15_chars: storedToken.substring(0, 15),
    length: storedToken.length,
  });

  // Case 1: Encrypted token with ENCRYPTED: prefix
  if (storedToken.startsWith('ENCRYPTED:')) {
    console.log('[test-instagram-token] Detected ENCRYPTED token format');
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('[test-instagram-token] No ENCRYPTION_KEY set but token is encrypted!');
      throw new Error('Cannot decrypt token: ENCRYPTION_KEY not configured');
    }

    try {
      const encryptedData = decodeBase64(storedToken.substring('ENCRYPTED:'.length));
      const iv = encryptedData.slice(0, 12);
      const encryptedContent = encryptedData.slice(12);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32)),
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encryptedContent,
      );

      const decryptedToken = new TextDecoder().decode(decryptedBuffer);
      console.log('[test-instagram-token] Decryption successful');
      return decryptedToken;
    } catch (error) {
      console.error('[test-instagram-token] Decryption failed:', error);
      throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Case 2: Raw token starting with EAA or IG
  if (/^(EAA|IG)/.test(storedToken)) {
    console.log('[test-instagram-token] Detected raw token (EAA or IG prefix)');
    return storedToken;
  }

  // Case 3: Try to decode as legacy base64
  console.log('[test-instagram-token] Attempting legacy base64 decode...');
  try {
    const decodedBytes = decodeBase64(storedToken);
    const decoded = new TextDecoder().decode(decodedBytes);

    if (/^(EAA|IG)/.test(decoded) && decoded.length > 20) {
      console.log('[test-instagram-token] Successfully decoded legacy base64 token');
      return decoded;
    }
  } catch {
    // Ignore base64 decode errors
  }

  console.warn('[test-instagram-token] WARNING: Could not identify token format, returning as-is');
  return storedToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[test-instagram-token] User authenticated:', user.id);

    // Fetch all Instagram/Facebook accounts for this user
    const { data: accounts, error: accountsError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .in('provider', ['instagram', 'facebook']);

    if (accountsError) {
      throw new Error(`Database error: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No connected accounts found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[test-instagram-token] Found ${accounts.length} account(s) to test`);

    // Test each account's token with various API endpoints
    const results = [];

    for (const account of accounts) {
      console.log(`\n[test-instagram-token] ======================================`);
      console.log(`[test-instagram-token] Testing account: @${account.account_username} (${account.provider})`);
      console.log(`[test-instagram-token] Business Account ID: ${account.provider_account_id}`);

      const result: any = {
        account_id: account.id,
        provider: account.provider,
        username: account.account_username,
        provider_account_id: account.provider_account_id,
        tests: [],
      };

      try {
        // Decrypt token
        const decryptedToken = await decryptToken(account.access_token);

        result.token_info = {
          stored_format: account.access_token.substring(0, 20) + '...',
          stored_length: account.access_token.length,
          decrypted_format: decryptedToken.substring(0, 20) + '...',
          decrypted_length: decryptedToken.length,
          starts_with_igaa: decryptedToken.startsWith('IGAA'),
          starts_with_eaa: decryptedToken.startsWith('EAA'),
          looks_valid: /^(EAA|IGAA|IG)/.test(decryptedToken),
        };

        console.log('[test-instagram-token] Token info:', result.token_info);

        // TEST 1: Basic profile endpoint (Facebook Graph API)
        console.log('[test-instagram-token] TEST 1: Facebook Graph API - /{id}?fields=id,username');
        const test1Url = `https://graph.facebook.com/v24.0/${account.provider_account_id}?fields=id,username&access_token=${decryptedToken}`;

        try {
          const test1Response = await fetch(test1Url);
          const test1Data = await test1Response.json();

          result.tests.push({
            name: 'Facebook Graph API - Basic Profile',
            endpoint: `https://graph.facebook.com/v24.0/${account.provider_account_id}`,
            method: 'GET',
            status: test1Response.status,
            success: !test1Data.error,
            response: test1Data,
          });

          if (test1Data.error) {
            console.error('[test-instagram-token] TEST 1 FAILED:', test1Data.error);
          } else {
            console.log('[test-instagram-token] TEST 1 SUCCESS:', test1Data);
          }
        } catch (error) {
          result.tests.push({
            name: 'Facebook Graph API - Basic Profile',
            endpoint: `https://graph.facebook.com/v24.0/${account.provider_account_id}`,
            method: 'GET',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error('[test-instagram-token] TEST 1 ERROR:', error);
        }

        // TEST 2: Instagram Graph API /me endpoint
        console.log('[test-instagram-token] TEST 2: Instagram Graph API - /me');
        const test2Url = `https://graph.instagram.com/v24.0/me?fields=id,username&access_token=${decryptedToken}`;

        try {
          const test2Response = await fetch(test2Url);
          const test2Data = await test2Response.json();

          result.tests.push({
            name: 'Instagram Graph API - /me',
            endpoint: 'https://graph.instagram.com/v24.0/me',
            method: 'GET',
            status: test2Response.status,
            success: !test2Data.error,
            response: test2Data,
          });

          if (test2Data.error) {
            console.error('[test-instagram-token] TEST 2 FAILED:', test2Data.error);
          } else {
            console.log('[test-instagram-token] TEST 2 SUCCESS:', test2Data);
          }
        } catch (error) {
          result.tests.push({
            name: 'Instagram Graph API - /me',
            endpoint: 'https://graph.instagram.com/v24.0/me',
            method: 'GET',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error('[test-instagram-token] TEST 2 ERROR:', error);
        }

        // TEST 3: Token introspection
        console.log('[test-instagram-token] TEST 3: Token Introspection (debug_token)');
        const instagramAppId = Deno.env.get('INSTAGRAM_APP_ID');
        const instagramAppSecret = Deno.env.get('INSTAGRAM_APP_SECRET');

        if (instagramAppId && instagramAppSecret) {
          const test3Url = `https://graph.facebook.com/v24.0/debug_token?input_token=${decryptedToken}&access_token=${instagramAppId}|${instagramAppSecret}`;

          try {
            const test3Response = await fetch(test3Url);
            const test3Data = await test3Response.json();

            result.tests.push({
              name: 'Token Introspection',
              endpoint: 'https://graph.facebook.com/v24.0/debug_token',
              method: 'GET',
              status: test3Response.status,
              success: !test3Data.error,
              response: test3Data,
            });

            if (test3Data.error) {
              console.error('[test-instagram-token] TEST 3 FAILED:', test3Data.error);
            } else {
              console.log('[test-instagram-token] TEST 3 SUCCESS:', JSON.stringify(test3Data, null, 2));
            }
          } catch (error) {
            result.tests.push({
              name: 'Token Introspection',
              endpoint: 'https://graph.facebook.com/v24.0/debug_token',
              method: 'GET',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            console.error('[test-instagram-token] TEST 3 ERROR:', error);
          }
        } else {
          console.warn('[test-instagram-token] TEST 3 SKIPPED: No Instagram app credentials');
          result.tests.push({
            name: 'Token Introspection',
            success: false,
            error: 'Instagram app credentials not configured',
          });
        }

        // TEST 4: Full profile with all fields (same as ig-dashboard uses)
        console.log('[test-instagram-token] TEST 4: Full Profile Fetch');
        const test4Url = `https://graph.facebook.com/v24.0/${account.provider_account_id}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${decryptedToken}`;

        try {
          const test4Response = await fetch(test4Url);
          const test4Data = await test4Response.json();

          result.tests.push({
            name: 'Full Profile (ig-dashboard simulation)',
            endpoint: `https://graph.facebook.com/v24.0/${account.provider_account_id}`,
            method: 'GET',
            status: test4Response.status,
            success: !test4Data.error,
            response: test4Data,
          });

          if (test4Data.error) {
            console.error('[test-instagram-token] TEST 4 FAILED:', test4Data.error);
          } else {
            console.log('[test-instagram-token] TEST 4 SUCCESS:', test4Data);
          }
        } catch (error) {
          result.tests.push({
            name: 'Full Profile (ig-dashboard simulation)',
            endpoint: `https://graph.facebook.com/v24.0/${account.provider_account_id}`,
            method: 'GET',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error('[test-instagram-token] TEST 4 ERROR:', error);
        }

      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[test-instagram-token] Error testing account:`, error);
      }

      results.push(result);
      console.log(`[test-instagram-token] ======================================\n`);
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: user.id,
      accounts_count: accounts.length,
      results: results,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[test-instagram-token] Error:', msg);
    return new Response(JSON.stringify({
      success: false,
      error: msg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
