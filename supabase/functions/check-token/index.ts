import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .eq('user_id', user.id);

    if (accountsError) {
      throw new Error(`Database error: ${accountsError.message}`);
    }

    // Analyze each token
    const analysis = accounts?.map(account => {
      const token = account.access_token || '';

      return {
        id: account.id,
        provider: account.provider,
        username: account.account_username,
        created_at: account.created_at,
        updated_at: account.updated_at,
        token_expires_at: account.token_expires_at,
        token_analysis: {
          length: token.length,
          first_20_chars: token.substring(0, 20),
          starts_with_encrypted: token.startsWith('ENCRYPTED:'),
          starts_with_igaa: token.startsWith('IGAA'),
          starts_with_ig: token.startsWith('IG'),
          starts_with_eaa: token.startsWith('EAA'),
          looks_like_base64: /^[A-Za-z0-9+/=]+$/.test(token.substring(0, 50)),
        }
      };
    });

    return new Response(JSON.stringify({
      success: true,
      user_id: user.id,
      accounts_count: accounts?.length || 0,
      accounts: analysis,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: msg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
