const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const AMAP_KEY = Deno.env.get('AMAP_API_KEY');
const AMAP_SECURITY_CODE = Deno.env.get('AMAP_SECURITY_CODE') || '';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!AMAP_KEY) {
    return new Response(JSON.stringify({ error: 'Missing AMAP_API_KEY secret' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  return new Response(
    JSON.stringify({
      key: AMAP_KEY,
      securityCode: AMAP_SECURITY_CODE,
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  );
});
