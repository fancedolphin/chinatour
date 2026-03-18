import type { Json, Tables } from "@/types/database";
import { supabase } from "@/utils/supabase/client";
import {
  detectHighRiskCopy,
  FoodAllergen,
  FoodCuisine,
  FoodSpiceLevel,
  normalizeAllergens,
  normalizeSpiceLevel,
} from "@/constants/foodEncyclopedia";

type FoodEncyclopediaRow = Tables<"food_encyclopedia">;

export interface FoodAnalogy {
  dish?: string;
  country?: string;
  similarity?: string;
  difference?: string;
  note?: string;
}

export interface FoodEncyclopediaItem
  extends Omit<FoodEncyclopediaRow, "allergens" | "spice_level" | "foreign_analogies"> {
  allergens: FoodAllergen[];
  spice_level: FoodSpiceLevel;
  foreign_analogies: FoodAnalogy[];
  copyReviewFlags: string[];
}

export interface FoodFilters {
  cuisines?: FoodCuisine[];
  spiceLevels?: FoodSpiceLevel[];
  excludeAllergens?: FoodAllergen[];
  keyword?: string;
}

function formatPgArrayLiteral(value: string): string {
  return `{"${value}"}`;
}

function normalizeForeignAnalogies(input: Json | null): FoodAnalogy[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      return {
        dish: typeof record.dish === "string" ? record.dish : undefined,
        country: typeof record.country === "string" ? record.country : undefined,
        similarity: typeof record.similarity === "string" ? record.similarity : undefined,
        difference: typeof record.difference === "string" ? record.difference : undefined,
        note: typeof record.note === "string" ? record.note : undefined,
      } satisfies FoodAnalogy;
    })
    .filter((entry): entry is FoodAnalogy => Boolean(entry));
}

function normalizeItem(row: FoodEncyclopediaRow): FoodEncyclopediaItem {
  const copySource = [row.flavor_md, row.traveler_tips, row.allergen_note].filter(Boolean).join("\n");
  return {
    ...row,
    allergens: normalizeAllergens(row.allergens),
    spice_level: normalizeSpiceLevel(row.spice_level),
    foreign_analogies: normalizeForeignAnalogies(row.foreign_analogies),
    copyReviewFlags: detectHighRiskCopy(copySource),
  };
}

function applyKeyword(items: FoodEncyclopediaItem[], keyword?: string): FoodEncyclopediaItem[] {
  const query = keyword?.trim().toLowerCase();
  if (!query) return items;

  return items.filter((item) => {
    return [item.name_zh, item.name_en, item.name_pinyin, item.cuisine, item.category, item.flavor_md]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });
}

export async function getFoodList(filters: FoodFilters = {}): Promise<FoodEncyclopediaItem[]> {
  let query = supabase
    .from("food_encyclopedia")
    .select("*")
    .eq("is_published", true)
    .order("cuisine", { ascending: true })
    .order("name_zh", { ascending: true });

  if (filters.cuisines && filters.cuisines.length > 0) {
    if (filters.cuisines.length === 1) {
      query = query.eq("cuisine", filters.cuisines[0]);
    } else {
      query = query.in("cuisine", filters.cuisines);
    }
  }

  if (filters.spiceLevels && filters.spiceLevels.length > 0) {
    if (filters.spiceLevels.length === 1) {
      query = query.eq("spice_level", filters.spiceLevels[0]);
    } else {
      query = query.in("spice_level", filters.spiceLevels);
    }
  }

  if (filters.excludeAllergens && filters.excludeAllergens.length > 0) {
    for (const allergen of filters.excludeAllergens) {
      query = query.not("allergens", "cs", formatPgArrayLiteral(allergen));
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load food encyclopedia: ${error.message}`);
  }

  const normalized = (data ?? []).map((row) => normalizeItem(row as FoodEncyclopediaRow));
  return applyKeyword(normalized, filters.keyword);
}
