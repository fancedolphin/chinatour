const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'models/gemini-embedding-2-preview';
const OUTPUT_DIMENSIONALITY = 768;

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse(500, { error: 'Missing GEMINI_API_KEY secret' });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const text = body.text?.trim();
  if (!text) {
    return jsonResponse(400, { error: 'text is required' });
  }

  const startedAt = Date.now();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        outputDimensionality: OUTPUT_DIMENSIONALITY,
        content: {
          parts: [{ text }],
        },
      }),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    return jsonResponse(response.status, {
      error: 'Gemini embedding request failed',
      details: raw,
    });
  }

  let data: { embedding?: { values?: number[] } };
  try {
    data = JSON.parse(raw);
  } catch {
    return jsonResponse(502, { error: 'Invalid Gemini embedding response' });
  }

  const embedding = data.embedding?.values;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return jsonResponse(502, { error: 'Empty embedding response from Gemini' });
  }

  return jsonResponse(200, {
    embedding,
    dimensions: embedding.length,
    model: MODEL,
    duration_ms: Date.now() - startedAt,
  });
});
