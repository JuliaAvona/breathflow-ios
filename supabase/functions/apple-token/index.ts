// Supabase Edge Function: Apple Sign-In token exchange & revocation
// Required by Apple Guideline 5.1.1(v) for account deletion
//
// Environment secrets needed (set via Supabase Dashboard → Edge Functions → Secrets):
//   APPLE_TEAM_ID       — your Apple Developer Team ID (e.g. "9B587AMM75")
//   APPLE_CLIENT_ID     — your app's Bundle ID (e.g. "com.walkpace.app")
//   APPLE_KEY_ID        — Sign in with Apple key ID from developer.apple.com
//   APPLE_PRIVATE_KEY   — contents of the .p8 file (with \n line breaks)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.9.1/mod.ts';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Apple client_secret JWT (ES256, valid 6 months).
 */
async function generateClientSecret(): Promise<string> {
  const teamId = Deno.env.get('APPLE_TEAM_ID')!;
  const clientId = Deno.env.get('APPLE_CLIENT_ID')!;
  const keyId = Deno.env.get('APPLE_KEY_ID')!;
  const privateKeyPem = Deno.env.get('APPLE_PRIVATE_KEY')!.replace(/\\n/g, '\n');

  // Import the ES256 private key
  const pemContent = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const now = Math.floor(Date.now() / 1000);
  const jwt = await create(
    { alg: 'ES256', kid: keyId },
    {
      iss: teamId,
      iat: now,
      exp: getNumericDate(180 * 24 * 60 * 60), // 6 months
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    key,
  );

  return jwt;
}

/**
 * Exchange authorization code for tokens (returns refresh_token).
 */
async function exchangeCode(code: string): Promise<{ refresh_token: string }> {
  const clientId = Deno.env.get('APPLE_CLIENT_ID')!;
  const clientSecret = await generateClientSecret();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });

  const res = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Apple token exchange failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return { refresh_token: data.refresh_token };
}

/**
 * Revoke a refresh token with Apple.
 */
async function revokeToken(refreshToken: string): Promise<void> {
  const clientId = Deno.env.get('APPLE_CLIENT_ID')!;
  const clientSecret = await generateClientSecret();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });

  const res = await fetch(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Apple token revocation failed: ${res.status} ${errorText}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, code, refresh_token } = await req.json();

    if (action === 'exchange' && code) {
      const result = await exchangeCode(code);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'revoke' && refresh_token) {
      await revokeToken(refresh_token);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "exchange" or "revoke".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
