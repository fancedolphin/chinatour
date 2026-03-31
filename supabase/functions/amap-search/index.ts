import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sanitizeKeywords } from './sanitize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AMAP_API_KEY = Deno.env.get('AMAP_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const FAST_FOOD_NAME_PATTERN =
  /(麦当劳|肯德基|汉堡王|必胜客|星巴克|瑞幸|mcdonald|kfc|burger king|pizza hut|starbucks|luckin)/i;
const FAST_FOOD_TYPE_PATTERN = /(快餐厅|外卖|速食)/i;

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

type SearchPayload = {
  keyword?: string;
  keywords?: string;
  city?: string;
  type?: string;
  types?: string;
  pageSize?: number;
};

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const candidate = forwardedFor.split(',')[0]?.trim();
  return candidate || 'unknown';
}

async function rateLimitExceeded(request: Request): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase runtime secrets');
  }

  const now = Date.now();
  const key = getClientKey(request);
  const rateLimitKey = `amap-search:${key}`;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('edge_rate_limits')
    .select('key, request_count, window_start')
    .eq('key', rateLimitKey)
    .maybeSingle();
  if (error) {
    throw error;
  }

  const currentWindowStart = data?.window_start ? new Date(String(data.window_start)).getTime() : 0;
  if (!data || now - currentWindowStart > RATE_LIMIT_WINDOW_MS) {
    const { error: upsertError } = await supabase.from('edge_rate_limits').upsert(
      {
        key: rateLimitKey,
        request_count: 1,
        window_start: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: 'key' },
    );
    if (upsertError) {
      throw upsertError;
    }
    return false;
  }

  if (Number(data.request_count) >= RATE_LIMIT_MAX) {
    return true;
  }

  const { error: updateError } = await supabase
    .from('edge_rate_limits')
    .update({
      request_count: Number(data.request_count) + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq('key', rateLimitKey);
  if (updateError) {
    throw updateError;
  }

  return false;
}

function shouldFilterPoi(poi: Record<string, string>, isFoodSearch: boolean): boolean {
  if (!isFoodSearch) {
    return false;
  }
  return FAST_FOOD_NAME_PATTERN.test(poi.name || '') || FAST_FOOD_TYPE_PATTERN.test(poi.type || '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!AMAP_API_KEY) {
    return jsonResponse(500, { error: 'Missing AMAP_API_KEY secret' });
  }

  if (await rateLimitExceeded(request)) {
    return jsonResponse(429, { error: 'rate_limit_exceeded' });
  }

  let payload: SearchPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const keyword = (payload.keyword || payload.keywords || '').trim();
  if (!keyword) {
    return jsonResponse(400, { error: 'keyword is required' });
  }

  const city = payload.city?.trim();
  if (!city) {
    return jsonResponse(400, { error: 'city is required' });
  }

  const sanitizedKeyword = sanitizeKeywords(keyword);
  if (!sanitizedKeyword) {
    return jsonResponse(400, { error: 'keyword is invalid after sanitization' });
  }

  const type = (payload.type || payload.types || '').trim();
  const pageSize = Math.min(20, Math.max(1, payload.pageSize || 10));
  const isFoodSearch = type.includes('050') || /餐|美食|小吃/.test(sanitizedKeyword);

  const url = new URL('https://restapi.amap.com/v3/place/text');
  url.searchParams.set('key', AMAP_API_KEY);
  url.searchParams.set('keywords', sanitizedKeyword);
  url.searchParams.set('city', city);
  url.searchParams.set('citylimit', 'true');
  if (type) {
    url.searchParams.set('types', type);
  }
  url.searchParams.set('offset', String(pageSize));
  url.searchParams.set('extensions', 'base');

  const startedAt = Date.now();
  const amapResponse = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const raw = await amapResponse.text();
  if (!amapResponse.ok) {
    return jsonResponse(amapResponse.status, {
      error: 'AMap HTTP request failed',
      details: raw,
    });
  }

  let data: { status?: string; info?: string; pois?: Array<Record<string, string>> };
  try {
    data = JSON.parse(raw);
  } catch {
    return jsonResponse(502, { error: 'Invalid AMap response' });
  }

  if (data.status !== '1') {
    return jsonResponse(502, {
      error: 'AMap query failed',
      info: data.info || 'unknown error',
    });
  }

  const pois = (data.pois || [])
    .filter((poi) => !shouldFilterPoi(poi, isFoodSearch))
    .map((poi) => ({
      id: poi.id,
      name: poi.name,
      address: poi.address,
      location: poi.location,
      type: poi.type,
    }));

  return jsonResponse(200, {
    pois,
    count: pois.length,
    duration_ms: Date.now() - startedAt,
  });
});
