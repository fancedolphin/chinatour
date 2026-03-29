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

const FAST_FOOD_PATTERN =
  /(麦当劳|肯德基|汉堡王|必胜客|星巴克|mcdonald|kfc|burger king|pizza hut|starbucks)/i;

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string;
  location?: string;
  type?: string;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s·•\-\(\)（）]/g, '')
    .replace(/(景区|景点|博物馆|分店|店|餐厅|饭店|酒家)$/g, '');
}

function isSimilarName(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return left === right || left.includes(right) || right.includes(left);
}

function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const p =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
}

function parseLocation(location?: string): { lat: number; lng: number } | undefined {
  if (!location) return undefined;
  const [lngRaw, latRaw] = location.split(',');
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function shouldMerge(left: PlaceCandidate, right: PlaceCandidate): boolean {
  if (isSimilarName(left.name, right.name)) return true;
  if (left.location && right.location) {
    return haversineDistanceKm(left.location, right.location) < 0.2;
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

  return {
    id: poi.id || `${slot}-amap-${name}`,
    name,
    description: poi.type || poi.address || '来自高德 POI',
    slot,
    source: 'amap',
    confidence: 0.55,
    location: parseLocation(poi.location),
    price: undefined,
    ticketPrice: undefined,
    recommendedDuration: slot === 'core_attractions' ? '2-3小时' : undefined,
    tags: poi.type ? [poi.type] : undefined,
  };
}

async function searchAmap(slot: SlotName, intent: PlanningIntent): Promise<PlaceCandidate[]> {
  const keywords =
    slot === 'core_attractions'
      ? `${intent.destination} 景点`
      : `${intent.destination} ${intent.cuisinePreference || '本地美食'} 餐厅`;

  const type = slot === 'core_attractions' ? '110000' : '050000';

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
      .map((poi) => normalizeAmapPoi(slot, poi))
      .filter((poi): poi is PlaceCandidate => Boolean(poi));

    if (pois.length > 0) {
      return pois;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[amapFallbackService] Edge Function 查询失败，回退浏览器 SDK: ${message}`);
  }

  try {
    const sdkPois = await amapService.searchPOI(
      slot === 'core_attractions' ? '景点' : intent.cuisinePreference || '餐厅',
      intent.destination,
      type,
    );
    return sdkPois
      .map((poi) => normalizeAmapPoi(slot, poi))
      .filter((poi): poi is PlaceCandidate => Boolean(poi));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[amapFallbackService] 浏览器 AMap SDK 查询失败: ${message}`);
    return [];
  }
}

class AmapFallbackService {
  async applyFallbackIfNeeded(
    intent: PlanningIntent,
    retrieval: RagRetrievalResult,
    requestId: string,
  ): Promise<FallbackResult> {
    const slots: Record<SlotName, SlotResult> = {
      core_attractions: { ...retrieval.slots.core_attractions },
      food: { ...retrieval.slots.food },
    };

    let amapCalls = 0;

    for (const slot of retrieval.unsatisfiedSlots) {
      if (slot !== 'core_attractions' && slot !== 'food') {
        continue;
      }
      if (amapCalls >= 2) {
        break;
      }

      amapCalls += 1;
      const amapCandidates = await searchAmap(slot, intent);
      const mergedItems = mergeCandidates(slots[slot].items, amapCandidates);
      slots[slot] = {
        items: mergedItems,
        satisfied: mergedItems.length > 0,
      };
    }

    const fallbackTriggered = retrieval.unsatisfiedSlots.length > 0 && amapCalls > 0;
    console.info(`[amapFallbackService][${requestId}] fallbackTriggered=${fallbackTriggered} amapCalls=${amapCalls}`);

    return {
      slots,
      fallbackTriggered,
      amapCalls,
    };
  }
}

export const amapFallbackService = new AmapFallbackService();
