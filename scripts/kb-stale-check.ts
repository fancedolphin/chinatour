import { KB_TABLES, TABLE_CONFIG, createServiceRoleClient, parseArgs, type KbTable } from './kb-utils';

type StaleRow = {
  id: string;
  label: string;
  verified_at: string | null;
  updated_at: string | null;
  stale_days: number;
};

function daysSince(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - new Date(value).getTime();
  return Math.floor(diffMs / 86_400_000);
}

async function loadStaleRows(table: KbTable, thresholdDays: number): Promise<StaleRow[]> {
  const supabase = createServiceRoleClient();
  const labelField = TABLE_CONFIG[table].labelField;
  const selectColumns =
    table === 'travel_tips'
      ? 'id, title, verified_at, created_at'
      : 'id, name, verified_at, updated_at';

  const { data, error } = await supabase.from(table).select(selectColumns).limit(5000);
  if (error) {
    throw new Error(`${table} 查询失败: ${error.message}`);
  }

  return ((data as Array<Record<string, string | null>> | null) || [])
    .map((row) => {
      const staleDays = daysSince(row.verified_at || row.updated_at || row.created_at);
      return {
        id: row.id!,
        label: row[labelField] || '(untitled)',
        verified_at: row.verified_at || null,
        updated_at: row.updated_at || row.created_at || null,
        stale_days: staleDays,
      };
    })
    .filter((row) => row.stale_days >= thresholdDays)
    .sort((left, right) => right.stale_days - left.stale_days);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const thresholdDays = Number(args.days || '180');
  const tables = (args.tables ? args.tables.split(',') : KB_TABLES) as KbTable[];

  const report = await Promise.all(
    tables.map(async (table) => ({
      table,
      rows: await loadStaleRows(table, thresholdDays),
    })),
  );

  const total = report.reduce((sum, item) => sum + item.rows.length, 0);
  console.log(`# KB stale check`);
  console.log(`threshold_days=${thresholdDays}`);
  console.log(`total_stale_rows=${total}`);

  for (const item of report) {
    console.log(`\n[${item.table}] stale=${item.rows.length}`);
    item.rows.slice(0, 20).forEach((row) => {
      console.log(
        `- ${row.id} | ${row.label} | stale_days=${row.stale_days} | verified_at=${row.verified_at ?? 'null'}`,
      );
    });
    if (item.rows.length > 20) {
      console.log(`- ... ${item.rows.length - 20} more`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
