import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'models/gemini-embedding-2-preview';
const OUTPUT_DIMENSIONALITY = 768;
const EMBED_BATCH_SIZE = 50;
const UPDATE_BATCH_SIZE = 20;

type SupportedTable =
  | 'destinations'
  | 'restaurants'
  | 'attractions'
  | 'travel_tips'
  | 'cultural_experiences'
  | 'events'
  | 'industrial_tourism'
  | 'markets_and_shopping';

type BackfillRequest = {
  tables?: SupportedTable[];
  limitPerTable?: number;
};

type EmbeddableRow = {
  id: string;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  tags?: string[] | null;
  duration_text?: string | null;
  price_range?: string | null;
  best_season?: string | null;
  average_budget_daily?: string | null;
  title?: string | null;
  content?: string | null;
  cuisine_type?: string | null;
  ticket_price?: string | null;
  recommended_duration?: string | null;
  specialties?: string[] | null;
  best_time_to_visit?: string | null;
  location_name?: string | null;
  month_start?: number | null;
  month_end?: number | null;
  bargain_tip?: string | null;
  operating_hours?: string | null;
  atmosphere?: string | null;
  must_try_foods?: string[] | null;
  highlights?: string[] | null;
  price_per_person?: string | null;
  schedule?: string | null;
  suitable_for?: string[] | null;
  experience_description?: string | null;
  products_available?: string[] | null;
  practical_tips?: string | null;
};

type TableConfig = {
  select: string;
  buildText: (row: EmbeddableRow) => string;
  touchUpdatedAt?: boolean;
};

const TABLES: SupportedTable[] = [
  'destinations',
  'restaurants',
  'attractions',
  'travel_tips',
  'cultural_experiences',
  'events',
  'markets_and_shopping',
  'industrial_tourism',
];

const tableConfig: Record<SupportedTable, TableConfig> = {
  destinations: {
    select: 'id, name, description, best_season, average_budget_daily',
    buildText: (row) =>
      [row.name, row.description, row.best_season, row.average_budget_daily].filter(Boolean).join(' '),
    touchUpdatedAt: true,
  },
  restaurants: {
    select: 'id, name, cuisine_type, description, address, price_range, specialties',
    buildText: (row) =>
      [row.name, row.cuisine_type, row.description, row.address, row.price_range, row.specialties?.join(' ')]
        .filter(Boolean)
        .join(' '),
    touchUpdatedAt: true,
  },
  attractions: {
    select: 'id, name, category, description, address, ticket_price, recommended_duration, tags',
    buildText: (row) =>
      [row.name, row.category, row.description, row.address, row.ticket_price, row.recommended_duration, row.tags?.join(' ')]
        .filter(Boolean)
        .join(' '),
    touchUpdatedAt: true,
  },
  travel_tips: {
    select: 'id, category, title, content',
    buildText: (row) => [row.category, row.title, row.content].filter(Boolean).join(' '),
    touchUpdatedAt: false,
  },
  cultural_experiences: {
    select:
      'id, name, name_en, type, category, description, address, duration_minutes, duration_text, price_per_person, price_range, schedule, suitable_for, tags',
    buildText: (row) =>
      [
        row.name,
        row.name_en,
        row.type,
        row.name,
        row.category,
        row.description,
        row.address,
        row.duration_minutes ? `${row.duration_minutes}分钟` : null,
        row.duration_text,
        row.price_per_person,
        row.price_range,
        row.schedule,
        row.suitable_for?.join(' '),
        row.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' '),
    touchUpdatedAt: true,
  },
  events: {
    select: 'id, name, name_en, type, category, description, location_name, address, month_start, month_end, highlights, practical_tips, tags',
    buildText: (row) =>
      [
        row.name,
        row.name_en,
        row.type,
        row.category,
        row.description,
        row.location_name,
        row.address,
        row.month_start ? `month_start=${row.month_start}` : null,
        row.month_end ? `month_end=${row.month_end}` : null,
        row.highlights?.join(' '),
        row.practical_tips,
        row.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' '),
    touchUpdatedAt: true,
  },
  markets_and_shopping: {
    select:
      'id, name, name_en, type, category, description, address, operating_hours, atmosphere, must_try_foods, highlights, best_time_to_visit, bargain_tip, tags',
    buildText: (row) =>
      [
        row.name,
        row.name_en,
        row.type,
        row.category,
        row.description,
        row.address,
        row.operating_hours,
        row.atmosphere,
        row.must_try_foods?.join(' '),
        row.highlights?.join(' '),
        row.best_time_to_visit,
        row.bargain_tip,
        row.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' '),
    touchUpdatedAt: true,
  },
  industrial_tourism: {
    select:
      'id, name, category, description, address, experience_description, products_available, duration_text, price_range, tags',
    buildText: (row) =>
      [
        row.name,
        row.category,
        row.description,
        row.address,
        row.experience_description,
        row.products_available?.join(' '),
        row.duration_text,
        row.price_range,
        row.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' '),
    touchUpdatedAt: true,
  },
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

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
  if (norm === 0) return values;
  return values.map((value) => value / norm);
}

function buildLexicalEmbedding(text: string): number[] {
  const vector = new Array<number>(OUTPUT_DIMENSIONALITY).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vector;

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

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!GEMINI_API_KEY) {
    return texts.map(buildLexicalEmbedding);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: MODEL,
          outputDimensionality: OUTPUT_DIMENSIONALITY,
          content: { parts: [{ text }] },
        })),
      }),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      return texts.map(buildLexicalEmbedding);
    }
    throw new Error(`Gemini batchEmbedContents failed: ${response.status} ${raw}`);
  }

  const payload = JSON.parse(raw) as { embeddings?: Array<{ values?: number[] }> };
  const embeddings = (payload.embeddings ?? []).map((item) => item?.values ?? []);
  if (embeddings.length !== texts.length || embeddings.some((item) => item.length !== 768)) {
    throw new Error('Invalid Gemini embedding payload');
  }

  return embeddings;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'Missing Supabase runtime secrets' });
  }

  let body: BackfillRequest = {};
  try {
    body = (await request.json()) as BackfillRequest;
  } catch {
    body = {};
  }

  const tables = (body.tables?.length ? body.tables : TABLES).filter((table): table is SupportedTable =>
    TABLES.includes(table),
  );
  const limitPerTable =
    typeof body.limitPerTable === 'number' && body.limitPerTable > 0
      ? Math.min(Math.trunc(body.limitPerTable), 200)
      : 200;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const summary: Record<string, { scanned: number; updated: number }> = {};

    for (const table of tables) {
      const config = tableConfig[table];
      const { data, error } = await supabase
        .from(table)
        .select(config.select)
        .is('embedding', null)
        .limit(limitPerTable);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as EmbeddableRow[];
      summary[table] = {
        scanned: rows.length,
        updated: 0,
      };

      if (rows.length === 0) {
        continue;
      }

      for (const batch of chunk(rows, EMBED_BATCH_SIZE)) {
        const texts = batch.map((row) => config.buildText(row));
        const embeddings = await generateEmbeddings(texts);

        for (const updateBatch of chunk(
          batch.map((row, index) => ({
            id: row.id,
            embedding: toVectorLiteral(embeddings[index]),
          })),
          UPDATE_BATCH_SIZE,
        )) {
          for (const item of updateBatch) {
            const payload: Record<string, string> = {
              embedding: item.embedding,
            };
            if (config.touchUpdatedAt !== false) {
              payload.updated_at = new Date().toISOString();
            }
            const { error: updateError } = await supabase
              .from(table)
              .update(payload)
              .eq('id', item.id);
            if (updateError) {
              throw updateError;
            }
            summary[table].updated += 1;
          }
        }
      }
    }

    return jsonResponse(200, {
      ok: true,
      summary,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
