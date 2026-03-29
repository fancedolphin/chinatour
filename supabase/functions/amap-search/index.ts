const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AMAP_API_KEY = Deno.env.get('AMAP_API_KEY');

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
  city?: string;
  type?: string;
  pageSize?: number;
};

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

  let payload: SearchPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const keyword = payload.keyword?.trim();
  if (!keyword) {
    return jsonResponse(400, { error: 'keyword is required' });
  }

  const city = payload.city?.trim() || '';
  const type = payload.type?.trim() || '';
  const pageSize = Math.min(20, Math.max(1, payload.pageSize || 10));

  const url = new URL('https://restapi.amap.com/v3/place/text');
  url.searchParams.set('key', AMAP_API_KEY);
  url.searchParams.set('keywords', keyword);
  if (city) {
    url.searchParams.set('city', city);
    url.searchParams.set('citylimit', 'true');
  }
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

  const pois = (data.pois || []).map((poi) => ({
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
