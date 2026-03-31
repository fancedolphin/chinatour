const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'models/gemini-embedding-2-preview';
const OUTPUT_DIMENSIONALITY = 768;
const MAX_BATCH_SIZE = 100;

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().normalize('NFKC');
  const asciiTokens = normalized
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  const cjkChars = Array.from(normalized).filter((char) => /[\u4e00-\u9fff]/u.test(char));
  const cjkBigrams: string[] = [];
  for (let index = 0; index < cjkChars.length - 1; index += 1) {
    cjkBigrams.push(`${cjkChars[index]}${cjkChars[index + 1]}`);
  }
  return [...asciiTokens, ...cjkChars, ...cjkBigrams];
}

function hashToken(token: string, seed: number): number {
  let hash = seed;
  for (const char of token) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function l2Normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return values;
  }
  return values.map((value) => value / norm);
}

function buildLexicalEmbedding(text: string): number[] {
  const vector = new Array<number>(OUTPUT_DIMENSIONALITY).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const dim = hashToken(token, 2166136261) % OUTPUT_DIMENSIONALITY;
    const sign = hashToken(token, 2166136261 ^ 0x9e3779b9) % 2 === 0 ? 1 : -1;
    const secondaryDim = hashToken(token, 2166136261 ^ 0x85ebca6b) % OUTPUT_DIMENSIONALITY;
    const weight = token.length >= 4 ? 1.25 : 1;

    vector[dim] += sign * weight;
    vector[secondaryDim] += sign * 0.5;
  }

  return l2Normalize(vector.map((value) => Number(value.toFixed(6))));
}

async function requestGeminiEmbedding(payload: Record<string, unknown>, endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  return { ok: response.ok, status: response.status, raw };
}

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

  let body: { text?: string; texts?: string[] };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const text = body.text?.trim();
  const texts = Array.isArray(body.texts)
    ? body.texts.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)
    : [];
  if (!text && texts.length === 0) {
    return jsonResponse(400, { error: 'text or texts is required' });
  }
  if (texts.length > MAX_BATCH_SIZE) {
    return jsonResponse(400, { error: `texts batch size must be <= ${MAX_BATCH_SIZE}` });
  }

  const startedAt = Date.now();
  const useBatch = texts.length > 0;
  const payload =
    useBatch
      ? {
          requests: texts.map((value) => ({
            model: MODEL,
            outputDimensionality: OUTPUT_DIMENSIONALITY,
            content: {
              parts: [{ text: value }],
            },
          })),
        }
      : {
          model: MODEL,
          outputDimensionality: OUTPUT_DIMENSIONALITY,
          content: {
            parts: [{ text }],
          },
        };

  if (GEMINI_API_KEY) {
    const endpoint = useBatch
      ? `https://generativelanguage.googleapis.com/v1beta/${MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/${MODEL}:embedContent?key=${GEMINI_API_KEY}`;
    const response = await requestGeminiEmbedding(payload, endpoint);

    if (response.ok) {
      if (useBatch) {
        let data: { embeddings?: Array<{ values?: number[] }> };
        try {
          data = JSON.parse(response.raw);
        } catch {
          return jsonResponse(502, { error: 'Invalid Gemini batch embedding response' });
        }

        const embeddings = (data.embeddings ?? []).map((item) => item?.values ?? []);
        if (
          embeddings.length !== texts.length ||
          embeddings.some((item) => !Array.isArray(item) || item.length === 0)
        ) {
          return jsonResponse(502, { error: 'Invalid Gemini batch embedding payload' });
        }

        return jsonResponse(200, {
          embeddings,
          dimensions: embeddings[0].length,
          model: MODEL,
          provider: 'gemini',
          batch_size: texts.length,
          duration_ms: Date.now() - startedAt,
        });
      }

      let data: { embedding?: { values?: number[] } };
      try {
        data = JSON.parse(response.raw);
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
        provider: 'gemini',
        duration_ms: Date.now() - startedAt,
      });
    }
  }

  if (useBatch) {
    const embeddings = texts.map(buildLexicalEmbedding);
    return jsonResponse(200, {
      embeddings,
      dimensions: embeddings[0].length,
      model: 'local-hash-768',
      provider: 'local-hash',
      batch_size: texts.length,
      duration_ms: Date.now() - startedAt,
    });
  }
  const embedding = buildLexicalEmbedding(text!);

  return jsonResponse(200, {
    embedding,
    dimensions: embedding.length,
    model: 'local-hash-768',
    provider: 'local-hash',
    duration_ms: Date.now() - startedAt,
  });
});
