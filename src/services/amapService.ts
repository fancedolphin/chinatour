export interface AmapPOI {
  id: string;
  name: string;
  type: string;
  address: string;
  location: string; // "lng,lat"
  tel?: string;
  rating?: string;
  cost?: string;
  opentime?: string;
  photos?: Array<{ url: string }>;
}

export interface AmapSearchResult {
  status: string;
  count: string;
  pois: AmapPOI[];
}

export interface AmapRouteResult {
  status: string;
  route: {
    paths: Array<{
      distance: string;
      duration: string;
      steps: Array<{
        instruction: string;
        distance: string;
        duration: string;
      }>;
    }>;
  };
}

export interface AmapServiceInterface {
  searchPOI(keyword: string, city: string, type?: string): Promise<AmapPOI[]>;
  searchNearby(lat: number, lng: number, keyword: string, radius?: number): Promise<AmapPOI[]>;
  getPOIDetail(poiId: string): Promise<AmapPOI | null>;
  getRoute(origin: string, destination: string, mode: 'walking' | 'driving' | 'transit'): Promise<AmapRouteResult | null>;
  getCachedPOI(key: string): AmapPOI | null;
  setCachedPOI(key: string, poi: AmapPOI): void;
}

export enum AmapErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_KEY = 'INVALID_KEY',
  NO_RESULTS = 'NO_RESULTS',
  UNKNOWN = 'UNKNOWN',
}

export function classifyError(error: any): AmapErrorType {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return AmapErrorType.NETWORK_ERROR;
  if (error?.response?.status === 429) return AmapErrorType.RATE_LIMIT;
  if (error?.response?.data?.infocode === '10001') return AmapErrorType.INVALID_KEY;
  if (error?.response?.data?.count === '0') return AmapErrorType.NO_RESULTS;
  return AmapErrorType.UNKNOWN;
}

export function shouldRetry(errorType: AmapErrorType): boolean {
  return errorType === AmapErrorType.NETWORK_ERROR || errorType === AmapErrorType.RATE_LIMIT;
}

export function getFallbackData(activity: any): any {
  return {
    name: activity.name,
    description: activity.description,
    time: activity.time,
    type: activity.type,
    coordinates: activity.geoCoordinates,
    dataSource: 'ai',
  };
}

const AMAP_API_KEY = import.meta.env.VITE_AMAP_API_KEY as string;
const AMAP_BASE_URL = 'https://restapi.amap.com/v3/';
const CACHE_PREFIX = 'amap_poi_';
const CACHE_TTL = 86_400_000;

type CacheEntry = {
  data: AmapPOI;
  timestamp: number;
};

class AmapService implements AmapServiceInterface {
  async searchPOI(keyword: string, city: string, type?: string): Promise<AmapPOI[]> {
    const result = await this.fetchFromAmap<AmapSearchResult>('place/text', {
      keywords: keyword,
      city,
      types: type,
      citylimit: 'true',
    });

    if (!result || result.status !== '1' || result.count === '0') {
      return [];
    }

    this.cachePois(result.pois);
    return result.pois;
  }

  async searchNearby(lat: number, lng: number, keyword: string, radius = 1000): Promise<AmapPOI[]> {
    const result = await this.fetchFromAmap<AmapSearchResult>('place/around', {
      location: `${lng},${lat}`,
      keywords: keyword,
      radius,
      sortrule: 'distance',
    });

    if (!result || result.status !== '1' || result.count === '0') {
      return [];
    }

    this.cachePois(result.pois);
    return result.pois;
  }

  async getPOIDetail(poiId: string): Promise<AmapPOI | null> {
    const result = await this.fetchFromAmap<AmapSearchResult>('place/detail', {
      id: poiId,
      extensions: 'all',
    });

    if (!result || result.status !== '1' || !result.pois || result.pois.length === 0) {
      return null;
    }

    const poi = result.pois[0];
    this.cachePois([poi]);
    return poi;
  }

  async getRoute(origin: string, destination: string, mode: 'walking' | 'driving' | 'transit'): Promise<AmapRouteResult | null> {
    const endpoint = mode === 'transit' ? 'direction/transit/integrated' : `direction/${mode}`;
    const result = await this.fetchFromAmap<AmapRouteResult>(endpoint, {
      origin,
      destination,
    });

    if (!result || result.status !== '1') {
      return null;
    }

    return result;
  }

  getCachedPOI(key: string): AmapPOI | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cached) as CacheEntry;
      const isExpired = Date.now() - timestamp > CACHE_TTL;

      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[AmapService] Failed to read cache', error);
      return null;
    }
  }

  setCachedPOI(key: string, poi: AmapPOI): void {
    const payload: CacheEntry = {
      data: poi,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      console.error('[AmapService] Failed to write cache', error);
    }
  }

  private buildUrl(path: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(path, AMAP_BASE_URL);
    const searchParams = new URLSearchParams({ key: AMAP_API_KEY });

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      searchParams.set(key, String(value));
    });

    url.search = searchParams.toString();
    return url.toString();
  }

  private async fetchFromAmap<T>(
    path: string,
    params: Record<string, string | number | undefined>,
    retries = 1,
  ): Promise<T | null> {
    const url = this.buildUrl(path, params);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.status !== '1') {
        const errorType = classifyError({ response: { status: response.status, data } });
        if (shouldRetry(errorType) && retries > 0) {
          return this.fetchFromAmap<T>(path, params, retries - 1);
        }
        console.error(`[AmapService] Request failed: ${errorType}`, data);
        return null;
      }

      return data as T;
    } catch (error) {
      const errorType = classifyError(error);
      if (shouldRetry(errorType) && retries > 0) {
        return this.fetchFromAmap<T>(path, params, retries - 1);
      }
      console.error(`[AmapService] Request error: ${errorType}`, error);
      return null;
    }
  }

  private cachePois(pois: AmapPOI[]): void {
    pois.forEach((poi) => {
      const coords = this.parseLocation(poi.location);
      if (!coords) {
        return;
      }
      const cacheKey = this.buildCacheKey(poi.name, coords.lat, coords.lng);
      this.setCachedPOI(cacheKey, poi);
    });
  }

  private buildCacheKey(name: string, lat: string | number, lng: string | number): string {
    return `${CACHE_PREFIX}${name}_${lat}_${lng}`;
  }

  private parseLocation(location: string): { lat: string; lng: string } | null {
    const [lng, lat] = location.split(',');
    if (!lat || !lng) {
      return null;
    }
    return { lat, lng };
  }
}

export const amapService: AmapServiceInterface = new AmapService();
