import { KB_TABLES, TABLE_CONFIG, createServiceRoleClient, generateEmbeddingWithEdge, parseArgs, type KbTable } from './kb-utils';

function ensureTable(value: string | undefined): KbTable {
  if (!value || !KB_TABLES.includes(value as KbTable)) {
    throw new Error(`--table 必填，且必须属于: ${KB_TABLES.join(', ')}`);
  }
  return value as KbTable;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const table = ensureTable(args.table);
  const id = args.id;
  const patch = args.patch ? JSON.parse(args.patch) as Record<string, unknown> : {};
  const supabase = createServiceRoleClient();

  if (!id && Object.keys(patch).length === 0) {
    throw new Error('至少提供 --id 或 --patch');
  }

  let existing: Record<string, unknown> = {};
  if (id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) {
      throw new Error(`${table} 查询失败: ${error.message}`);
    }
    existing = (data as Record<string, unknown> | null) || {};
  }

  const nextRow = {
    ...existing,
    ...patch,
    ...(id ? { id } : {}),
    verified_at: new Date().toISOString(),
  };

  const embeddingText = TABLE_CONFIG[table].buildEmbeddingText(nextRow);
  if (!embeddingText.trim()) {
    throw new Error('更新后无法构造 embedding 文本，请至少补齐名称或描述字段');
  }

  const embedding = await generateEmbeddingWithEdge(embeddingText);

  const payload = {
    ...nextRow,
    embedding: `[${embedding.join(',')}]`,
  };

  const { data, error } = await supabase.from(table).upsert(payload).select('id').single();
  if (error) {
    throw new Error(`${table} upsert 失败: ${error.message}`);
  }

  console.log(`updated_table=${table}`);
  console.log(`updated_id=${data.id}`);
  console.log(`verified_at=${nextRow.verified_at}`);
  console.log(`embedding_dimensions=${embedding.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
