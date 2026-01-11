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
  console.log('[debug-token] Decrypting token...');
  console.log('[debug-token] Stored token format:', {
    starts_with_encrypted: storedToken.startsWith('ENCRYPTED:'),
    starts_with_igaa: storedToken.startsWith('IGAA'),
    starts_with_ig: storedToken.startsWith('IG'),
    starts_with_eaa: storedToken.startsWith('EAA'),
    first_15_chars: storedToken.substring(0, 15),
    length: storedToken.length,
  });

  // Case 1: Encrypted token with ENCRYPTED: prefix
  if (storedToken.startsWith('ENCRYPTED:')) {
    console.log('[debug-token] Detected ENCRYPTED token format');
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('[debug-token] No ENCRYPTION_KEY set but token is encrypted!');
      throw new Error('Cannot decrypt token: ENCRYPTION_KEY not configured');
    }

    try {
      // Remove ENCRYPTED: prefix and decode base64
      const encryptedData = decodeBase64(storedToken.substring('ENCRYPTED:'.length));

      // First 12 bytes are IV, rest is encrypted content
      const iv = encryptedData.slice(0, 12);
      const encryptedContent = encryptedData.slice(12);

      console.log('[debug-token] IV length:', iv.length);
      console.log('[debug-token] Encrypted content length:', encryptedContent.length);

      // Import the encryption key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32)),
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );

      // Decrypt using AES-GCM
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encryptedContent,
      );

      const decryptedToken = new TextDecoder().decode(decryptedBuffer);
      console.log('[debug-token] Decryption successful');
      console.log('[debug-token] Decrypted token format:', {
        starts_with_igaa: decryptedToken.startsWith('IGAA'),
        starts_with_ig: decryptedToken.startsWith('IG'),
        starts_with_eaa: decryptedToken.startsWith('EAA'),
        first_15_chars: decryptedToken.substring(0, 15),
        length: decryptedToken.length,
      });

      return decryptedToken;
    } catch (error) {
      console.error('[debug-token] Decryption failed:', error);
      throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Case 2: Raw token starting with EAA or IG
  if (/^(EAA|IG)/.test(storedToken)) {
    console.log('[debug-token] Detected raw token (EAA or IG prefix)');
    return storedToken;
  }

  // Case 3: Try to decode as legacy base64
  console.log('[debug-token] Attempting legacy base64 decode...');
  try {
    const decodedBytes = decodeBase64(storedToken);
    const decoded = new TextDecoder().decode(decodedBytes);

    console.log('[debug-token] Base64 decoded result:', {
      starts_with_igaa: decoded.startsWith('IGAA'),
      starts_with_ig: decoded.startsWith('IG'),
      starts_with_eaa: decoded.startsWith('EAA'),
      first_15_chars: decoded.substring(0, 15),
      length: decoded.length,
    });

    // Check if decoded string looks like a valid token
    if (/^(EAA|IG)/.test(decoded) && decoded.length > 20) {
      console.log('[debug-token] Successfully decoded legacy base64 token');
      return decoded;
    }

    console.log('[debug-token] Decoded string does not look like a valid token');
  } catch (error) {
    console.log('[debug-token] Base64 decode failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Case 4: Return as-is (might be plain text token)
  console.warn('[debug-token] WARNING: Could not identify token format, returning as-is');
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

    // Fetch all connected accounts for this user
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

    // Test each account's token
    const results = [];

    for (const account of accounts) {
      console.log(`\n[debug-token] Testing account: ${account.account_username} (${account.provider})`);

      const result: any = {
        account_id: account.id,
        provider: account.provider,
        username: account.account_username,
        provider_account_id: account.provider_account_id,
        created_at: account.created_at,
        updated_at: account.updated_at,
        token_expires_at: account.token_expires_at,
      };

      try {
        // Decrypt token
        const decryptedToken = await decryptToken(account.access_token);

        result.token_info = {
          stored_length: account.access_token.length,
          stored_prefix: account.access_token.substring(0, 15),
          decrypted_length: decryptedToken.length,
          decrypted_prefix: decryptedToken.substring(0, 15),
          looks_valid: /^(EAA|IGAA|IG)/.test(decryptedToken),
        };

        // Test token with Instagram Graph API
        console.log(`[debug-token] Testing token with Instagram API...`);
        const testUrl = `https://graph.instagram.com/v24.0/${account.provider_account_id}?fields=id,username&access_token=${decryptedToken}`;

        const testResponse = await fetch(testUrl);
        const testData = await testResponse.json();

        result.api_test = {
          status: testResponse.status,
          success: !testData.error,
          response: testData,
        };

        if (testData.error) {
          console.error(`[debug-token] API test failed:`, testData.error);
          result.api_test.error_details = {
            message: testData.error.message,
            type: testData.error.type,
            code: testData.error.code,
            fbtrace_id: testData.error.fbtrace_id,
          };
        } else {
          console.log(`[debug-token] API test SUCCESS:`, testData);
        }

      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[debug-token] Error testing account:`, error);
      }

      results.push(result);
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
    console.error('[debug-token] Error:', msg);
    return new Response(JSON.stringify({
      success: false,
      error: msg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
