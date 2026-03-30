const BASE_COLORS = [
  '#E53E3E', '#3182CE', '#38A169', '#D69E2E',
  '#805AD5', '#DD6B20', '#319795',
] as const;

export function getDayColor(dayIndex: number): string {
  const base = BASE_COLORS[dayIndex % 7];
  const cycle = Math.floor(dayIndex / 7);
  if (cycle === 0) return base;
  if (cycle === 1) return base + 'AA';
  return base + '77';
}
