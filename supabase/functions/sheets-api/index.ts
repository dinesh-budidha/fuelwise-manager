import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPREADSHEET_ID = Deno.env.get('GOOGLE_SPREADSHEET_ID');
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

// Column headers for Sheet1 - MUST match recordToRow order in types/fuel.ts
const SHEET1_HEADERS = [
  'Sl.No.', 'Site Name', 'Vehicle No', 'Vehicle Type', 'Fuel Type',
  'Company/Private', 'Issued Date', 'Fuel Alloted', 'Issued Through',
  'Indent Number', 'Starting Reading', 'Ending Reading', 'Kilometers',
  'Hours', 'KM per Ltr', 'Used in Ltrs', 'Balance Liters', 'DG Capacity',
];

const PURCHASE_HEADERS = [
  'Fuel Purchased Date', 'Liters Purchased', 'Site Location', 'Fuel Type', 'Opening Balance',
];

async function getAccessToken(): Promise<string> {
  if (!SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
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

async function ensureSheet(sheetName: string) {
  try {
    const meta = await sheetsRequest('?fields=sheets.properties');
    const exists = meta.sheets?.some((s: any) => s.properties.title === sheetName);
    if (!exists) {
      await sheetsRequest(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        }),
      });
    }
    // Set headers based on sheet name
    const headers = sheetName === 'FuelPurchases' ? PURCHASE_HEADERS : SHEET1_HEADERS;
    const range = `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`;
    await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ values: [headers] }),
    });
  } catch (e) {
    console.error('ensureSheet error:', e);
  }
}

async function ensureHeaders(sheetName: string, expectedHeaders: string[]) {
  try {
    const colLetter = String.fromCharCode(64 + expectedHeaders.length);
    const data = await sheetsRequest(`/values/${sheetName}!A1:${colLetter}1`);
    const currentHeaders: string[] = data.values?.[0] || [];
    
    // Check if headers match
    const matches = expectedHeaders.every((h, i) => currentHeaders[i] === h);
    if (!matches || currentHeaders.length < expectedHeaders.length) {
      // Set correct headers
      await sheetsRequest(`/values/${sheetName}!A1:${colLetter}1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        body: JSON.stringify({ values: [expectedHeaders] }),
      });
      console.log(`Headers updated for ${sheetName}`);
    }
  } catch (e) {
    console.error('ensureHeaders error:', e);
  }
}

async function getSheetId(sheetName: string): Promise<number> {
  const meta = await sheetsRequest('?fields=sheets.properties');
  const sheet = meta.sheets?.find((s: any) => s.properties.title === sheetName);
  return sheet?.properties?.sheetId || 0;
}

// Vehicle No is at column index 2
async function getVehicleLastEntry(vehicleNo: string) {
  const colCount = SHEET1_HEADERS.length;
  const colLetter = String.fromCharCode(64 + colCount);
  const data = await sheetsRequest(`/values/Sheet1!A2:${colLetter}`);
  const rows: string[][] = data.values || [];
  let lastRow: string[] | null = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][2]?.toLowerCase() === vehicleNo.toLowerCase()) {
      lastRow = rows[i];
    }
  }
  return lastRow ? { row: lastRow } : null;
}

// Fuel Alloted is at column index 7 (column H)
async function updateOpeningBalance(totalAlloted: number) {
  try {
    const data = await sheetsRequest('/values/FuelPurchases!A2:D');
    const rows: string[][] = data.values || [];
    if (rows.length === 0) return;

    let runningTotal = 0;
    const balances: string[][] = [];
    for (const row of rows) {
      runningTotal += Number(row[1]) || 0;
      balances.push([String(runningTotal - totalAlloted)]);
    }

    await sheetsRequest(`/values/FuelPurchases!E2:E${rows.length + 1}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ values: balances }),
    });
  } catch (e) {
    console.error('updateOpeningBalance error:', e);
  }
}

async function getTotalAlloted(): Promise<number> {
  try {
    const vData = await sheetsRequest('/values/Sheet1!H2:H');
    return (vData.values || []).reduce((s: number, r: string[]) => s + (Number(r[0]) || 0), 0);
  } catch {
    return 0;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID not configured');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'GET') {
      if (action === 'get') {
        await ensureHeaders('Sheet1', SHEET1_HEADERS);
        const colLetter = String.fromCharCode(64 + SHEET1_HEADERS.length);
        const data = await sheetsRequest(`/values/Sheet1!A2:${colLetter}`);
        console.log(`[GET] Fetched ${(data.values || []).length} rows from Sheet1`);
        return json({ rows: data.values || [] });
      }
      if (action === 'get_purchases') {
        await ensureSheet('FuelPurchases');
        const data = await sheetsRequest('/values/FuelPurchases!A2:E');
        console.log(`[GET_PURCHASES] Fetched ${(data.values || []).length} rows`);
        return json({ rows: data.values || [] });
      }
      if (action === 'get_vehicle_last') {
        const vehicleNo = url.searchParams.get('vehicleNo');
        if (!vehicleNo) return json({ error: 'vehicleNo required' }, 400);
        const result = await getVehicleLastEntry(vehicleNo);
        return json({ lastEntry: result?.row || null });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();

      if (body.action === 'append') {
        // Validate row length
        if (!body.row || body.row.length !== SHEET1_HEADERS.length) {
          console.error(`[APPEND] Row length mismatch: got ${body.row?.length}, expected ${SHEET1_HEADERS.length}`);
          console.error(`[APPEND] Row data: ${JSON.stringify(body.row)}`);
          return json({ error: `Row length mismatch: got ${body.row?.length}, expected ${SHEET1_HEADERS.length}` }, 400);
        }
        await ensureHeaders('Sheet1', SHEET1_HEADERS);
        const colLetter = String.fromCharCode(64 + SHEET1_HEADERS.length);
        console.log(`[APPEND] Inserting row: ${JSON.stringify(body.row)}`);
        await sheetsRequest(`/values/Sheet1!A2:${colLetter}:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          body: JSON.stringify({ values: [body.row] }),
        });
        const totalAlloted = await getTotalAlloted();
        await updateOpeningBalance(totalAlloted);
        console.log(`[APPEND] Success. Total alloted: ${totalAlloted}`);
        return json({ success: true });
      }

      if (body.action === 'update') {
        if (!body.row || body.row.length !== SHEET1_HEADERS.length) {
          return json({ error: `Row length mismatch: got ${body.row?.length}, expected ${SHEET1_HEADERS.length}` }, 400);
        }
        const colLetter = String.fromCharCode(64 + SHEET1_HEADERS.length);
        const range = `Sheet1!A${body.rowIndex}:${colLetter}${body.rowIndex}`;
        console.log(`[UPDATE] Updating row ${body.rowIndex}: ${JSON.stringify(body.row)}`);
        await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          body: JSON.stringify({ values: [body.row] }),
        });
        const totalAlloted = await getTotalAlloted();
        await updateOpeningBalance(totalAlloted);
        return json({ success: true });
      }

      if (body.action === 'delete') {
        const sheetId = await getSheetId('Sheet1');
        console.log(`[DELETE] Deleting row ${body.rowIndex} from Sheet1`);
        await sheetsRequest(':batchUpdate', {
          method: 'POST',
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: { sheetId, dimension: 'ROWS', startIndex: body.rowIndex - 1, endIndex: body.rowIndex },
              },
            }],
          }),
        });
        const totalAlloted = await getTotalAlloted();
        await updateOpeningBalance(totalAlloted);
        return json({ success: true });
      }

      if (body.action === 'append_purchase') {
        await ensureSheet('FuelPurchases');
        console.log(`[APPEND_PURCHASE] Row: ${JSON.stringify(body.row)}`);
        await sheetsRequest('/values/FuelPurchases!A2:D:append?valueInputOption=USER_ENTERED', {
          method: 'POST',
          body: JSON.stringify({ values: [body.row] }),
        });
        const totalAlloted = await getTotalAlloted();
        await updateOpeningBalance(totalAlloted);
        return json({ success: true });
      }

      if (body.action === 'delete_purchase') {
        await ensureSheet('FuelPurchases');
        const sheetId = await getSheetId('FuelPurchases');
        await sheetsRequest(':batchUpdate', {
          method: 'POST',
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: { sheetId, dimension: 'ROWS', startIndex: body.rowIndex - 1, endIndex: body.rowIndex },
              },
            }],
          }),
        });
        const totalAlloted = await getTotalAlloted();
        await updateOpeningBalance(totalAlloted);
        return json({ success: true });
      }
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error: unknown) {
    console.error('Edge function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
