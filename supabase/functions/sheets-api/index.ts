import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPREADSHEET_ID = Deno.env.get('GOOGLE_SPREADSHEET_ID');
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

async function getAccessToken(): Promise<string> {
  if (!SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');

  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);

  // Create JWT
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array) => btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64urlStr = (str: string) => b64url(encoder.encode(str));

  const headerB64 = b64urlStr(JSON.stringify(header));
  const claimB64 = b64urlStr(JSON.stringify(claim));
  const unsignedToken = `${headerB64}.${claimB64}`;

  // Import private key and sign
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken))
  );

  const jwt = `${unsignedToken}.${b64url(signature)}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

async function sheetsRequest(path: string, options?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets API error [${res.status}]: ${err}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID not configured');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET: fetch all rows
    if (req.method === 'GET' && action === 'get') {
      const data = await sheetsRequest('/values/Sheet1!A2:O');
      return new Response(JSON.stringify({ rows: data.values || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: append, update, delete
    if (req.method === 'POST') {
      const body = await req.json();

      if (body.action === 'append') {
        await sheetsRequest('/values/Sheet1!A2:O:append?valueInputOption=USER_ENTERED', {
          method: 'POST',
          body: JSON.stringify({ values: [body.row] }),
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.action === 'update') {
        const range = `Sheet1!A${body.rowIndex}:O${body.rowIndex}`;
        await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          body: JSON.stringify({ values: [body.row] }),
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.action === 'delete') {
        // Delete row by shifting cells up
        const sheetMeta = await sheetsRequest('?fields=sheets.properties');
        const sheetId = sheetMeta.sheets?.[0]?.properties?.sheetId || 0;

        await sheetsRequest(':batchUpdate', {
          method: 'POST',
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: body.rowIndex - 1,
                  endIndex: body.rowIndex,
                },
              },
            }],
          }),
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Edge function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
