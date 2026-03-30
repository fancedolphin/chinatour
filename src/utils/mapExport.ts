import { toast } from 'sonner@2.0.3';

// ============ Types ============

export interface ExportLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface ExportScope {
  type: 'all' | 'day';
  day?: number;
  label: string;
  locations: ExportLocation[];
}

interface ItineraryLike {
  day_number: number;
  activities: {
    name: string;
    location_lat: number | null;
    location_lng: number | null;
  }[];
}

// ============ Build Scopes ============

export function buildExportScopes(itineraries: ItineraryLike[]): ExportScope[] {
  const allLocs: ExportLocation[] = [];
  const dayScopes = itineraries
    .sort((a, b) => a.day_number - b.day_number)
    .map((itin) => {
      const locs = itin.activities
        .filter((a) => a.location_lat && a.location_lng)
        .map((a) => ({ name: a.name, lat: a.location_lat!, lng: a.location_lng! }));
      allLocs.push(...locs);
      return {
        type: 'day' as const,
        day: itin.day_number,
        label: `第${itin.day_number}天（${locs.length}个地点）`,
        locations: locs,
      };
    })
    .filter((s) => s.locations.length > 0);

  const allScope: ExportScope = {
    type: 'all',
    label: `全程路线（${allLocs.length}个地点）`,
    locations: allLocs,
  };

  if (dayScopes.length <= 1) return [allScope];
  return [allScope, ...dayScopes];
}

// ============ Per-app limits ============

export const AMAP_VIA_HARD_LIMIT = 16;
export const GOOGLE_MAPS_HARD_LIMIT = 23;
export const GOOGLE_MAPS_FREE_WARN = 9;
export const APPLE_MAPS_WARN_THRESHOLD = 20;

// ============ AMap Export (CHI-22) ============

// 坐标系说明：DB 存储来自高德 POI API 的 GCJ-02 坐标，uri.amap.com 默认 GCJ-02，无需转换

export function exportToAMap(scope: ExportScope): void {
  const locs = scope.locations;
  if (locs.length === 0) return;

  // 单点：打开地点详情
  if (locs.length === 1) {
    const url = new URL('https://uri.amap.com/marker');
    url.searchParams.set('position', `${locs[0].lng},${locs[0].lat}`);
    url.searchParams.set('name', locs[0].name);
    url.searchParams.set('callnative', '1');
    window.open(url.toString(), '_blank');
    return;
  }

  const origin = locs[0];
  const dest = locs[locs.length - 1];
  let viaPoints = locs.slice(1, -1);

  // 途经点硬截断：高德 via 最多 16 个
  if (viaPoints.length > AMAP_VIA_HARD_LIMIT) {
    viaPoints = viaPoints.slice(0, AMAP_VIA_HARD_LIMIT);
    toast.warning(`高德地图最多支持 ${AMAP_VIA_HARD_LIMIT} 个途经点，已自动截断，仅导出前 ${AMAP_VIA_HARD_LIMIT + 2} 个地点`);
  }

  const url = new URL('https://uri.amap.com/navigation');
  url.searchParams.set('from', `${origin.lng},${origin.lat},${origin.name}`);
  url.searchParams.set('to', `${dest.lng},${dest.lat},${dest.name}`);

  if (viaPoints.length > 0) {
    url.searchParams.set(
      'via',
      viaPoints.map((p) => `${p.lng},${p.lat},${p.name}`).join(';'),
    );
  }

  url.searchParams.set('mode', 'car');
  url.searchParams.set('callnative', '1');

  window.open(url.toString(), '_blank');
  toast.success('正在打开高德地图...');
}

// ============ Google Maps Export (CHI-21) ============

export function exportToGoogleMaps(scope: ExportScope): void {
  let locs = scope.locations;
  if (locs.length === 0) return;

  // 单点：打开地名搜索
  if (locs.length === 1) {
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', locs[0].name);
    url.searchParams.set('query_place_id', `${locs[0].lat},${locs[0].lng}`);
    window.open(url.toString(), '_blank');
    return;
  }

  // 硬截断：超过 25 个（起终点 + 23 途经点）
  if (locs.length > GOOGLE_MAPS_HARD_LIMIT + 2) {
    locs = locs.slice(0, GOOGLE_MAPS_HARD_LIMIT + 2);
    toast.warning(`Google Maps 最多支持 ${GOOGLE_MAPS_HARD_LIMIT} 个途经点，已截断为前 ${locs.length} 个地点`);
  }

  const origin = locs[0];
  const dest = locs[locs.length - 1];
  const waypoints = locs.slice(1, -1);

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin.name || `${origin.lat},${origin.lng}`);
  url.searchParams.set('destination', dest.name || `${dest.lat},${dest.lng}`);
  url.searchParams.set('travelmode', 'driving');
  url.searchParams.set('dir_action', 'navigate');

  if (waypoints.length > 0) {
    url.searchParams.set(
      'waypoints',
      waypoints.map((w) => `${w.lat},${w.lng}`).join('|'),
    );
  }

  window.open(url.toString(), '_blank');
  toast.success('正在打开 Google Maps...');
}

// ============ Apple Maps Export (CHI-23) ============

export function exportToAppleMaps(scope: ExportScope): void {
  const locs = scope.locations;
  if (locs.length === 0) return;

  // 单点：maps://?q=name&ll=lat,lng
  if (locs.length === 1) {
    const scheme = `maps://?q=${encodeURIComponent(locs[0].name)}&ll=${locs[0].lat},${locs[0].lng}`;
    window.location.href = scheme;
    return;
  }

  if (locs.length > APPLE_MAPS_WARN_THRESHOLD) {
    toast.warning(`途经点较多（${locs.length} 个），Apple Maps 可能无法完整显示`);
  }

  const origin = locs[0];
  const dest = locs[locs.length - 1];
  const waypoints = locs.slice(1, -1);

  // daddr 格式：wp1lat,wp1lng+to:wp2lat,wp2lng+to:...+to:destlat,destlng
  const waypointChain = [
    ...waypoints.map((w) => `${w.lat},${w.lng}`),
    `${dest.lat},${dest.lng}`,
  ].join('+to:');

  const scheme = `maps://?saddr=${origin.lat},${origin.lng}&daddr=${waypointChain}&dirflg=d`;

  window.location.href = scheme;

  // 500ms 后检查：如果页面仍在前台（maps:// 未响应），提示复制链接
  const start = Date.now();
  setTimeout(() => {
    if (Date.now() - start < 1500) {
      navigator.clipboard?.writeText(scheme).then(() => {
        toast.info('已复制 Apple Maps 链接，请在 iOS/macOS 设备上打开');
      }).catch(() => {
        toast.info('Apple Maps 仅支持 iOS / macOS 设备');
      });
    }
  }, 500);
}
