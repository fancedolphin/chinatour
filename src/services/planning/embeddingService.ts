import { supabase } from '@/utils/supabase/client';

function ensureNumericArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Embedding input text is empty');
  }

  const { data, error } = await supabase.functions.invoke('generate-embedding', {
    body: { text: trimmed },
  });

  if (error) {
    throw new Error(`generate-embedding failed: ${error.message}`);
  }

  const embedding = (data as { embedding?: unknown })?.embedding;
  if (!ensureNumericArray(embedding) || embedding.length === 0) {
    throw new Error('generate-embedding returned invalid embedding');
  }

  return embedding;
}
