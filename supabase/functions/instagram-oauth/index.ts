import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    
    if (!code) {
      throw new Error('Authorization code is required');
    }

    const clientId = Deno.env.get('INSTAGRAM_APP_ID');
    const clientSecret = Deno.env.get('INSTAGRAM_APP_SECRET');
    const redirectUri = 'https://insta-glow-up-39.lovable.app/auth/callback';

    console.log('Exchanging code for short-lived token...');

    // Exchange code for short-lived token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response:', JSON.stringify(tokenData));

    if (tokenData.error_message) {
      throw new Error(tokenData.error_message);
    }

    const { access_token: shortLivedToken, user_id } = tokenData;

    // Exchange short-lived token for long-lived token
    console.log('Exchanging for long-lived token...');
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`
    );

    const longLivedData = await longLivedResponse.json();
    console.log('Long-lived token response:', JSON.stringify(longLivedData));

    if (longLivedData.error) {
      throw new Error(longLivedData.error.message);
    }

    return new Response(JSON.stringify({
      access_token: longLivedData.access_token || shortLivedToken,
      user_id: user_id,
      expires_in: longLivedData.expires_in,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Instagram OAuth error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
