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

type AMapStatus = 'complete' | 'error' | 'no_data';

type AMapPluginName = 'AMap.PlaceSearch' | 'AMap.Walking' | 'AMap.Driving' | 'AMap.Transfer';

type AMapServicePlugin = {
  search: (...args: unknown[]) => void;
  searchNearBy?: (keyword: string, center: [number, number], radius: number, callback: (status: AMapStatus, result: any) => void) => void;
  getDetails?: (id: string, callback: (status: AMapStatus, result: any) => void) => void;
};

type AMapGlobal = {
  plugin: (plugins: AMapPluginName | AMapPluginName[], callback: () => void) => void;
  PlaceSearch: new (options?: Record<string, unknown>) => AMapServicePlugin;
  Walking: new (options?: Record<string, unknown>) => AMapServicePlugin;
  Driving: new (options?: Record<string, unknown>) => AMapServicePlugin;
  Transfer: new (options?: Record<string, unknown>) => AMapServicePlugin;
};

declare global {
  interface Window {
    AMap?: AMapGlobal;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

const AMAP_API_KEY = import.meta.env.VITE_AMAP_API_KEY || '74532255ab3d624097f260fe675838f0';
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || 'f00fa54b50d07f4fd29779d1bb8d44ef';
const CACHE_PREFIX = 'amap_poi_';
const CACHE_TTL = 86_400_000;
let amapScriptPromise: Promise<AMapGlobal> | null = null;

type CacheEntry = {
  data: AmapPOI;
  timestamp: number;
};

class AmapService implements AmapServiceInterface {
  async searchPOI(keyword: string, city: string, type?: string): Promise<AmapPOI[]> {
    const AMap = await this.loadPlugin('AMap.PlaceSearch');

    return new Promise((resolve) => {
      const placeSearch = new AMap.PlaceSearch({
        city: city || undefined,
        type,
        citylimit: Boolean(city),
        extensions: 'all',
        pageSize: 10,
      });

      placeSearch.search(keyword, (_status: AMapStatus, result: any) => {
        const pois = this.normalizePois(result?.poiList?.pois ?? []);
        this.cachePois(pois);
        resolve(pois);
      });
    });
  }

  async searchNearby(lat: number, lng: number, keyword: string, radius = 1000): Promise<AmapPOI[]> {
    const AMap = await this.loadPlugin('AMap.PlaceSearch');

    return new Promise((resolve) => {
      const placeSearch = new AMap.PlaceSearch({
        extensions: 'all',
        pageSize: 10,
      });

      placeSearch.searchNearBy?.(keyword, [lng, lat], radius, (_status: AMapStatus, result: any) => {
        const pois = this.normalizePois(result?.poiList?.pois ?? []);
        this.cachePois(pois);
        resolve(pois);
      });
    });
  }

  async getPOIDetail(poiId: string): Promise<AmapPOI | null> {
    const AMap = await this.loadPlugin('AMap.PlaceSearch');

    return new Promise((resolve) => {
      const placeSearch = new AMap.PlaceSearch({
        extensions: 'all',
      });

      placeSearch.getDetails?.(poiId, (_status: AMapStatus, result: any) => {
        const poi = this.normalizePois(result?.poiList?.pois ?? [])[0] ?? null;
        if (poi) {
          this.cachePois([poi]);
        }
        resolve(poi);
      });
    });
  }

  async getRoute(origin: string, destination: string, mode: 'walking' | 'driving' | 'transit'): Promise<AmapRouteResult | null> {
    if (mode === 'transit') {
      return null;
    }

    const pluginName: AMapPluginName = mode === 'walking' ? 'AMap.Walking' : 'AMap.Driving';
    const AMap = await this.loadPlugin(pluginName);
    const RoutePlugin = mode === 'walking' ? AMap.Walking : AMap.Driving;
    const start = this.parseCoordinate(origin);
    const end = this.parseCoordinate(destination);

    if (!start || !end) {
      return null;
    }

    return new Promise((resolve) => {
      const routeService = new RoutePlugin();
      routeService.search(start, end, (status: AMapStatus, result: any) => {
        if (status !== 'complete') {
          resolve(null);
          return;
        }

        const paths = result?.routes ?? result?.route?.paths ?? [];
        resolve({
          status: '1',
          route: {
            paths: paths.map((path: any) => ({
              distance: String(path.distance ?? ''),
              duration: String(path.time ?? path.duration ?? ''),
              steps: (path.steps ?? []).map((step: any) => ({
                instruction: String(step.instruction ?? ''),
                distance: String(step.distance ?? ''),
                duration: String(step.time ?? step.duration ?? ''),
              })),
            })),
          },
        });
      });
    });
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

  private async loadPlugin(plugin: AMapPluginName): Promise<AMapGlobal> {
    const AMap = await this.ensureAmapLoaded();

    await new Promise<void>((resolve) => {
      AMap.plugin(plugin, () => resolve());
    });

    return AMap;
  }

  private async ensureAmapLoaded(): Promise<AMapGlobal> {
    if (window.AMap) {
      return window.AMap;
    }

    if (!amapScriptPromise) {
      amapScriptPromise = new Promise<AMapGlobal>((resolve, reject) => {
        window._AMapSecurityConfig = {
          securityJsCode: AMAP_SECURITY_CODE,
        };

        const existing = document.querySelector<HTMLScriptElement>('script[data-amap-service-sdk="true"]');
        if (existing) {
          existing.addEventListener('load', () => {
            if (window.AMap) {
              resolve(window.AMap);
            } else {
              reject(new Error('AMap 未注入到 window'));
            }
          }, { once: true });
          existing.addEventListener('error', () => reject(new Error('地图脚本加载失败')), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.dataset.amapServiceSdk = 'true';
        script.async = true;
        const lang = (import.meta.env.VITE_LOCALE === 'en' ? 'en' : 'zh_cn');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_API_KEY}&lang=${lang}`;
        script.onload = () => {
          if (window.AMap) {
            resolve(window.AMap);
          } else {
            amapScriptPromise = null;
            reject(new Error('AMap 未注入到 window'));
          }
        };
        script.onerror = () => {
          amapScriptPromise = null;
          reject(new Error('地图脚本加载失败'));
        };
        document.head.appendChild(script);
      });
    }

    return amapScriptPromise;
  }

  private normalizePois(pois: any[]): AmapPOI[] {
    return pois
      .map((poi) => {
        const location = this.normalizeLocation(poi.location);
        if (!location || !poi.name) {
          return null;
        }

        return {
          id: String(poi.id ?? ''),
          name: String(poi.name),
          type: String(poi.type ?? ''),
          address: String(poi.address ?? poi.pname ?? ''),
          location,
          tel: poi.tel ? String(poi.tel) : undefined,
          rating: poi.biz_ext?.rating ? String(poi.biz_ext.rating) : undefined,
          cost: poi.biz_ext?.cost ? String(poi.biz_ext.cost) : undefined,
          opentime: poi.businessHours ? String(poi.businessHours) : poi.opentime ? String(poi.opentime) : undefined,
          photos: Array.isArray(poi.photos)
            ? poi.photos
                .map((photo: any) => {
                  const url = typeof photo === 'string' ? photo : photo?.url;
                  return url ? { url: String(url) } : null;
                })
                .filter(Boolean) as Array<{ url: string }>
            : undefined,
        };
      })
      .filter((poi): poi is AmapPOI => Boolean(poi));
  }

  private normalizeLocation(location: any): string | null {
    if (!location) {
      return null;
    }

    if (typeof location === 'string') {
      return location;
    }

    if (typeof location.lng === 'number' && typeof location.lat === 'number') {
      return `${location.lng},${location.lat}`;
    }

    if (typeof location.getLng === 'function' && typeof location.getLat === 'function') {
      return `${location.getLng()},${location.getLat()}`;
    }

    return null;
  }

  private parseCoordinate(value: string): [number, number] | null {
    const [lngStr, latStr] = value.split(',');
    const lng = Number.parseFloat(lngStr);
    const lat = Number.parseFloat(latStr);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return null;
    }

    return [lng, lat];
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
