const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const AMAP_KEY = '74532255ab3d624097f260fe675838f0';
const AMAP_SECURITY_CODE = 'f00fa54b50d07f4fd29779d1bb8d44ef';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
