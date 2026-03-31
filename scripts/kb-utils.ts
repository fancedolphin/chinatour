import { createClient } from '@jsr/supabase__supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ogodnvjaiwelqmjqkvda.supabase.co';

export const KB_TABLES = [
  'destinations',
  'restaurants',
  'attractions',
  'travel_tips',
  'cultural_experiences',
  'events',
  'markets_and_shopping',
  'industrial_tourism',
] as const;

export type KbTable = (typeof KB_TABLES)[number];

type RecordShape = Record<string, unknown>;

type TableConfig = {
  labelField: 'name' | 'title';
  buildEmbeddingText: (row: RecordShape) => string;
};

export const TABLE_CONFIG: Record<KbTable, TableConfig> = {
  destinations: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [row.name, row.description, row.best_season, row.average_budget_daily].filter(Boolean).join(' '),
  },
  restaurants: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [row.name, row.cuisine_type, row.description, row.address, row.price_range, joinArray(row.specialties)]
        .filter(Boolean)
        .join(' '),
  },
  attractions: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [
        row.name,
        row.category,
        row.description,
        row.address,
        row.ticket_price,
        row.recommended_duration,
        joinArray(row.tags),
      ]
        .filter(Boolean)
        .join(' '),
  },
  travel_tips: {
    labelField: 'title',
    buildEmbeddingText: (row) => [row.category, row.title, row.content].filter(Boolean).join(' '),
  },
  cultural_experiences: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [
        row.name_en || row.name,
        row.type || row.category,
        row.description,
        row.schedule,
        row.price_per_person || row.price_range,
        joinArray(row.suitable_for),
        joinArray(row.tags),
      ]
        .filter(Boolean)
        .join(' '),
  },
  events: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [
        row.name_en || row.name,
        row.type || row.category,
        row.description,
        row.practical_tips,
        joinArray(row.highlights),
        row.month_start ? `month_start=${row.month_start}` : null,
        row.month_end ? `month_end=${row.month_end}` : null,
      ]
        .filter(Boolean)
        .join(' '),
  },
  markets_and_shopping: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [
        row.name_en || row.name,
        row.type || row.category,
        row.address,
        row.operating_hours,
        row.atmosphere,
        row.food_stalls_overview,
        joinArray(row.must_try_foods),
        joinArray(row.highlights),
      ]
        .filter(Boolean)
        .join(' '),
  },
  industrial_tourism: {
    labelField: 'name',
    buildEmbeddingText: (row) =>
      [
        row.name,
        row.category,
        row.description,
        row.experience_description,
        row.address,
        joinArray(row.products_available),
        row.duration_text,
        row.price_range,
        joinArray(row.tags),
      ]
        .filter(Boolean)
        .join(' '),
  },
};

export function readEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function getSupabaseUrl(): string {
  return readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
}

export function getServiceRoleKey(): string {
  const value = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SERVICE_ROLE_KEY');
  if (!value) {
    throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY');
  }
  return value;
}

export function createServiceRoleClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'Nodb-KB-Tools' } },
  });
}

export function parseArgs(argv: string[]): Record<string, string> {
  return argv.reduce<Record<string, string>>((acc, arg) => {
    if (!arg.startsWith('--')) return acc;
    const [rawKey, ...rest] = arg.slice(2).split('=');
    acc[rawKey] = rest.join('=') || 'true';
    return acc;
  }, {});
}

export function joinArray(value: unknown): string {
  return Array.isArray(value) ? value.filter(Boolean).join(' ') : '';
}

export async function generateEmbeddingWithEdge(text: string): Promise<number[]> {
  const response = await fetch(`${getSupabaseUrl()}/functions/v1/generate-embedding`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
      apikey: getServiceRoleKey(),
      'Content-Type': 'application/json',
      'x-application-name': 'Nodb-KB-Tools',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`generate-embedding failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { embedding?: number[] };
  if (!Array.isArray(payload.embedding) || payload.embedding.length === 0) {
    throw new Error('generate-embedding returned empty embedding');
  }
  return payload.embedding;
}
