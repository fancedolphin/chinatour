const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]);
const UPSTREAM_TIMEOUT_MS = 60_000;

interface ProxyRequest {
  model?: string;
  systemInstruction?: string;
  contents?: unknown;
  generationConfig?: unknown;
  safetySettings?: unknown;
}

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  let body: ProxyRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const model = typeof body.model === 'string' ? body.model : '';
  if (!ALLOWED_MODELS.has(model)) {
    return jsonResponse(400, { error: `model not allowed: ${model}` });
  }
  if (!body.contents) {
    return jsonResponse(400, { error: 'contents is required' });
  }

  const upstreamBody: Record<string, unknown> = { contents: body.contents };
  if (body.systemInstruction && typeof body.systemInstruction === 'string') {
    upstreamBody.systemInstruction = { parts: [{ text: body.systemInstruction }] };
  }
  if (body.generationConfig && typeof body.generationConfig === 'object') {
    upstreamBody.generationConfig = body.generationConfig;
  }
  if (body.safetySettings && Array.isArray(body.safetySettings)) {
    upstreamBody.safetySettings = body.safetySettings;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    return jsonResponse(504, { error: 'Gemini upstream timeout', detail: String(err) });
  }
  clearTimeout(timeout);

  const raw = await upstream.text();
  if (!upstream.ok) {
    return jsonResponse(upstream.status, {
      error: 'Gemini upstream error',
      status: upstream.status,
      raw,
    });
  }

  let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try {
    data = JSON.parse(raw);
  } catch {
    return jsonResponse(502, { error: 'Invalid Gemini response' });
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('');

  return jsonResponse(200, {
    text,
    model,
    duration_ms: Date.now() - startedAt,
    raw: data,
  });
});
