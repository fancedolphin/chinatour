export const FOOD_CUISINE_OPTIONS = [
  { value: "川菜", labelZh: "川菜", labelEn: "Sichuan", group: "major" },
  { value: "粤菜", labelZh: "粤菜", labelEn: "Cantonese", group: "major" },
  { value: "鲁菜", labelZh: "鲁菜", labelEn: "Shandong", group: "major" },
  { value: "苏菜", labelZh: "苏菜", labelEn: "Jiangsu", group: "major" },
  { value: "浙菜", labelZh: "浙菜", labelEn: "Zhejiang", group: "major" },
  { value: "闽菜", labelZh: "闽菜", labelEn: "Fujian", group: "major" },
  { value: "湘菜", labelZh: "湘菜", labelEn: "Hunan", group: "major" },
  { value: "徽菜", labelZh: "徽菜", labelEn: "Anhui", group: "major" },
  { value: "北方面食", labelZh: "北方面食", labelEn: "Northern Noodles", group: "legacy" },
  { value: "小吃", labelZh: "小吃", labelEn: "Street Snacks", group: "legacy" },
  { value: "点心早餐", labelZh: "点心早餐", labelEn: "Dim Sum / Breakfast", group: "legacy" },
] as const;

export type FoodCuisine = (typeof FOOD_CUISINE_OPTIONS)[number]["value"];

export const FOOD_SPICE_OPTIONS = [
  { value: 0, icon: "🟢", labelZh: "不辣", labelEn: "Mild" },
  { value: 1, icon: "🟡", labelZh: "微辣", labelEn: "Light Spicy" },
  { value: 2, icon: "🌶", labelZh: "中辣", labelEn: "Spicy" },
  { value: 3, icon: "🌶🌶🌶", labelZh: "重辣", labelEn: "Very Spicy" },
] as const;

export type FoodSpiceLevel = (typeof FOOD_SPICE_OPTIONS)[number]["value"];

export const FOOD_ALLERGEN_OPTIONS = [
  { value: "peanut", icon: "🥜", labelZh: "花生", labelEn: "Peanut" },
  { value: "gluten", icon: "🌾", labelZh: "麸质/小麦", labelEn: "Gluten/Wheat" },
  { value: "soy", icon: "🫘", labelZh: "大豆", labelEn: "Soy" },
  { value: "sesame", icon: "🌿", labelZh: "芝麻", labelEn: "Sesame" },
  { value: "shellfish", icon: "🦐", labelZh: "贝类/海鲜", labelEn: "Shellfish" },
  { value: "dairy", icon: "🥛", labelZh: "乳制品", labelEn: "Dairy" },
  { value: "egg", icon: "🥚", labelZh: "鸡蛋", labelEn: "Egg" },
  { value: "pork", icon: "🐷", labelZh: "猪肉", labelEn: "Pork" },
] as const;

export type FoodAllergen = (typeof FOOD_ALLERGEN_OPTIONS)[number]["value"];

export const ALLERGEN_DISCLAIMER_ZH =
  "⚠️ 过敏源信息仅供参考，各家餐馆做法不同。如有严重过敏，请务必向餐厅员工确认。";
export const ALLERGEN_DISCLAIMER_EN =
  "⚠️ Allergen info is for reference only. Recipes vary by restaurant. If you have severe allergies, confirm with staff before ordering.";

export const HIGH_RISK_COPY_PATTERNS = [
  /绝对安全/g,
  /100%安全/g,
  /完全无过敏风险/g,
  /不会过敏/g,
  /人人都能吃/g,
  /可放心吃/g,
  /guaranteed safe/gi,
  /zero allergy risk/gi,
  /safe for everyone/gi,
] as const;

const ALLERGEN_LOOKUP = new Set<string>(FOOD_ALLERGEN_OPTIONS.map((item) => item.value));

const ALLERGEN_SYNONYM_MAP: Record<string, FoodAllergen> = {
  peanut: "peanut",
  花生: "peanut",
  gluten: "gluten",
  wheat: "gluten",
  麸质: "gluten",
  小麦: "gluten",
  soy: "soy",
  soybean: "soy",
  大豆: "soy",
  sesame: "sesame",
  芝麻: "sesame",
  shellfish: "shellfish",
  seafood: "shellfish",
  海鲜: "shellfish",
  贝类: "shellfish",
  dairy: "dairy",
  milk: "dairy",
  乳制品: "dairy",
  egg: "egg",
  eggs: "egg",
  鸡蛋: "egg",
  pork: "pork",
  猪肉: "pork",
};

export function normalizeSpiceLevel(input: unknown): FoodSpiceLevel {
  const value = Number(input);
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 3) return 3;
  return value as FoodSpiceLevel;
}

export function normalizeAllergens(input: unknown): FoodAllergen[] {
  if (!Array.isArray(input)) return [];
  const normalized = input
    .map((value) => String(value).trim().toLowerCase())
    .map((value) => ALLERGEN_SYNONYM_MAP[value])
    .filter((value): value is FoodAllergen => Boolean(value));
  return Array.from(new Set(normalized));
}

export function isKnownAllergen(value: string): value is FoodAllergen {
  return ALLERGEN_LOOKUP.has(value);
}

export function detectHighRiskCopy(content: string): string[] {
  if (!content.trim()) return [];
  const hits: string[] = [];
  for (const pattern of HIGH_RISK_COPY_PATTERNS) {
    const match = content.match(pattern);
    if (!match) continue;
    hits.push(...match);
  }
  return Array.from(new Set(hits));
}

export function getSpiceMeta(level: FoodSpiceLevel) {
  return FOOD_SPICE_OPTIONS.find((item) => item.value === level) ?? FOOD_SPICE_OPTIONS[0];
}

export function getCuisineMeta(cuisine: string) {
  return FOOD_CUISINE_OPTIONS.find((item) => item.value === cuisine);
}
