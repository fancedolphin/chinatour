import { supabase } from '@/utils/supabase/client';
import { getCurrentLocale } from '@/i18n';
import { generateEmbedding } from './embeddingService';
import { isDuplicate } from './entityNormalizer';
import type {
  BookingTip,
  PlaceCandidate,
  RagRetrievalResult,
  RagSlotMap,
  PlanningIntent,
  SignatureItem,
  SlotName,
  SlotResult,
} from './contracts';

const MIN_SLOT_ITEMS = 2;

type AttractionRpcRow = {
  id: string;
  name: string;
  name_en?: string | null;
  description: string | null;
  location_lat: number | string | null;
  location_lng: number | string | null;
  address?: string | null;
  ticket_price: string | null;
  recommended_duration: string | null;
  tags: string[] | null;
  indoor_outdoor?: string | null;
  similarity: number | null;
};

type RestaurantRpcRow = {
  id: string;
  name: string;
  cuisine_type: string | null;
  description: string | null;
  location_lat: number | string | null;
  location_lng: number | string | null;
  address?: string | null;
  price_range: string | null;
  specialties: string[] | null;
  similarity: number | null;
};

type AuxiliaryRpcRow = {
  id: string;
  name: string;
  name_en?: string | null;
  type?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  duration_minutes?: number | null;
  duration_text?: string | null;
  price_per_person?: string | null;
  price_range?: string | null;
  price?: string | null;
  schedule?: string | null;
  operating_hours?: string | null;
  indoor_outdoor?: string | null;
  booking_required?: boolean | null;
  booking_method?: string | null;
  take_home_item?: boolean | null;
  month_start?: number | null;
  month_end?: number | null;
  tags?: string[] | null;
  highlights?: string[] | null;
  suitable_for?: string[] | null;
  signature_items?: SignatureItem[] | null;
  similarity?: number | null;
};

type DestinationRow = { id: string; name: string };
type TravelTipRow = {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  is_important: boolean | null;
};

type OptionalSlotName = Exclude<SlotName, 'core_attractions' | 'booking_constraints'> | 'food';

type AttractionRetrievalResult = {
  slot: SlotResult;
  bookingTips: BookingTip[];
  stageTimings: {
    embedding: number;
    attraction_retrieval: number;
  };
};

type RestaurantRetrievalResult = {
  slot: SlotResult;
  stageTimings: {
    embedding: number;
    retrieval: number;
  };
  usedDestinationFallback: boolean;
  usedKeywordFallback: boolean;
};

const OPTIONAL_SLOT_QUERIES: Record<
  OptionalSlotName,
  {
    rpc: string;
    threshold: number;
    limit: number;
    buildQuery: (intent: PlanningIntent) => string;
  }
> = {
  food: {
    rpc: 'match_restaurants',
    threshold: 0.55,
    limit: 6,
    buildQuery: (intent) =>
      `${intent.destination} ${intent.cuisinePreference || ''} ${intent.rawQuery} food restaurant local cuisine`,
  },
  industrial_tourism: {
    rpc: 'match_industrial_tourism',
    threshold: 0.65,
    limit: 4,
    buildQuery: (intent) =>
      `${intent.destination} 工业旅游 工厂 车间 制造 workshop factory craft souvenir`,
  },
  cultural_experiences: {
    rpc: 'match_cultural_experiences',
    threshold: 0.68,
    limit: 4,
    buildQuery: (intent) =>
      `${intent.destination} 文化体验 traditional culture experience ${intent.interestTags.join(' ')}`,
  },
  events: {
    rpc: 'match_events',
    threshold: 0.65,
    limit: 4,
    buildQuery: (intent) =>
      `${intent.destination} 节庆 活动 festival event celebration seasonal ${intent.travelMonth ?? ''}`,
  },
  markets: {
    rpc: 'match_markets',
    threshold: 0.68,
    limit: 4,
    buildQuery: (intent) =>
      `${intent.destination} 夜市 市场 购物 night market shopping souvenir ${intent.interestTags.join(' ')}`,
  },
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

function clampConfidence(value: number | null | undefined, fallback = 0.6): number {
  return Math.max(0.3, Math.min(0.95, value ?? fallback));
}

function normalizeIndoorOutdoor(value: string | null | undefined) {
  return value === 'indoor' || value === 'both' || value === 'outdoor' ? value : undefined;
}

function normalizeSignatureItems(value: SignatureItem[] | null | undefined): SignatureItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .map((item) => ({
      name: item.name,
      nameEn: item.nameEn,
      priceRmb: item.priceRmb ?? null,
      bargainTip: item.bargainTip ?? null,
      note: item.note ?? null,
    }));
}

function normalizeAttraction(item: AttractionRpcRow): PlaceCandidate {
  const lat = toNumber(item.location_lat);
  const lng = toNumber(item.location_lng);
  return {
    id: item.id,
    name: item.name,
    nameEn: item.name_en || undefined,
    description: item.description || '暂无描述',
    slot: 'core_attractions',
    source: 'rag',
    confidence: clampConfidence(item.similarity),
    location:
      lat !== undefined && lng !== undefined
        ? { lat, lng, address: item.address || undefined }
        : undefined,
    ticketPrice: item.ticket_price || undefined,
    recommendedDuration: item.recommended_duration || undefined,
    tags: item.tags || undefined,
    indoorOutdoor: normalizeIndoorOutdoor(item.indoor_outdoor),
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
    confidence: clampConfidence(item.similarity),
    location:
      lat !== undefined && lng !== undefined
        ? { lat, lng, address: item.address || undefined }
        : undefined,
    price: item.price_range || undefined,
    tags: item.specialties || undefined,
  };
}

function normalizeAuxiliaryCandidate(slot: SlotName, item: AuxiliaryRpcRow): PlaceCandidate {
  const lat = toNumber(item.location_lat);
  const lng = toNumber(item.location_lng);
  const tags = [...(item.tags || []), ...(item.highlights || [])].filter(Boolean);
  const reservationNotes =
    item.booking_required === true
      ? item.booking_method || '需预约'
      : undefined;

  return {
    id: item.id,
    name: item.name,
    nameEn: item.name_en || undefined,
    description: item.description || '暂无描述',
    slot,
    source: 'rag',
    confidence: clampConfidence(item.similarity, 0.72),
    location:
      lat !== undefined && lng !== undefined
        ? { lat, lng, address: item.address || undefined }
        : undefined,
    category: item.type || item.category || undefined,
    price: item.price_per_person || item.price || item.price_range || undefined,
    recommendedDuration:
      item.duration_minutes != null
        ? `${item.duration_minutes}分钟`
        : item.duration_text || undefined,
    reservationNotes,
    indoorOutdoor:
      slot === 'cultural_experiences'
        ? normalizeIndoorOutdoor(item.indoor_outdoor) || 'indoor'
        : normalizeIndoorOutdoor(item.indoor_outdoor),
    monthStart: item.month_start || undefined,
    monthEnd: item.month_end || undefined,
    operatingHours: item.schedule || item.operating_hours || undefined,
    highlights: item.highlights || undefined,
    suitableFor: item.suitable_for || undefined,
    tags: tags.length > 0 ? tags : undefined,
    signatureItems: normalizeSignatureItems(item.signature_items),
  };
}

function dedupePlaceCandidates(items: PlaceCandidate[]): PlaceCandidate[] {
  return items.reduce<PlaceCandidate[]>((unique, item) => {
    const index = unique.findIndex((existing) => isDuplicate(existing, item));
    if (index === -1) {
      unique.push(item);
      return unique;
    }

    if (item.confidence > unique[index].confidence) {
      unique[index] = item;
    }
    return unique;
  }, []);
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
  const locale = getCurrentLocale();
  const { data: destinations, error: destinationError } = await supabase
    .from('destinations')
    .select('id, name')
    .ilike('name', `%${destination}%`)
    .eq('locale', locale)
    .limit(5);

  if (destinationError) {
    console.warn('[ragService] 查询 destinations 失败:', destinationError.message);
  }

  const destinationIds = ((destinations as DestinationRow[] | null) || []).map((item) => item.id);

  let query = supabase
    .from('travel_tips')
    .select('id, title, content, category, is_important')
    .eq('locale', locale)
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

async function resolveDestinationIds(destination: string): Promise<string[]> {
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, name')
    .ilike('name', `%${destination}%`)
    .eq('locale', getCurrentLocale())
    .limit(5);

  if (error) {
    console.warn('[ragService] 查询 destinations 失败:', error.message);
    return [];
  }

  return ((destinations as DestinationRow[] | null) || []).map((item) => item.id);
}

async function fallbackKeywordAttractions(intent: PlanningIntent): Promise<PlaceCandidate[]> {
  const destinationIds = await resolveDestinationIds(intent.destination);

  let attractionQuery = supabase
    .from('attractions')
    .select('id, name, description, location_lat, location_lng, address, ticket_price, recommended_duration, tags, indoor_outdoor')
    .eq('locale', getCurrentLocale())
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .limit(6);
  if (destinationIds.length > 0) {
    attractionQuery = attractionQuery.in('destination_id', destinationIds);
  }

  const { data: attractions } = await attractionQuery;

  return ((attractions as AttractionRpcRow[] | null) || []).map((item) =>
    normalizeAttraction({ ...item, similarity: 0.62 }),
  );
}

async function fallbackKeywordRestaurants(intent: PlanningIntent): Promise<PlaceCandidate[]> {
  const destinationIds = await resolveDestinationIds(intent.destination);

  let restaurantQuery = supabase
    .from('restaurants')
    .select('id, name, description, location_lat, location_lng, address, price_range, specialties, cuisine_type')
    .eq('locale', getCurrentLocale())
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .limit(6);
  if (destinationIds.length > 0) {
    restaurantQuery = restaurantQuery.in('destination_id', destinationIds);
  }

  const { data: restaurants } = await restaurantQuery;

  return ((restaurants as RestaurantRpcRow[] | null) || []).map((item) =>
    normalizeRestaurant({ ...item, similarity: 0.62 }),
  );
}

async function fallbackKeywordRetrieval(intent: PlanningIntent): Promise<{
  coreAttractions: PlaceCandidate[];
  food: PlaceCandidate[];
}> {
  const [coreAttractions, food] = await Promise.all([
    fallbackKeywordAttractions(intent),
    fallbackKeywordRestaurants(intent),
  ]);

  return { coreAttractions, food };
}

function shouldRetrieveSlot(intent: PlanningIntent, slot: Exclude<OptionalSlotName, 'food'>): boolean {
  if (slot === 'industrial_tourism') {
    return intent.includeIndustrial || intent.interestTags.includes('industrial');
  }
  if (slot === 'cultural_experiences') {
    return intent.interestTags.includes('culture') || /茶道|书法|戏曲|文化/i.test(intent.rawQuery);
  }
  if (slot === 'events') {
    return Boolean(intent.travelMonth) || /节庆|活动|festival|event/i.test(intent.rawQuery);
  }
  if (slot === 'markets') {
    return intent.interestTags.includes('shopping') || /夜市|购物|market|shopping/i.test(intent.rawQuery);
  }
  return false;
}

function buildFoodQuery(intent: PlanningIntent, anchorName?: string): string {
  return `${intent.destination} ${intent.cuisinePreference || ''} ${intent.rawQuery} ${anchorName || ''} food restaurant local cuisine nearby`;
}

async function queryAttractionsByEmbedding(
  queryEmbedding: string,
  destination: string,
  matchCount = 6,
): Promise<PlaceCandidate[]> {
  const result = await supabase.rpc('match_attractions', {
    query_embedding: queryEmbedding,
    match_threshold: 0.55,
    match_count: matchCount,
    destination_filter: destination,
    locale_filter: getCurrentLocale(),
  });

  if (result.error) {
    console.warn('[ragService] match_attractions 失败:', result.error.message);
    return [];
  }

  return dedupePlaceCandidates(
    ((result.data as AttractionRpcRow[] | null) || []).map(normalizeAttraction),
  );
}

async function queryRestaurantsByEmbedding(
  queryEmbedding: string,
  destination: string,
  matchCount = 6,
): Promise<PlaceCandidate[]> {
  const result = await supabase.rpc('match_restaurants', {
    query_embedding: queryEmbedding,
    match_threshold: 0.55,
    match_count: matchCount,
    destination_filter: destination,
    locale_filter: getCurrentLocale(),
  });

  if (result.error) {
    console.warn('[ragService] match_restaurants 失败:', result.error.message);
    return [];
  }

  return dedupePlaceCandidates(
    ((result.data as RestaurantRpcRow[] | null) || []).map(normalizeRestaurant),
  );
}

class RagService {
  async retrieveAttractionsOnly(intent: PlanningIntent, requestId: string): Promise<AttractionRetrievalResult> {
    const embeddingStart = performance.now();
    let queryEmbedding: string | null = null;

    try {
      const embedding = await generateEmbedding(
        `${intent.destination} ${intent.rawQuery} ${intent.interestTags.join(' ')}`,
      );
      queryEmbedding = toVectorLiteral(embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ragService][${requestId}] attraction embedding 失败，降级关键词检索:`, message);
    }

    const embeddingMs = performance.now() - embeddingStart;
    const retrievalStart = performance.now();

    let attractions = queryEmbedding
      ? await queryAttractionsByEmbedding(queryEmbedding, intent.destination)
      : [];
    if (attractions.length === 0) {
      attractions = dedupePlaceCandidates(await fallbackKeywordAttractions(intent));
    }

    const bookingTips = await fetchBookingTips(intent.destination);

    return {
      slot: {
        items: attractions,
        satisfied: satisfiesSlot(attractions),
      },
      bookingTips,
      stageTimings: {
        embedding: embeddingMs,
        attraction_retrieval: performance.now() - retrievalStart,
      },
    };
  }

  async retrieveRestaurantsForDestination(
    intent: PlanningIntent,
    requestId: string,
  ): Promise<RestaurantRetrievalResult> {
    const embeddingStart = performance.now();
    let queryEmbedding: string | null = null;

    try {
      const embedding = await generateEmbedding(buildFoodQuery(intent));
      queryEmbedding = toVectorLiteral(embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ragService][${requestId}] restaurant embedding 失败，降级关键词检索:`, message);
    }

    const embeddingMs = performance.now() - embeddingStart;
    const retrievalStart = performance.now();
    let restaurants = queryEmbedding
      ? await queryRestaurantsByEmbedding(queryEmbedding, intent.destination)
      : [];
    let usedKeywordFallback = false;

    if (restaurants.length === 0) {
      restaurants = dedupePlaceCandidates(await fallbackKeywordRestaurants(intent));
      usedKeywordFallback = restaurants.length > 0;
    }

    return {
      slot: {
        items: restaurants,
        satisfied: satisfiesSlot(restaurants),
      },
      stageTimings: {
        embedding: embeddingMs,
        retrieval: performance.now() - retrievalStart,
      },
      usedDestinationFallback: false,
      usedKeywordFallback,
    };
  }

  async retrieveRestaurantsNear(
    attraction: PlaceCandidate,
    intent: PlanningIntent,
    requestId: string,
    options?: {
      radiusMeters?: number;
      matchCount?: number;
      includeDestinationFallback?: boolean;
      includeKeywordFallback?: boolean;
    },
  ): Promise<RestaurantRetrievalResult> {
    const radiusMeters = options?.radiusMeters ?? 1500;
    const matchCount = options?.matchCount ?? 4;
    const includeDestinationFallback = options?.includeDestinationFallback ?? true;
    const includeKeywordFallback = options?.includeKeywordFallback ?? true;
    const embeddingStart = performance.now();
    let queryEmbedding: string | null = null;

    try {
      const embedding = await generateEmbedding(buildFoodQuery(intent, attraction.name));
      queryEmbedding = toVectorLiteral(embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ragService][${requestId}] nearby restaurant embedding 失败，降级目的地检索:`, message);
    }

    const embeddingMs = performance.now() - embeddingStart;
    const retrievalStart = performance.now();
    let restaurants: PlaceCandidate[] = [];
    let usedDestinationFallback = !attraction.location;
    let usedKeywordFallback = false;

    if (queryEmbedding && attraction.location) {
      const result = await supabase.rpc('match_restaurants_near', {
        query_embedding: queryEmbedding,
        center_lat: attraction.location.lat,
        center_lng: attraction.location.lng,
        radius_meters: radiusMeters,
        match_threshold: 0.4,
        match_count: matchCount,
        destination_filter: intent.destination,
        locale_filter: getCurrentLocale(),
      });

      if (result.error) {
        console.warn('[ragService] match_restaurants_near 失败:', result.error.message);
      } else {
        restaurants = dedupePlaceCandidates(
          ((result.data as RestaurantRpcRow[] | null) || []).map(normalizeRestaurant),
        );
      }
    }

    if (restaurants.length === 0 && includeDestinationFallback) {
      usedDestinationFallback = true;
      restaurants = queryEmbedding
        ? await queryRestaurantsByEmbedding(queryEmbedding, intent.destination, 6)
        : [];
    }

    if (restaurants.length === 0 && includeKeywordFallback) {
      restaurants = dedupePlaceCandidates(await fallbackKeywordRestaurants(intent));
      usedKeywordFallback = restaurants.length > 0;
    }

    return {
      slot: {
        items: restaurants,
        satisfied: restaurants.length > 0,
      },
      stageTimings: {
        embedding: embeddingMs,
        retrieval: performance.now() - retrievalStart,
      },
      usedDestinationFallback,
      usedKeywordFallback,
    };
  }

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
    let optionalSlots: RagSlotMap = {};

    if (queryEmbedding) {
      const [attractionsResult, restaurantsResult, extraSlots] = await Promise.all([
        supabase.rpc('match_attractions', {
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: 6,
          destination_filter: intent.destination,
          locale_filter: getCurrentLocale(),
        }),
        supabase.rpc('match_restaurants', {
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: 6,
          destination_filter: intent.destination,
          locale_filter: getCurrentLocale(),
        }),
        this.queryOptionalSlotsFromEmbedding(
          intent,
          queryEmbedding,
          (['cultural_experiences', 'events', 'markets', 'industrial_tourism'] as const).filter((slot) =>
            shouldRetrieveSlot(intent, slot),
          ),
        ),
      ]);

      if (attractionsResult.error) {
        console.warn('[ragService] match_attractions 失败:', attractionsResult.error.message);
      } else {
        coreAttractions = dedupePlaceCandidates(
          ((attractionsResult.data as AttractionRpcRow[] | null) || []).map(normalizeAttraction),
        );
      }

      if (restaurantsResult.error) {
        console.warn('[ragService] match_restaurants 失败:', restaurantsResult.error.message);
      } else {
        food = dedupePlaceCandidates(
          ((restaurantsResult.data as RestaurantRpcRow[] | null) || []).map(normalizeRestaurant),
        );
      }

      optionalSlots = extraSlots;
    }

    if (coreAttractions.length === 0 || food.length === 0) {
      const fallbackResults = await fallbackKeywordRetrieval(intent);
      if (coreAttractions.length === 0) coreAttractions = dedupePlaceCandidates(fallbackResults.coreAttractions);
      if (food.length === 0) food = dedupePlaceCandidates(fallbackResults.food);
    }

    const bookingTips = await fetchBookingTips(intent.destination);
    const ragMs = performance.now() - ragStart;

    const slots: RagSlotMap = {
      core_attractions: {
        items: coreAttractions,
        satisfied: satisfiesSlot(coreAttractions),
      },
      food: {
        items: food,
        satisfied: satisfiesSlot(food),
      },
      ...optionalSlots,
    };

    const unsatisfiedSlots: SlotName[] = [];
    if (!slots.core_attractions?.satisfied) unsatisfiedSlots.push('core_attractions');
    if (!slots.food?.satisfied) unsatisfiedSlots.push('food');
    if (shouldRetrieveSlot(intent, 'industrial_tourism') && !slots.industrial_tourism?.satisfied) {
      unsatisfiedSlots.push('industrial_tourism');
    }
    if (shouldRetrieveSlot(intent, 'cultural_experiences') && !slots.cultural_experiences?.satisfied) {
      unsatisfiedSlots.push('cultural_experiences');
    }
    if (shouldRetrieveSlot(intent, 'events') && !slots.events?.satisfied) {
      unsatisfiedSlots.push('events');
    }
    if (shouldRetrieveSlot(intent, 'markets') && !slots.markets?.satisfied) {
      unsatisfiedSlots.push('markets');
    }

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

  async retrieveOptionalSlots(
    intent: PlanningIntent,
    requestedSlots: OptionalSlotName[],
    requestId: string,
  ): Promise<RagSlotMap> {
    if (requestedSlots.length === 0) {
      return {};
    }

    try {
      const embedding = await generateEmbedding(
        requestedSlots.map((slot) => OPTIONAL_SLOT_QUERIES[slot].buildQuery(intent)).join(' '),
      );
      return this.queryOptionalSlotsFromEmbedding(intent, toVectorLiteral(embedding), requestedSlots);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ragService][${requestId}] optional slot embedding 失败:`, message);
      return {};
    }
  }

  async fetchBookingTipsForDestination(destination: string): Promise<BookingTip[]> {
    return fetchBookingTips(destination);
  }

  async retrieveIndoorCandidates(intent: PlanningIntent, requestId: string): Promise<PlaceCandidate[]> {
    const embedding = await generateEmbedding(
      `${intent.destination} ${intent.rawQuery} indoor museum gallery bad weather rain shelter`,
    );
    const queryEmbedding = toVectorLiteral(embedding);

    const indoorResult = await supabase.rpc('match_indoor_attractions', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 8,
      destination_filter: intent.destination,
      locale_filter: getCurrentLocale(),
    });

    if (indoorResult.error) {
      console.warn(`[ragService][${requestId}] match_indoor_attractions 失败:`, indoorResult.error.message);
      const fallbackResults = await fallbackKeywordRetrieval(intent);
      return fallbackResults.coreAttractions.filter((item) =>
        ['indoor', 'both'].includes(item.indoorOutdoor ?? 'outdoor'),
      );
    }

    return ((indoorResult.data as AttractionRpcRow[] | null) || []).map(normalizeAttraction);
  }

  private async queryOptionalSlotsFromEmbedding(
    intent: PlanningIntent,
    queryEmbedding: string,
    requestedSlots: OptionalSlotName[],
  ): Promise<RagSlotMap> {
    const uniqueSlots = Array.from(new Set(requestedSlots));
    const slotEntries = await Promise.all(
      uniqueSlots.map(async (slot) => {
        const config = OPTIONAL_SLOT_QUERIES[slot];
        const params: Record<string, string | number | null> = {
          query_embedding: queryEmbedding,
          match_threshold: config.threshold,
          match_count: config.limit,
          destination_filter: intent.destination,
          locale_filter: getCurrentLocale(),
        };
        if (slot === 'events') {
          params.month_filter = intent.travelMonth ?? null;
        }

        const result = await supabase.rpc(config.rpc, params);
        if (result.error) {
          console.warn(`[ragService] ${config.rpc} 失败:`, result.error.message);
          return [slot, { items: [], satisfied: false } satisfies SlotResult] as const;
        }

        if (slot === 'food') {
          const items = dedupePlaceCandidates(
            ((result.data as RestaurantRpcRow[] | null) || []).map(normalizeRestaurant),
          );
          return [slot, { items, satisfied: satisfiesSlot(items) } satisfies SlotResult] as const;
        }

        const normalizedSlot = slot === 'food' ? 'food' : slot;
        const items = dedupePlaceCandidates(
          ((result.data as AuxiliaryRpcRow[] | null) || []).map((row) =>
            normalizeAuxiliaryCandidate(normalizedSlot as SlotName, row),
          ),
        );
        return [slot, { items, satisfied: items.length > 0 } satisfies SlotResult] as const;
      }),
    );

    return Object.fromEntries(slotEntries) as RagSlotMap;
  }
}

export const ragService = new RagService();
