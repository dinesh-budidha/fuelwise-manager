import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPREADSHEET_ID = Deno.env.get('GOOGLE_SPREADSHEET_ID');
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

// 19 columns now (added "Vehicle Sent To Location" at index 2)
const SHEET1_HEADERS = [
  'Sl.No.', 'Site Name', 'Vehicle Sent To Location', 'Vehicle No', 'Vehicle Type', 'Fuel Type',
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
    const headers = sheetName === 'FuelPurchases' ? PURCHASE_HEADERS : SHEET1_HEADERS;
    const colLetter = colToLetter(headers.length);
    const range = `${sheetName}!A1:${colLetter}1`;
    await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ values: [headers] }),
    });
  } catch (e) {
    console.error('ensureSheet error:', e);
  }
}

function colToLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

async function ensureHeaders(sheetName: string, expectedHeaders: string[]) {
  try {
    const colLetter = colToLetter(expectedHeaders.length);
    const data = await sheetsRequest(`/values/${sheetName}!A1:${colLetter}1`);
    const currentHeaders: string[] = data.values?.[0] || [];
    const matches = expectedHeaders.every((h, i) => currentHeaders[i] === h);
    if (!matches || currentHeaders.length < expectedHeaders.length) {
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

async function getVehicleLastEntry(vehicleNo: string) {
  const colCount = SHEET1_HEADERS.length;
  const colLetter = colToLetter(colCount);
  const data = await sheetsRequest(`/values/Sheet1!A2:${colLetter}`);
  const rows: string[][] = data.values || [];
  let lastRow: string[] | null = null;
  for (let i = 0; i < rows.length; i++) {
    // Vehicle No is at index 3 now
    if (rows[i][3]?.toUpperCase() === vehicleNo.toUpperCase()) {
      lastRow = rows[i];
    }
  }
  return lastRow ? { row: lastRow } : null;
}

// Build alloted map per site+fuelType from Sheet1
async function getAllotedMap(): Promise<Record<string, number>> {
  try {
    const colLetter = colToLetter(SHEET1_HEADERS.length);
    const vData = await sheetsRequest(`/values/Sheet1!A2:${colLetter}`);
    const rows: string[][] = vData.values || [];
    const map: Record<string, number> = {};
    for (const row of rows) {
      // Site Name at index 1, Fuel Type at index 5, Fuel Alloted at index 8
      const site = (row[1] || '').replace(/^-$/, '');
      const rawFuelType = (row[5] || 'Diesel').replace(/^-$/, '') || 'Diesel';
      // Normalize fuel type for consistent key matching
      const fuelType = rawFuelType.toUpperCase() === 'PETROL' ? 'Petrol' : 'Diesel';
      const alloted = Number(row[8]) || 0;
      if (site) {
        const key = `${site}|${fuelType}`;
        map[key] = (map[key] || 0) + alloted;
      }
    }
    return map;
  } catch {
    return {};
  }
}

// Update opening balance per site+fuelType independently
async function updateOpeningBalance() {
  try {
    const allotedMap = await getAllotedMap();
    const data = await sheetsRequest('/values/FuelPurchases!A2:D');
    const rows: string[][] = data.values || [];
    if (rows.length === 0) return;

    // Running totals per site+fuelType
    const runningTotals: Record<string, number> = {};
    const balances: string[][] = [];
    for (const row of rows) {
      const site = row[2] || '';
      const rawFuelType = row[3] || 'Diesel';
      const fuelType = rawFuelType.toUpperCase() === 'PETROL' ? 'Petrol' : 'Diesel';
      const liters = Number(row[1]) || 0;
      const key = `${site}|${fuelType}`;
      runningTotals[key] = (runningTotals[key] || 0) + liters;
      const alloted = allotedMap[key] || 0;
      balances.push([String(runningTotals[key] - alloted)]);
    }

    await sheetsRequest(`/values/FuelPurchases!E2:E${rows.length + 1}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ values: balances }),
    });
    console.log(`[BALANCE] Updated ${balances.length} opening balances (per site+fuelType)`);
  } catch (e) {
    console.error('updateOpeningBalance error:', e);
  }
}

// Sanitize row: replace empty/null/undefined values with "-"
function sanitizeRow(row: string[]): string[] {
  return row.map(v => (v === '' || v === null || v === undefined || v === '0') ? '-' : v);
}

// Only sanitize empty strings, keep "0" for numeric fields
function sanitizeRowForSheet(row: string[]): string[] {
  // Numeric field indices (19 columns): 8=FuelAlloted, 11=StartReading, 12=EndReading, 13=KM, 14=Hours, 15=KMperLtr, 16=Used, 17=Balance
  const numericIndices = new Set([8, 11, 12, 13, 14, 15, 16, 17]);
  return row.map((v, i) => {
    if (v === '' || v === null || v === undefined) {
      return numericIndices.has(i) ? '0' : '-';
    }
    // Uppercase all string values
    return typeof v === 'string' ? v.toUpperCase() : v;
  });
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
        const colLetter = colToLetter(SHEET1_HEADERS.length);
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
        if (!body.row || body.row.length !== SHEET1_HEADERS.length) {
          console.error(`[APPEND] Row length mismatch: got ${body.row?.length}, expected ${SHEET1_HEADERS.length}`);
          return json({ error: `Row length mismatch: got ${body.row?.length}, expected ${SHEET1_HEADERS.length}` }, 400);
        }
        await ensureHeaders('Sheet1', SHEET1_HEADERS);
        const sanitized = sanitizeRowForSheet(body.row);
        const colLetter = colToLetter(SHEET1_HEADERS.length);
        console.log(`[APPEND] Inserting row: ${JSON.stringify(sanitized)}`);
        await sheetsRequest(`/values/Sheet1!A2:${colLetter}:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          body: JSON.stringify({ values: [sanitized] }),
        });
        await updateOpeningBalance();
        console.log(`[APPEND] Success`);
        return json({ success: true });
      }

      if (body.action === 'update') {
        if (!body.row || body.row.length !== SHEET1_HEADERS.length) {
          return json({ error: `Row length mismatch: got ${body.row?.length}, expected ${SHEET1_HEADERS.length}` }, 400);
        }
        const sanitized = sanitizeRowForSheet(body.row);
        const colLetter = colToLetter(SHEET1_HEADERS.length);
        const range = `Sheet1!A${body.rowIndex}:${colLetter}${body.rowIndex}`;
        console.log(`[UPDATE] Updating row ${body.rowIndex}: ${JSON.stringify(sanitized)}`);
        await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          body: JSON.stringify({ values: [sanitized] }),
        });
        await updateOpeningBalance();
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
        await updateOpeningBalance();
        return json({ success: true });
      }

      if (body.action === 'append_purchase') {
        await ensureSheet('FuelPurchases');
        // Uppercase the purchase row values
        const upperRow = (body.row as string[]).map((v: string) => typeof v === 'string' ? v.toUpperCase() : v);
        console.log(`[APPEND_PURCHASE] Row: ${JSON.stringify(upperRow)}`);
        await sheetsRequest('/values/FuelPurchases!A2:D:append?valueInputOption=USER_ENTERED', {
          method: 'POST',
          body: JSON.stringify({ values: [upperRow] }),
        });
        await updateOpeningBalance();
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
        await updateOpeningBalance();
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
