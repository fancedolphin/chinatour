import { supabase } from '@/utils/supabase/client';
import { amapService } from '@/services/amapService';
import type {
  FallbackResult,
  PlaceCandidate,
  PlanningIntent,
  RagRetrievalResult,
  SlotName,
  SlotResult,
} from './contracts';
import { haversineDistanceMeters, isDuplicate } from './entityNormalizer';

const FAST_FOOD_PATTERN =
  /(麦当劳|肯德基|汉堡王|必胜客|星巴克|mcdonald|kfc|burger king|pizza hut|starbucks)/i;
const MIN_ATTRACTION_ITEMS = 2;

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string;
  location?: string;
  type?: string;
};

type FallbackBudget = {
  remaining: number;
};

type FallbackCache = Map<string, PlaceCandidate[]>;

type SlotFallbackOutcome = {
  slot: SlotResult;
  fallbackTriggered: boolean;
  amapCalls: number;
};

function parseLocation(location?: string): { lat: number; lng: number } | undefined {
  if (!location) return undefined;
  const [lngRaw, latRaw] = location.split(',');
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function shouldMerge(left: PlaceCandidate, right: PlaceCandidate): boolean {
  if (isDuplicate(left, right)) return true;
  if (left.location && right.location) {
    return haversineDistanceMeters(left.location, right.location) < 200;
  }
  return false;
}

function mergePair(rag: PlaceCandidate, amap: PlaceCandidate): PlaceCandidate {
  return {
    ...rag,
    id: rag.id || amap.id,
    source: 'rag+amap',
    confidence: Math.max(rag.confidence, amap.confidence),
    location: amap.location || rag.location,
    description: rag.description || amap.description,
    price: rag.price || amap.price,
    ticketPrice: rag.ticketPrice || amap.ticketPrice,
    recommendedDuration: rag.recommendedDuration || amap.recommendedDuration,
  };
}

function mergeCandidates(ragItems: PlaceCandidate[], amapItems: PlaceCandidate[]): PlaceCandidate[] {
  const merged = [...ragItems];
  amapItems.forEach((amapItem) => {
    const index = merged.findIndex((existing) => shouldMerge(existing, amapItem));
    if (index >= 0) {
      merged[index] = mergePair(merged[index], amapItem);
      return;
    }
    merged.push(amapItem);
  });
  return merged.sort((a, b) => b.confidence - a.confidence);
}

function normalizeAmapPoi(slot: SlotName, poi: AmapPoi): PlaceCandidate | null {
  const name = poi.name?.trim();
  if (!name) return null;

  if (slot === 'food' && FAST_FOOD_PATTERN.test(name)) {
    return null;
  }

  // Prefer the human-readable address as description; the type alone (e.g.
  // "餐饮服务") is too generic and renders an empty-feeling detail panel.
  const description = poi.address?.trim() || poi.type?.trim() || '来自高德 POI';
  const location = parseLocation(poi.location);
  const locationWithAddress = location && poi.address?.trim()
    ? { ...location, address: poi.address.trim() }
    : location;

  return {
    id: poi.id || `${slot}-amap-${name}`,
    name,
    description,
    slot,
    source: 'amap',
    confidence: 0.55,
    location: locationWithAddress,
    price: undefined,
    ticketPrice: undefined,
    recommendedDuration: slot === 'core_attractions' ? '2-3小时' : undefined,
    tags: poi.type ? [poi.type] : undefined,
  };
}

async function searchAmapAttractions(intent: PlanningIntent): Promise<PlaceCandidate[]> {
  const keywords = `${intent.destination} 景点`;
  const type = '110000';

  try {
    const { data, error } = await supabase.functions.invoke('amap-search', {
      body: {
        keyword: keywords,
        city: intent.destination,
        type,
        pageSize: 8,
      },
    });

    if (error) {
      throw error;
    }

    const pois = ((data as { pois?: AmapPoi[] } | null)?.pois || [])
      .map((poi) => normalizeAmapPoi('core_attractions', poi))
      .filter((poi): poi is PlaceCandidate => Boolean(poi));

    if (pois.length > 0) {
      return pois;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[amapFallbackService] 景点 Edge Function 查询失败，回退浏览器 SDK: ${message}`);
  }

  try {
    const sdkPois = await amapService.searchPOI('景点', intent.destination, type);
    return sdkPois
      .map((poi) => normalizeAmapPoi('core_attractions', poi))
      .filter((poi): poi is PlaceCandidate => Boolean(poi));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[amapFallbackService] 景点 AMap SDK 查询失败: ${message}`);
    return [];
  }
}

async function searchAmapRestaurantsNear(
  anchor: PlaceCandidate | undefined,
  intent: PlanningIntent,
): Promise<PlaceCandidate[]> {
  const keyword = intent.cuisinePreference || '餐厅';

  try {
    const pois = anchor?.location
      ? await amapService.searchNearby(anchor.location.lat, anchor.location.lng, keyword, 1500)
      : await amapService.searchPOI(keyword, intent.destination, '050000');
    return pois
      .map((poi) => normalizeAmapPoi('food', poi))
      .filter((poi): poi is PlaceCandidate => Boolean(poi));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[amapFallbackService] 餐厅 AMap SDK 查询失败: ${message}`);
    return [];
  }
}

class AmapFallbackService {
  async applyAttractionFallback(
    intent: PlanningIntent,
    slot: SlotResult,
    requestId: string,
  ): Promise<SlotFallbackOutcome> {
    if (slot.satisfied) {
      return {
        slot,
        fallbackTriggered: false,
        amapCalls: 0,
      };
    }

    const amapCandidates = await searchAmapAttractions(intent);
    const mergedItems = mergeCandidates(slot.items, amapCandidates);
    const nextSlot = {
      items: mergedItems,
      satisfied: mergedItems.length >= MIN_ATTRACTION_ITEMS,
    };
    console.info(
      `[amapFallbackService][${requestId}] attraction fallbackTriggered=${amapCandidates.length > 0}`,
    );

    return {
      slot: nextSlot,
      fallbackTriggered: amapCandidates.length > 0,
      amapCalls: 1,
    };
  }

  async applyRestaurantFallbackNear(
    anchor: PlaceCandidate | undefined,
    intent: PlanningIntent,
    slot: SlotResult,
    requestId: string,
    options?: {
      budget?: FallbackBudget;
      cache?: FallbackCache;
    },
  ): Promise<SlotFallbackOutcome> {
    if (slot.satisfied) {
      return {
        slot,
        fallbackTriggered: false,
        amapCalls: 0,
      };
    }

    if (options?.budget && options.budget.remaining <= 0) {
      return {
        slot,
        fallbackTriggered: false,
        amapCalls: 0,
      };
    }

    const cacheKey = [
      'restaurant',
      intent.destination,
      intent.cuisinePreference || '',
      anchor?.id || anchor?.name || 'destination',
      anchor?.location?.lat ?? '',
      anchor?.location?.lng ?? '',
    ].join('|');
    let amapCandidates = options?.cache?.get(cacheKey);
    if (!amapCandidates) {
      amapCandidates = await searchAmapRestaurantsNear(anchor, intent);
      options?.cache?.set(cacheKey, amapCandidates);
    }
    const mergedItems = mergeCandidates(slot.items, amapCandidates);
    const nextSlot = {
      items: mergedItems,
      satisfied: mergedItems.length > 0,
    };

    if (options?.budget) {
      options.budget.remaining -= 1;
    }

    console.info(
      `[amapFallbackService][${requestId}] restaurant fallbackTriggered=${amapCandidates.length > 0} anchor=${anchor?.name || 'destination'}`,
    );

    return {
      slot: nextSlot,
      fallbackTriggered: amapCandidates.length > 0,
      amapCalls: 1,
    };
  }

  async applyFallbackIfNeeded(
    intent: PlanningIntent,
    retrieval: RagRetrievalResult,
    requestId: string,
  ): Promise<FallbackResult> {
    let attractionSlot = retrieval.slots.core_attractions;
    let foodSlot = retrieval.slots.food;
    let amapCalls = 0;
    let fallbackTriggered = false;

    if (attractionSlot && !attractionSlot.satisfied) {
      const fallback = await this.applyAttractionFallback(intent, attractionSlot, requestId);
      attractionSlot = fallback.slot;
      amapCalls += fallback.amapCalls;
      fallbackTriggered = fallbackTriggered || fallback.fallbackTriggered;
    }

    if (foodSlot && !foodSlot.satisfied) {
      const fallback = await this.applyRestaurantFallbackNear(undefined, intent, foodSlot, requestId);
      foodSlot = fallback.slot;
      amapCalls += fallback.amapCalls;
      fallbackTriggered = fallbackTriggered || fallback.fallbackTriggered;
    }

    return {
      slots: {
        core_attractions: attractionSlot,
        food: foodSlot,
      },
      fallbackTriggered,
      amapCalls,
    };
  }
}

export const amapFallbackService = new AmapFallbackService();
