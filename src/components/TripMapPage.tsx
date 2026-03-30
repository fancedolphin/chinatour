import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, MapPin, Navigation, Heart, Map as MapIcon, Play, ExternalLink, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'motion/react';
import { tripMapService } from '../services/tripMapService';
import type { LocationPoint } from '../services/tripMapService';
import { tripService } from '../services/tripService';
import type { TripDetail } from '../services/tripService';
import { getDayColor } from './map/dayColors';
import { ExportScopeSheet } from './map/ExportScopeSheet';
import type { ExportApp } from './map/ExportScopeSheet';
import { buildExportScopes, exportToAMap, exportToGoogleMaps, exportToAppleMaps } from '../utils/mapExport';
import type { ExportScope } from '../utils/mapExport';
import { supabase } from '../utils/supabase/client';

declare global {
  interface Window {
    _AMapSecurityConfig: any;
    AMap: any;
    initAMap?: () => void;
  }
}

interface CityCluster {
  name: string;
  lat: number;
  lng: number;
  count: number;
  locations: LocationPoint[];
}

interface TripMapPageProps {
  tripId: string;
  onBack: () => void;
}

// Build city clusters from locations
function buildClusters(locations: LocationPoint[]): CityCluster[] {
  const cityMap = new Map<string, LocationPoint[]>();
  locations.forEach(loc => {
    const list = cityMap.get(loc.city) || [];
    list.push(loc);
    cityMap.set(loc.city, list);
  });

  const clusters: CityCluster[] = [];
  cityMap.forEach((locs, city) => {
    const avgLat = locs.reduce((s, l) => s + l.lat, 0) / locs.length;
    const avgLng = locs.reduce((s, l) => s + l.lng, 0) / locs.length;
    clusters.push({ name: city, lat: avgLat, lng: avgLng, count: locs.length, locations: locs });
  });
  return clusters;
}

type LayerMode = 'all' | number;

interface DayGroup {
  day: number;
  label: string;
  locations: LocationPoint[];
}

function inferDayFromLocationOrder(location: LocationPoint, validDays: Set<number>): number | null {
  const inferredDay = Math.floor(location.order / 100);
  return validDays.has(inferredDay) ? inferredDay : null;
}

// Match trip_map_locations to days, preferring encoded order_index and
// falling back to the closest activity coordinate for older data.
function assignLocationsToDays(
  locations: LocationPoint[],
  tripDetail: TripDetail | null,
): Map<string, number> {
  const locDayMap = new Map<string, number>();
  if (!tripDetail) return locDayMap;

  const validDays = new Set(tripDetail.trip_itineraries.map((itin) => itin.day_number));

  const activities = tripDetail.trip_itineraries
    .sort((a, b) => a.day_number - b.day_number)
    .flatMap((itin) =>
      (itin.activities || [])
        .filter((a) => Number.isFinite(a.location_lat) && Number.isFinite(a.location_lng))
        .map((a) => ({ dayNumber: itin.day_number, lat: a.location_lat!, lng: a.location_lng!, name: a.name })),
    );

  for (const loc of locations) {
    const inferredDay = inferDayFromLocationOrder(loc, validDays);
    if (inferredDay !== null) {
      locDayMap.set(loc.id, inferredDay);
      continue;
    }

    if (activities.length === 0) {
      continue;
    }

    let bestDist = Infinity;
    let bestDay = activities[0].dayNumber;
    for (const act of activities) {
      const dLat = loc.lat - act.lat;
      const dLng = loc.lng - act.lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < bestDist) {
        bestDist = dist;
        bestDay = act.dayNumber;
      }
    }
    locDayMap.set(loc.id, bestDay);
  }
  return locDayMap;
}

const ZOOM_THRESHOLD = 11;
const STATIC_MAP_ENDPOINT = 'https://restapi.amap.com/v3/staticmap';
const STATIC_MAP_MAX_MARKERS = 10;

type AMapConfig = {
  apiKey: string;
  securityCode: string;
};

function getEnvAMapConfig(): AMapConfig {
  return {
    apiKey: (import.meta.env.VITE_AMAP_API_KEY as string) || '',
    securityCode: (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || '',
  };
}

async function resolveAMapConfig(): Promise<AMapConfig> {
  try {
    const { data, error } = await supabase.functions.invoke('amap-config');
    if (error || !data?.key) {
      throw new Error(error?.message || 'missing key');
    }

    return {
      apiKey: data.key,
      securityCode: data.securityCode || '',
    };
  } catch {
    return getEnvAMapConfig();
  }
}

function formatLngLat(lng: number, lat: number): string {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function getStaticMapSize(container: HTMLDivElement | null): string {
  const fallbackWidth = 960;
  const fallbackHeight = 640;

  let width = Math.round(container?.clientWidth || fallbackWidth);
  let height = Math.round(container?.clientHeight || fallbackHeight);

  const scale = Math.min(1, 1024 / Math.max(width, 1), 1024 / Math.max(height, 1));
  width = Math.max(320, Math.round(width * scale));
  height = Math.max(320, Math.round(height * scale));

  return `${width}*${height}`;
}

function getStaticMarkerLabel(location: LocationPoint, total: number): string {
  if (location.order === 1) {
    return '起';
  }

  if (location.order === total) {
    return '终';
  }

  if (location.order <= 9) {
    return String(location.order);
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[(location.order - 10) % alphabet.length] || '途';
}

function selectStaticMapMarkers(sortedLocations: LocationPoint[]): LocationPoint[] {
  if (sortedLocations.length <= STATIC_MAP_MAX_MARKERS) {
    return sortedLocations;
  }

  const indexes = new Set<number>([0, sortedLocations.length - 1]);
  const middleSlots = STATIC_MAP_MAX_MARKERS - 2;

  for (let i = 0; i < middleSlots; i += 1) {
    const ratio = (i + 1) / (middleSlots + 1);
    const index = Math.round(ratio * (sortedLocations.length - 1));
    indexes.add(Math.min(sortedLocations.length - 2, Math.max(1, index)));
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => sortedLocations[index]);
}

function buildStaticMapUrl(
  sortedLocations: LocationPoint[],
  apiKey: string,
  size: string,
): string {
  const params = new URLSearchParams();
  params.set('key', apiKey);
  params.set('size', size);
  params.set('scale', '1');

  const markers = selectStaticMapMarkers(sortedLocations)
    .map((location) => {
      const color = location.order === 1
        ? '0x22C55E'
        : location.order === sortedLocations.length
          ? '0x9333EA'
          : '0xEF4444';
      const markerStyle = `mid,${color},${getStaticMarkerLabel(location, sortedLocations.length)}`;
      return `${markerStyle}:${formatLngLat(location.lng, location.lat)}`;
    })
    .join('|');

  if (markers) {
    params.set('markers', markers);
  }

  if (sortedLocations.length >= 2) {
    const path = sortedLocations.map((location) => formatLngLat(location.lng, location.lat)).join(';');
    params.set('paths', `8,0xEF4444,0.9,,:${path}`);
  }

  return `${STATIC_MAP_ENDPOINT}?${params.toString()}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

// --- Main Component ---
export function TripMapPage({ tripId, onBack }: TripMapPageProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(8);
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const stepMarkersRef = useRef<any[]>([]);
  const [showExportSheet, setShowExportSheet] = useState(false);

  // Day layer state
  const [activeLayer, setActiveLayer] = useState<LayerMode>('all');
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);

  // Fetch trip detail for itineraries / day grouping
  useEffect(() => {
    console.log('[TripMapPage] 开始加载行程详情, tripId:', tripId);
    tripService.getTripDetail(tripId)
      .then((detail) => {
        console.log('[TripMapPage] 行程详情加载成功, itineraries:', detail.trip_itineraries.length,
          'activities:', detail.trip_itineraries.map(i => i.activities?.length ?? 0));
        setTripDetail(detail);
      })
      .catch((err) => console.error('[TripMapPage] 加载行程详情失败（图层功能降级）', err));
  }, [tripId]);

  // Build day groups from locations + itineraries
  const locDayMap = useMemo(() => {
    const map = assignLocationsToDays(locations, tripDetail);
    if (map.size > 0) {
      console.log('[TripMapPage] locDayMap:', Object.fromEntries(map));
    }
    return map;
  }, [locations, tripDetail]);

  const itineraryDays = useMemo(() => {
    if (!tripDetail) return [];
    return Array.from(
      new Set(
        [...tripDetail.trip_itineraries]
          .sort((a, b) => a.day_number - b.day_number)
          .map((itin) => itin.day_number),
      ),
    );
  }, [tripDetail]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    if (!tripDetail) {
      console.log('[TripMapPage] tripDetail is null, dayGroups=[]');
      return [];
    }
    const itineraries = [...tripDetail.trip_itineraries].sort((a, b) => a.day_number - b.day_number);
    const groups = itineraries
      .map((itin) => ({
        day: itin.day_number,
        label: itin.theme ?? `第${itin.day_number}天`,
        locations: locations.filter((loc) => locDayMap.get(loc.id) === itin.day_number),
      }));
    console.log('[TripMapPage] dayGroups:', groups.map(g => ({ day: g.day, count: g.locations.length })));
    return groups;
  }, [tripDetail, locations, locDayMap]);

  const showOverviewTab = itineraryDays.length > 1;

  // Export scopes derived from trip detail
  const exportScopes = useMemo(
    () => (tripDetail ? buildExportScopes(tripDetail.trip_itineraries) : []),
    [tripDetail],
  );

  const initialScopeIndex = useMemo(() => {
    if (activeLayer === 'all') return 0;
    const idx = exportScopes.findIndex((s) => s.type === 'day' && s.day === activeLayer);
    return idx >= 0 ? idx : 0;
  }, [activeLayer, exportScopes]);

  const handleExport = useCallback((scope: ExportScope, app: ExportApp) => {
    if (app === 'amap') exportToAMap(scope);
    else if (app === 'google') exportToGoogleMaps(scope);
    else exportToAppleMaps(scope);
    setShowExportSheet(false);
  }, []);

  // Visible locations filtered by active layer
  const visibleLocations = useMemo(() => {
    if (activeLayer === 'all' || dayGroups.length === 0) return locations;
    const group = dayGroups.find((g) => g.day === activeLayer);
    return group ? group.locations : locations;
  }, [activeLayer, dayGroups, locations]);

  // Fetch locations from database
  const loadLocations = useCallback(() => {
    setLocationsError(null);
    tripMapService.getLocationsByTripId(tripId)
      .then(setLocations)
      .catch((err) => {
        console.error('[TripMapPage] 加载地点失败', err);
        setLocationsError('加载地点数据失败');
        toast.error('加载地点数据失败');
      });
  }, [tripId]);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  // Load AMap Script via Edge Function
  useEffect(() => {
    if (window.AMap) {
      setMapLoaded(true);
      return;
    }

    (async () => {
      const { apiKey, securityCode } = await resolveAMapConfig();
      if (!apiKey) {
        setConfigError('未配置高德地图 API Key');
        return;
      }

      window._AMapSecurityConfig = { securityJsCode: securityCode };
      window.initAMap = () => setMapLoaded(true);

      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${apiKey}&callback=initAMap`;
      script.async = true;
      script.onerror = () => { toast.error('地图加载失败'); setConfigError('地图脚本加载失败'); };
      document.body.appendChild(script);
    })();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapRef.current) return;
    try {
      const map = new window.AMap.Map(mapContainerRef.current, {
        zoom: 8,
        center: [116.5, 39.5], // Beijing-Tianjin area
        mapStyle: 'amap://styles/normal',
      });
      mapRef.current = map;

      map.on('zoomend', () => {
        const z = map.getZoom();
        setZoomLevel(z);
      });

      setZoomLevel(8);
    } catch (e) {
      console.error('Map init failed', e);
    }
  }, [mapLoaded]);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => { try { m.setMap(null); } catch { } });
    markersRef.current = [];
  }, []);

  // Clear route overlays
  const clearRoute = useCallback(() => {
    polylinesRef.current.forEach(p => { try { p.setMap(null); } catch { } });
    polylinesRef.current = [];
  }, []);

  // Clear step markers only
  const clearStepMarkers = useCallback(() => {
    stepMarkersRef.current.forEach(m => { try { m.setMap(null); } catch { } });
    stepMarkersRef.current = [];
  }, []);

  // Render route polyline (always visible on map)
  const renderRoutePolyline = useCallback(() => {
    if (!mapRef.current || !window.AMap) return;

    // Determine which groups to draw
    const isOverview = activeLayer === 'all';
    const groupsToDraw = dayGroups.length > 0
      ? (isOverview ? dayGroups : dayGroups.filter((g) => g.day === activeLayer))
      : [{ day: 0, label: '', locations: visibleLocations }];

    groupsToDraw.forEach((group) => {
      const sorted = [...group.locations].sort((a, b) => a.order - b.order);
      if (sorted.length < 2) return;

      const path = sorted.map(loc => new window.AMap.LngLat(loc.lng, loc.lat));
      const color = dayGroups.length > 0 ? getDayColor(group.day - 1) : '#ef4444';
      try {
        const polyline = new window.AMap.Polyline({
          path,
          strokeColor: color,
          strokeWeight: isOverview ? 2 : 4,
          strokeStyle: isOverview ? 'dashed' : 'solid',
          strokeDasharray: isOverview ? [10, 6] : [0, 0],
          strokeOpacity: isOverview ? 0.7 : 0.9,
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 50,
        });
        polyline.setMap(mapRef.current);
        polylinesRef.current.push(polyline);
      } catch (e) {
        console.warn('Polyline failed', e);
      }
    });
  }, [visibleLocations, activeLayer, dayGroups]);

  // Render numbered step markers (only when zoomed in)
  const renderStepMarkers = useCallback(() => {
    if (!mapRef.current || !window.AMap) return;
    clearStepMarkers();

    const sorted = [...visibleLocations].sort((a, b) => a.order - b.order);

    sorted.forEach((loc) => {
      const isFirst = loc.order === 1;
      const isLast = loc.order === sorted.length;
      const bgColor = isFirst ? '#22c55e' : isLast ? '#9333ea' : '#ef4444';
      const label = isFirst ? '起' : isLast ? '终' : `${loc.order}`;

      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none;';
      el.innerHTML = `
        <div style="width:28px;height:28px;border-radius:50%;background:${bgColor};color:white;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">
          ${label}
        </div>
      `;

      try {
        const marker = new window.AMap.Marker({
          position: [loc.lng, loc.lat],
          content: el,
          offset: new window.AMap.Pixel(-14, -14),
          zIndex: 110,
        });
        marker.setMap(mapRef.current);
        stepMarkersRef.current.push(marker);
      } catch { }
    });
  }, [clearStepMarkers, visibleLocations]);

  // Render polyline once map loads (always visible) — re-render when locations/layer change
  useEffect(() => {
    if (!mapRef.current || !window.AMap || !mapLoaded) return;
    if (selectedLocation) return;
    clearRoute();
    renderRoutePolyline();
  }, [mapLoaded, selectedLocation, visibleLocations, activeLayer, renderRoutePolyline, clearRoute]);

  // Fit map to locations when data first loads
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || locations.length === 0) return;
    if (hasFittedRef.current) return;
    hasFittedRef.current = true;
    setTimeout(() => {
      try { mapRef.current?.setFitView(null, false, [60, 60, 60, 60]); } catch { }
    }, 200);
  }, [mapLoaded, locations]);

  // Show/hide step markers based on zoom level
  useEffect(() => {
    if (!mapRef.current || !window.AMap || !mapLoaded) return;
    if (selectedLocation) return;

    if (zoomLevel >= ZOOM_THRESHOLD) {
      renderStepMarkers();
    } else {
      clearStepMarkers();
    }
  }, [zoomLevel, mapLoaded, selectedLocation, visibleLocations, activeLayer, renderStepMarkers, clearStepMarkers]);

  // Render cluster markers (zoomed out)
  const renderClusters = useCallback(() => {
    if (!mapRef.current || !window.AMap) return;
    clearMarkers();

    buildClusters(visibleLocations).forEach(cluster => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
      el.innerHTML = `
        <div style="display:flex;align-items:center;background:linear-gradient(135deg,#ef4444,#ec4899);color:white;border-radius:10px;padding:6px 14px 6px 10px;font-weight:700;font-size:14px;box-shadow:0 2px 12px rgba(239,68,68,0.4);gap:6px;">
          <span style="background:rgba(255,255,255,0.3);border-radius:6px;padding:2px 8px;font-size:15px;min-width:22px;text-align:center;">${cluster.count}</span>
          <span>${cluster.name}</span>
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #ef4444;margin-top:-1px;"></div>
      `;

      try {
        const marker = new window.AMap.Marker({
          position: [cluster.lng, cluster.lat],
          content: el,
          offset: new window.AMap.Pixel(-50, -50),
          zIndex: 100,
        });

        marker.on('click', () => {
          mapRef.current.setZoomAndCenter(13, [cluster.lng, cluster.lat]);
        });

        marker.setMap(mapRef.current);
        markersRef.current.push(marker);
      } catch (e) {
        console.warn('Cluster marker failed', e);
      }
    });
  }, [clearMarkers, visibleLocations]);

  // Render individual location markers (zoomed in)
  const renderLocationMarkers = useCallback(() => {
    if (!mapRef.current || !window.AMap) return;
    clearMarkers();

    // Only show locations in the current viewport
    const bounds = mapRef.current.getBounds();
    const viewportLocations = visibleLocations.filter(loc => {
      if (!bounds) return true;
      try {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        return loc.lat >= sw.getLat() && loc.lat <= ne.getLat() &&
          loc.lng >= sw.getLng() && loc.lng <= ne.getLng();
      } catch { return true; }
    });

    viewportLocations.forEach(loc => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';

      const recHtml = loc.articles.slice(0, 2).map(a => `
        <div style="display:flex;align-items:center;gap:4px;">
          <img src="${a.authorAvatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;border:1px solid #fecdd3;" />
          <span style="font-size:11px;color:#9f1239;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.authorName}</span>
        </div>
      `).join('');

      el.innerHTML = `
        <div style="background:#fff1f2;border:2px solid #fb7185;border-radius:12px;padding:10px 12px;min-width:120px;box-shadow:0 2px 12px rgba(244,63,94,0.25);">
          <div style="font-weight:700;font-size:14px;color:#1a1a1a;margin-bottom:4px;">${loc.name}</div>
          <div style="display:flex;align-items:center;gap:3px;margin-bottom:6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-size:12px;color:#ef4444;font-weight:600;">${loc.distance ?? ''}km</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${recHtml}
          </div>
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #fb7185;margin-top:-1px;"></div>
      `;

      try {
        const marker = new window.AMap.Marker({
          position: [loc.lng, loc.lat],
          content: el,
          offset: new window.AMap.Pixel(-60, -120),
          zIndex: 80,
        });

        marker.on('click', () => {
          openLocationDetail(loc);
        });

        marker.setMap(mapRef.current);
        markersRef.current.push(marker);
      } catch (e) {
        console.warn('Location marker failed', e);
      }
    });

    // Also add small pin markers
    visibleLocations.forEach(loc => {
      const pinEl = document.createElement('div');
      pinEl.innerHTML = `
        <div style="width:12px;height:12px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
      `;
      try {
        const pin = new window.AMap.Marker({
          position: [loc.lng, loc.lat],
          content: pinEl,
          offset: new window.AMap.Pixel(-6, -6),
          zIndex: 60,
        });
        pin.setMap(mapRef.current);
        markersRef.current.push(pin);
      } catch { }
    });
  }, [clearMarkers, visibleLocations]);

  // Update markers based on zoom level
  useEffect(() => {
    if (!mapRef.current || !window.AMap) return;
    if (selectedLocation) return; // Don't update markers when detail view is open

    if (zoomLevel < ZOOM_THRESHOLD) {
      renderClusters();
    } else {
      renderLocationMarkers();
    }
  }, [zoomLevel, mapLoaded, selectedLocation, visibleLocations, activeLayer, renderClusters, renderLocationMarkers]);

  // Fit bounds when layer changes
  useEffect(() => {
    if (!mapRef.current || visibleLocations.length === 0) return;
    setTimeout(() => {
      try { mapRef.current?.setFitView(null, false, [60, 60, 60, 60]); } catch { }
    }, 100);
  }, [activeLayer]);

  // Open location detail with loading animation
  const openLocationDetail = useCallback((loc: LocationPoint) => {
    setDetailLoading(true);
    setSelectedLocation(loc);
    setIsFavorited(false);
    // Simulate loading
    setTimeout(() => setDetailLoading(false), 1200);
  }, []);

  // Close detail and return to map
  const closeDetail = useCallback(() => {
    setSelectedLocation(null);
    setDetailLoading(false);
  }, []);

  // 单天行程自动切到该天
  useEffect(() => {
    if (itineraryDays.length === 1 && activeLayer === 'all') {
      setActiveLayer(itineraryDays[0]);
    }
  }, [itineraryDays, activeLayer]);

  // --- Render ---
  const showMapOverlay = !selectedLocation;
  const showDayBar = showMapOverlay && itineraryDays.length > 0;

  console.log('[TripMapPage] daybar check', {
    mapLoaded,
    selectedLocation: !!selectedLocation,
    itineraryDays,
    itineraryDaysLength: itineraryDays.length,
    showDayBar,
  });

  return (
  <>
    <div className="fixed inset-0 z-[60] bg-gray-50 overflow-hidden">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Locations Error Overlay */}
      {locationsError && mapLoaded && !selectedLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-white rounded-xl px-4 py-3 shadow-lg border border-red-100 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-gray-700">{locationsError}</span>
          <Button variant="outline" size="sm" onClick={loadLocations}>重试</Button>
        </div>
      )}

      {/* Map Loading State */}
      {!mapLoaded && !selectedLocation && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            {configError ? (
              <>
                <MapPin className="w-10 h-10 text-gray-400 mb-4" />
                <div className="text-gray-700 font-medium mb-2">地图配置错误</div>
                <div className="text-gray-400 text-sm text-center max-w-xs">
                  请确保已设置 <code className="bg-gray-100 px-1 rounded">AMAP_JS_API_KEY</code> 和 <code className="bg-gray-100 px-1 rounded">AMAP_SECURITY_CODE</code>
                </div>
                <Button variant="outline" className="mt-4" onClick={onBack}>返回</Button>
              </>
            ) : (
              <div className="animate-pulse flex flex-col items-center">
                <MapPin className="w-10 h-10 text-red-500 mb-4" />
                <div className="text-gray-500 font-medium">正在加载高德地图...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Nav + Day Bar + Export + Legend — all rendered via portal below */}

      {/* Detail View Overlay */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-0 z-50 flex flex-col"
          >
            {detailLoading ? (
              /* Loading State */
              <div className="flex-1 bg-red-50/60 flex flex-col items-center justify-start pt-20">
                {/* Spinner */}
                <div className="relative w-14 h-14 mb-4">
                  <svg className="animate-spin" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="28" r="24" stroke="#fecdd3" strokeWidth="4" />
                    <path
                      d="M52 28a24 24 0 0 0-24-24"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="text-gray-800 font-semibold text-lg">信息载入中...</div>

                {/* Bottom Map Button */}
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <button
                    onClick={closeDetail}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-200 border-4 border-white"
                  >
                    <MapIcon className="w-7 h-7 text-white" />
                  </button>
                  <span className="text-sm text-gray-600 mt-2 font-medium">地图</span>
                  
                </div>
              </div>
            ) : (
              /* Detail Content - Image 3 */
              <div className="flex-1 bg-white overflow-y-auto">
                {/* Close Button */}
                <button
                  onClick={closeDetail}
                  className="absolute top-12 left-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>

                {/* Header Section */}
                <div className="px-5 pt-14 pb-5 bg-gradient-to-b from-red-50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedLocation.name}</h1>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>{selectedLocation.city} · {selectedLocation.district}</span>
                      </div>
                      <div className="text-gray-800 font-medium text-base mb-3">
                        {selectedLocation.address}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Navigation className="w-3.5 h-3.5 text-red-500" />
                        <span>距我 {selectedLocation.distance} 公里</span>
                      </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex flex-col items-center gap-4 ml-4">
                      {/* Dianping Icon */}
                      <button
                        className="flex flex-col items-center"
                        onClick={() => toast.success('即将跳转大众点评')}
                      >
                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                          <ExternalLink className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">大众点评</span>
                      </button>

                      {/* Favorite */}
                      <button
                        className="flex flex-col items-center"
                        onClick={() => {
                          setIsFavorited(!isFavorited);
                          toast.success(isFavorited ? '已取消收藏' : '已加入收藏');
                        }}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md border ${isFavorited ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                          <Heart className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">收藏</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-2 bg-gray-50" />

                {/* Videos Section */}
                {selectedLocation.videos.length > 0 && (
                  <div className="px-5 py-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">探店视频</h2>
                    </div>

                    <div className="flex flex-col gap-4">
                      {selectedLocation.videos.map((video, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                          onClick={() => toast.success('即将播放视频')}
                        >
                          {/* Thumbnail */}
                          <div className="relative w-28 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                                <Play className="w-4 h-4 text-gray-800 fill-gray-800 ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <img
                                src={video.authorAvatar}
                                alt={video.authorName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="text-xs text-gray-600 font-medium">{video.authorName}</span>
                              <span className="text-xs text-gray-400">{video.date}</span>
                              {/* Platform icon */}
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${video.platform === 'douyin' ? 'bg-black' : 'bg-red-500'}`}>
                                <span className="text-white text-[8px] font-bold">
                                  {video.platform === 'douyin' ? '抖' : '红'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-800 line-clamp-2 leading-snug">
                              {video.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                {selectedLocation.articles.length > 0 && (
                  <>
                    <div className="h-2 bg-gray-50" />
                    <div className="px-5 py-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">红</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">相关推荐文章</h2>
                        <span className="text-xs text-gray-400 ml-auto">来自小红书</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {selectedLocation.articles.map((article, idx) => (
                          <a
                            key={idx}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex gap-3 p-3 bg-red-50/60 rounded-xl hover:bg-red-50 transition-colors cursor-pointer group"
                          >
                            {/* Article Cover */}
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={article.cover}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                <span className="text-white text-[7px] font-bold">红</span>
                              </div>
                            </div>

                            {/* Article Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                              <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                                {article.title}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1.5">
                                  <img
                                    src={article.authorAvatar}
                                    alt={article.authorName}
                                    className="w-5 h-5 rounded-full object-cover border border-red-200"
                                  />
                                  <span className="text-xs text-gray-500">{article.authorName}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <Heart className="w-3 h-3" />
                                  <span>{article.likes >= 1000 ? `${(article.likes / 1000).toFixed(1)}k` : article.likes}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <ExternalLink className="w-3 h-3 text-red-400" />
                                <span className="text-[11px] text-red-400">打开小红书查看</span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Bottom spacer for the map button */}
                <div className="h-32" />

                {/* Bottom Map Button */}
                <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                  <button
                    onClick={closeDetail}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-300/50 border-4 border-white active:scale-95 transition-transform"
                  >
                    <MapIcon className="w-7 h-7 text-white" />
                  </button>
                  <span className="text-sm text-gray-600 mt-1.5 font-medium bg-white/80 px-3 py-0.5 rounded-full backdrop-blur-sm">返回地图</span>
                
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Scope Sheet */}
      <AnimatePresence>
        {showExportSheet && exportScopes.length > 0 && (
          <ExportScopeSheet
            scopes={exportScopes}
            initialScopeIndex={initialScopeIndex}
            onExport={handleExport}
            onClose={() => setShowExportSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* Hide Scrollbar Style */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>

    {/* ── Map HUD Overlay ── All floating UI portaled to document.body */}
    {showMapOverlay && mapLoaded && createPortal(
      <>
        {/* Top Nav */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2147483646,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ padding: '48px 16px 12px', display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white"
              onClick={onBack}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '16px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {zoomLevel < ZOOM_THRESHOLD ? '城市概览' : '探索地点'}
            </div>
          </div>
        </div>

        {/* Day Layer Tab Bar */}
        {showDayBar && (
          <div
            style={{
              position: 'fixed',
              top: '96px',
              left: 0,
              right: 0,
              zIndex: 2147483647,
              display: 'flex',
              justifyContent: 'center',
              padding: '0 12px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '4px',
                background: 'rgba(255,255,255,0.96)',
                borderRadius: '9999px',
                padding: '6px 8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                maxWidth: 'calc(100vw - 24px)',
                overflowX: 'auto',
                pointerEvents: 'auto',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {showOverviewTab && (
                <button
                  onClick={() => setActiveLayer('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeLayer === 'all' ? '#1f2937' : 'transparent',
                    color: activeLayer === 'all' ? '#fff' : '#4b5563',
                  }}
                >
                  总览
                </button>
              )}

              {itineraryDays.map((dayNumber) => {
                const color = getDayColor(dayNumber - 1);
                const active = activeLayer === dayNumber || (!showOverviewTab && activeLayer === 'all');
                return (
                  <button
                    key={dayNumber}
                    onClick={() => setActiveLayer(dayNumber)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? color : 'transparent',
                      color: active ? '#fff' : '#4b5563',
                    }}
                  >
                    第{dayNumber}天
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Export Button */}
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '16px',
            zIndex: 2147483646,
          }}
        >
          <button
            onClick={() => setShowExportSheet(true)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #ef4444, #ec4899)',
              boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
            }}
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Route Legend */}
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '16px',
            zIndex: 2147483646,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '10px 12px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>行程路线</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>起</span>
              </div>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>出发地</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>2</span>
              </div>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>途经点</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>终</span>
              </div>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>终点</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '16px', borderTop: '2px dashed #f87171' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>行程路线</span>
            </div>
          </div>
        </div>
      </>,
      document.body,
    )}
  </>
  );
}
