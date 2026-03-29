import { supabase } from '@/utils/supabase/client';
import { generateEmbedding } from './embeddingService';
import type {
  BookingTip,
  PlaceCandidate,
  PlanningIntent,
  RagRetrievalResult,
  SlotName,
  SlotResult,
} from './contracts';

const MIN_SLOT_ITEMS = 2;

type AttractionRpcRow = {
  id: string;
  name: string;
  description: string | null;
  location_lat: number | string | null;
  location_lng: number | string | null;
  ticket_price: string | null;
  recommended_duration: string | null;
  tags: string[] | null;
  similarity: number | null;
};

type RestaurantRpcRow = {
  id: string;
  name: string;
  cuisine_type: string | null;
  description: string | null;
  location_lat: number | string | null;
  location_lng: number | string | null;
  price_range: string | null;
  specialties: string[] | null;
  similarity: number | null;
};

type DestinationRow = { id: string; name: string };
type TravelTipRow = {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  is_important: boolean | null;
};

function toNumber(value: string | number | null | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function normalizeAttraction(item: AttractionRpcRow): PlaceCandidate {
  const lat = toNumber(item.location_lat);
  const lng = toNumber(item.location_lng);
  return {
    id: item.id,
    name: item.name,
    description: item.description || '暂无描述',
    slot: 'core_attractions',
    source: 'rag',
    confidence: Math.max(0.3, Math.min(0.95, item.similarity ?? 0.6)),
    location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    ticketPrice: item.ticket_price || undefined,
    recommendedDuration: item.recommended_duration || undefined,
    tags: item.tags || undefined,
  };
}

function normalizeRestaurant(item: RestaurantRpcRow): PlaceCandidate {
  const lat = toNumber(item.location_lat);
  const lng = toNumber(item.location_lng);
  return {
    id: item.id,
    name: item.name,
    description: item.description || '暂无描述',
    slot: 'food',
    source: 'rag',
    confidence: Math.max(0.3, Math.min(0.95, item.similarity ?? 0.6)),
    location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    price: item.price_range || undefined,
    tags: item.specialties || undefined,
  };
}

function satisfiesSlot(items: PlaceCandidate[]): boolean {
  return items.length >= MIN_SLOT_ITEMS;
}

function isBookingTip(item: TravelTipRow): boolean {
  const text = `${item.title || ''} ${item.content || ''} ${item.category || ''}`.toLowerCase();
  return (
    text.includes('预约') ||
    text.includes('预订') ||
    text.includes('门票') ||
    text.includes('购票') ||
    text.includes('实名')
  );
}

function normalizeBookingTip(item: TravelTipRow): BookingTip {
  return {
    id: item.id,
    title: item.title || '出行提醒',
    content: item.content || '',
    category: item.category,
  };
}

async function fetchBookingTips(destination: string): Promise<BookingTip[]> {
  const { data: destinations, error: destinationError } = await supabase
    .from('destinations')
    .select('id, name')
    .ilike('name', `%${destination}%`)
    .limit(5);

  if (destinationError) {
    console.warn('[ragService] 查询 destinations 失败:', destinationError.message);
  }

  const destinationIds = ((destinations as DestinationRow[] | null) || []).map((item) => item.id);

  let query = supabase
    .from('travel_tips')
    .select('id, title, content, category, is_important')
    .limit(20)
    .order('created_at', { ascending: false });

  if (destinationIds.length > 0) {
    query = query.in('destination_id', destinationIds);
  }

  const { data: rawTips, error } = await query;
  if (error) {
    console.warn('[ragService] 查询 travel_tips 失败:', error.message);
    return [];
  }

  return ((rawTips as TravelTipRow[] | null) || [])
    .filter(isBookingTip)
    .map(normalizeBookingTip)
    .slice(0, 6);
}

async function fallbackKeywordRetrieval(intent: PlanningIntent): Promise<{
  coreAttractions: PlaceCandidate[];
  food: PlaceCandidate[];
}> {
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, name')
    .ilike('name', `%${intent.destination}%`)
    .limit(5);

  const destinationIds = ((destinations as DestinationRow[] | null) || []).map((item) => item.id);

  let attractionQuery = supabase
    .from('attractions')
    .select('id, name, description, location_lat, location_lng, ticket_price, recommended_duration, tags')
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .limit(6);
  if (destinationIds.length > 0) {
    attractionQuery = attractionQuery.in('destination_id', destinationIds);
  }

  let restaurantQuery = supabase
    .from('restaurants')
    .select('id, name, description, location_lat, location_lng, price_range, specialties')
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .limit(6);
  if (destinationIds.length > 0) {
    restaurantQuery = restaurantQuery.in('destination_id', destinationIds);
  }

  const [{ data: attractions }, { data: restaurants }] = await Promise.all([
    attractionQuery,
    restaurantQuery,
  ]);

  const coreAttractions = ((attractions as AttractionRpcRow[] | null) || []).map((item) => ({
    ...normalizeAttraction({ ...item, similarity: 0.62 }),
  }));

  const food = ((restaurants as RestaurantRpcRow[] | null) || []).map((item) => ({
    ...normalizeRestaurant({ ...item, similarity: 0.62 }),
  }));

  return { coreAttractions, food };
}

class RagService {
  async retrieveBySlots(intent: PlanningIntent, requestId: string): Promise<RagRetrievalResult> {
    const embeddingStart = performance.now();
    let queryEmbedding: string | null = null;

    try {
      const embedding = await generateEmbedding(
        `${intent.destination} ${intent.rawQuery} ${intent.interestTags.join(' ')}`,
      );
      queryEmbedding = toVectorLiteral(embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ragService][${requestId}] embedding 阶段失败，降级关键词检索:`, message);
    }

    const embeddingMs = performance.now() - embeddingStart;

    const ragStart = performance.now();
    let coreAttractions: PlaceCandidate[] = [];
    let food: PlaceCandidate[] = [];

    if (queryEmbedding) {
      const [attractionsResult, restaurantsResult] = await Promise.all([
        supabase.rpc('match_attractions', {
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: 6,
          destination_filter: intent.destination,
        }),
        supabase.rpc('match_restaurants', {
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: 6,
          destination_filter: intent.destination,
        }),
      ]);

      if (attractionsResult.error) {
        console.warn('[ragService] match_attractions 失败:', attractionsResult.error.message);
      } else {
        coreAttractions = ((attractionsResult.data as AttractionRpcRow[] | null) || []).map(
          normalizeAttraction,
        );
      }

      if (restaurantsResult.error) {
        console.warn('[ragService] match_restaurants 失败:', restaurantsResult.error.message);
      } else {
        food = ((restaurantsResult.data as RestaurantRpcRow[] | null) || []).map(normalizeRestaurant);
      }
    }

    if (coreAttractions.length === 0 || food.length === 0) {
      const fallbackResults = await fallbackKeywordRetrieval(intent);
      if (coreAttractions.length === 0) coreAttractions = fallbackResults.coreAttractions;
      if (food.length === 0) food = fallbackResults.food;
    }

    const bookingTips = await fetchBookingTips(intent.destination);
    const ragMs = performance.now() - ragStart;

    const slots: Record<SlotName, SlotResult> = {
      core_attractions: {
        items: coreAttractions,
        satisfied: satisfiesSlot(coreAttractions),
      },
      food: {
        items: food,
        satisfied: satisfiesSlot(food),
      },
    };

    const unsatisfiedSlots = (Object.keys(slots) as SlotName[]).filter(
      (slot) => !slots[slot].satisfied,
    );

    return {
      slots,
      unsatisfiedSlots,
      bookingTips,
      stageTimings: {
        embedding: embeddingMs,
        rag_retrieve: ragMs,
      },
    };
  }
}

export const ragService = new RagService();
