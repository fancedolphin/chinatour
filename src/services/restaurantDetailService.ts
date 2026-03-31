import type { DishItem, RestaurantDetail } from '@/components/RestaurantDetailCard';
import { supabase } from '@/utils/supabase/client';

type RestaurantRow = {
  id: string;
  name: string;
  name_en?: string | null;
  address?: string | null;
  opening_hours?: unknown;
  cuisine_type?: string | null;
  price_range?: string | null;
  specialties?: string[] | null;
  menu_image_url?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  restaurant_dishes?: DishRow[] | null;
};

type DishRow = {
  name?: string | null;
  name_en?: string | null;
  description?: string | null;
  image_url?: string | null;
  allergens?: string[] | null;
  order_index?: number | null;
};

const NOISY_DISH_MARKERS = [
  '收录于',
  '大众点评',
  '平均评分',
  '内容平台',
  '相关标题',
  '关联',
  '地址',
  '区域',
  '城市为',
];

function parseHours(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === 'object' && 'general' in (value as Record<string, unknown>)) {
    const general = (value as { general?: unknown }).general;
    if (typeof general === 'string' && general.trim()) {
      return general.trim();
    }
  }

  return '营业时间未提供';
}

function expandDishCandidates(values: string[]): string[] {
  return values.flatMap((value) =>
    value
      .split(/[、,，/]/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function isCleanDishName(value: string): boolean {
  if (!value) return false;
  if (value.length > 24) return false;
  if (/[；。:：]/.test(value)) return false;
  return !NOISY_DISH_MARKERS.some((marker) => value.includes(marker));
}

function buildDishesFromRows(rows: DishRow[]): DishItem[] {
  return rows
    .sort((left, right) => (left.order_index || 0) - (right.order_index || 0))
    .filter((row) => typeof row.name === 'string' && row.name.trim())
    .map((row) => ({
      name: row.name!.trim(),
      nameEn: row.name_en?.trim() || row.name!.trim(),
      description: row.description?.trim() || '',
      image: row.image_url?.trim() || undefined,
      allergens: Array.isArray(row.allergens) ? row.allergens.filter(Boolean) : [],
    }));
}

function buildDishesFromSpecialties(specialties: string[] | null | undefined): DishItem[] {
  if (!Array.isArray(specialties)) return [];

  return Array.from(new Set(expandDishCandidates(specialties).filter(isCleanDishName))).map((dish) => ({
    name: dish,
    nameEn: dish,
    description: '',
    allergens: [],
  }));
}

function mapRestaurantDetail(row: RestaurantRow): RestaurantDetail {
  const dishesFromRows = buildDishesFromRows(Array.isArray(row.restaurant_dishes) ? row.restaurant_dishes : []);
  const signature = dishesFromRows.length > 0 ? dishesFromRows : buildDishesFromSpecialties(row.specialties);

  return {
    name: row.name,
    nameEn: row.name_en?.trim() || row.name,
    address: row.address?.trim() || '地址未提供',
    hours: parseHours(row.opening_hours),
    cuisine: row.cuisine_type?.trim() || '精选美食',
    priceRange: row.price_range?.trim() || '价格未提供',
    signature,
    menuImage: row.menu_image_url?.trim() || dishesFromRows.find((dish) => dish.image)?.image,
  };
}

async function resolveDestinationIds(destination?: string): Promise<string[]> {
  if (!destination?.trim()) return [];

  const { data, error } = await supabase
    .from('destinations')
    .select('id')
    .ilike('name', `%${destination.trim()}%`)
    .limit(5);

  if (error) {
    console.warn('[restaurantDetailService] 查询 destinations 失败:', error.message);
    return [];
  }

  return ((data as Array<{ id: string }> | null) || []).map((item) => item.id);
}

class RestaurantDetailService {
  async findByName(name: string, destination?: string): Promise<RestaurantDetail | null> {
    const destinationIds = await resolveDestinationIds(destination);
    let query = supabase
      .from('restaurants')
      .select('*, restaurant_dishes(*)')
      .eq('name', name)
      .limit(5);

    if (destinationIds.length > 0) {
      query = query.in('destination_id', destinationIds);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[restaurantDetailService] 查询 restaurants 失败:', error.message);
      return null;
    }

    const rows = ((data as RestaurantRow[] | null) || []).sort(
      (left, right) => (right.review_count || 0) - (left.review_count || 0),
    );
    return rows[0] ? mapRestaurantDetail(rows[0]) : null;
  }

  async findById(id: string): Promise<RestaurantDetail | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*, restaurant_dishes(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('[restaurantDetailService] 按 id 查询 restaurants 失败:', error.message);
      return null;
    }

    return data ? mapRestaurantDetail(data as RestaurantRow) : null;
  }
}

export const restaurantDetailService = new RestaurantDetailService();
