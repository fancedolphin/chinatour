import { supabase } from '@/utils/supabase/client';
import type { Tables } from '@/types/database';

type TripMapLocationRow = Tables<'trip_map_locations'>;
type TripMapArticleRow = Tables<'location_articles'>;
type TripMapVideoRow = Tables<'location_videos'>;

export type VideoPlatform = 'douyin' | 'xiaohongshu' | 'bilibili';

export type TripMapArticle = {
  id: string;
  title: string;
  cover: string;
  authorAvatar: string;
  authorName: string;
  likes: number;
  url: string;
};

export type TripMapVideo = {
  id: string;
  thumbnail: string;
  authorAvatar: string;
  authorName: string;
  date: string;
  platform: VideoPlatform;
  title: string;
  videoUrl?: string;
  altPlatform?: VideoPlatform;
  altVideoUrl?: string;
};

export type LocationPoint = {
  id: string;
  name: string;
  nameEn?: string | null;
  city: string;
  cityEn?: string | null;
  district: string;
  districtEn?: string | null;
  address: string;
  addressEn?: string | null;
  lat: number;
  lng: number;
  distance?: string;
  type: TripMapLocationRow['type'];
  order: number;
  articles: TripMapArticle[];
  videos: TripMapVideo[];
  description?: string;
  dianpingUrl?: string;
};

type RestaurantCatalogRow = {
  id: string;
  name: string;
  dianping_url: string | null;
  description: string | null;
  destinations: { name: string } | { name: string }[] | null;
};

type AttractionCatalogRow = {
  name: string;
  description: string | null;
  destinations: { name: string } | { name: string }[] | null;
};

type InfluencerMini = { name: string | null; header_pic: string | null };

type RestaurantMediaRow = {
  id: string;
  restaurant_id: string;
  platform: string;
  link_url: string;
  thumbnail: string | null;
  title: string | null;
  upload_date: string | null;
  alt_platform: string | null;
  alt_link_url: string | null;
  sort: number;
  restaurant_media_influencers: Array<{ influencers: InfluencerMini | InfluencerMini[] | null }> | null;
};

const mapArticle = (article: TripMapArticleRow): TripMapArticle => ({
  id: article.id,
  title: article.title,
  cover: article.cover ?? '',
  authorAvatar: article.author_avatar ?? '',
  authorName: article.author_name ?? '',
  likes: article.likes ?? 0,
  url: article.url ?? '',
});

const mapLocationVideo = (video: TripMapVideoRow): TripMapVideo => ({
  id: video.id,
  thumbnail: video.thumbnail ?? '',
  authorAvatar: video.author_avatar ?? '',
  authorName: video.author_name ?? '',
  date: video.date ?? '',
  platform: video.platform as VideoPlatform,
  title: video.title ?? '',
});

const firstInfluencer = (row: RestaurantMediaRow): InfluencerMini | null => {
  const links = row.restaurant_media_influencers ?? [];
  for (const link of links) {
    const inf = Array.isArray(link.influencers) ? link.influencers[0] : link.influencers;
    if (inf && (inf.name || inf.header_pic)) return inf;
  }
  return null;
};

const mapRestaurantMedia = (row: RestaurantMediaRow): TripMapVideo => {
  const influencer = firstInfluencer(row);
  return {
    id: row.id,
    thumbnail: row.thumbnail ?? '',
    authorAvatar: influencer?.header_pic ?? '',
    authorName: influencer?.name ?? '',
    date: row.upload_date ?? '',
    platform: (row.platform as VideoPlatform) ?? 'douyin',
    title: row.title ?? '',
    videoUrl: row.link_url,
    altPlatform: (row.alt_platform as VideoPlatform | null) ?? undefined,
    altVideoUrl: row.alt_link_url ?? undefined,
  };
};

const pickDestinationName = (value: RestaurantCatalogRow['destinations']): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name ?? null;
};

// Normalize city to strip "市" suffix so "成都" and "成都市" share the same key.
const normalizeCity = (city: string): string => {
  const t = city.trim();
  return t.endsWith('市') ? t.slice(0, -1) : t;
};

const keyOf = (name: string, city: string): string => `${name}||${normalizeCity(city)}`;

// Build an Amap deep link for restaurants that lack a curated Dianping URL —
// gives users a working "open externally" target instead of a blank panel.
// Schema: https://uri.amap.com/marker?position=lng,lat&name=<encoded>
const buildAmapMarkerUrl = (name: string, lat: number, lng: number): string => {
  const params = new URLSearchParams({
    position: `${lng},${lat}`,
    name,
    src: 'chinaview',
  });
  return `https://uri.amap.com/marker?${params.toString()}`;
};

const mapLocation = (
  location: TripMapLocationRow,
  articles: TripMapArticleRow[],
  videos: TripMapVideoRow[],
  restaurantByKey: Map<string, { id: string; dianpingUrl: string | null; description: string | null }>,
  attractionByKey: Map<string, { description: string | null }>,
  mediaByRestaurantId: Map<string, RestaurantMediaRow[]>,
): LocationPoint => {
  const locationArticles = articles.filter((a) => a.location_id === location.id).map(mapArticle);
  const legacyVideos = videos.filter((v) => v.location_id === location.id).map(mapLocationVideo);

  let description: string | undefined;
  let dianpingUrl: string | undefined;
  let mergedVideos: TripMapVideo[] = legacyVideos;

  if (location.type === 'restaurant') {
    const match = restaurantByKey.get(keyOf(location.name, location.city));
    if (match) {
      dianpingUrl = match.dianpingUrl ?? undefined;
      description = match.description ?? undefined;
      const mediaRows = mediaByRestaurantId.get(match.id) ?? [];
      if (mediaRows.length > 0) {
        mergedVideos = mediaRows.map(mapRestaurantMedia);
      }
    }
    // Restaurant has no curated link (e.g. came from Amap fallback) — generate
    // an Amap deep link so the detail panel still has an actionable target.
    if (!dianpingUrl) {
      dianpingUrl = buildAmapMarkerUrl(location.name, location.lat, location.lng);
    }
  } else if (location.type === 'attraction') {
    const match = attractionByKey.get(keyOf(location.name, location.city));
    if (match) {
      description = match.description ?? undefined;
    }
  }

  const row = location as TripMapLocationRow & {
    name_en?: string | null;
    city_en?: string | null;
    district_en?: string | null;
    address_en?: string | null;
  };
  return {
    id: location.id,
    name: location.name,
    nameEn: row.name_en ?? null,
    city: location.city,
    cityEn: row.city_en ?? null,
    district: location.district ?? '',
    districtEn: row.district_en ?? null,
    address: location.address ?? '',
    addressEn: row.address_en ?? null,
    lat: location.lat,
    lng: location.lng,
    type: location.type,
    order: location.order_index,
    articles: locationArticles,
    videos: mergedVideos,
    description,
    dianpingUrl,
  };
};

type CatalogMaps = {
  restaurantByKey: Map<string, { id: string; dianpingUrl: string | null; description: string | null }>;
  attractionByKey: Map<string, { description: string | null }>;
  mediaByRestaurantId: Map<string, RestaurantMediaRow[]>;
};

async function fetchCatalogMaps(
  restaurantNames: string[],
  attractionNames: string[],
): Promise<CatalogMaps> {
  const [
    { data: restaurantRows, error: restaurantError },
    { data: attractionRows, error: attractionError },
  ] = await Promise.all([
    restaurantNames.length
      ? supabase
          .from('restaurants')
          .select('id, name, dianping_url, description, destinations!inner(name)')
          .in('name', restaurantNames)
      : Promise.resolve({ data: [] as RestaurantCatalogRow[], error: null }),
    attractionNames.length
      ? supabase
          .from('attractions')
          .select('name, description, destinations!inner(name)')
          .in('name', attractionNames)
      : Promise.resolve({ data: [] as AttractionCatalogRow[], error: null }),
  ]);

  if (restaurantError) throw new Error(`[tripMapService] 加载餐馆目录失败: ${restaurantError.message}`);
  if (attractionError) throw new Error(`[tripMapService] 加载景点目录失败: ${attractionError.message}`);

  const restaurantByKey = new Map<string, { id: string; dianpingUrl: string | null; description: string | null }>();
  const restaurantIds: string[] = [];
  for (const row of (restaurantRows ?? []) as RestaurantCatalogRow[]) {
    const city = pickDestinationName(row.destinations);
    if (!city) continue;
    restaurantByKey.set(keyOf(row.name, city), {
      id: row.id,
      dianpingUrl: row.dianping_url,
      description: row.description,
    });
    restaurantIds.push(row.id);
  }

  const attractionByKey = new Map<string, { description: string | null }>();
  for (const row of (attractionRows ?? []) as AttractionCatalogRow[]) {
    const city = pickDestinationName(row.destinations);
    if (!city) continue;
    attractionByKey.set(keyOf(row.name, city), { description: row.description });
  }

  const mediaByRestaurantId = new Map<string, RestaurantMediaRow[]>();
  if (restaurantIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await supabase
      .from('restaurant_media')
      .select(
        'id, restaurant_id, platform, link_url, thumbnail, title, upload_date, alt_platform, alt_link_url, sort, restaurant_media_influencers(influencers(name, header_pic))',
      )
      .in('restaurant_id', restaurantIds)
      .order('sort', { ascending: true });

    if (mediaError) throw new Error(`[tripMapService] 加载餐馆视频失败: ${mediaError.message}`);

    for (const row of (mediaRows ?? []) as RestaurantMediaRow[]) {
      const list = mediaByRestaurantId.get(row.restaurant_id) ?? [];
      list.push(row);
      mediaByRestaurantId.set(row.restaurant_id, list);
    }
  }

  return { restaurantByKey, attractionByKey, mediaByRestaurantId };
}

export const tripMapService = {
  async getLocationsByTripId(tripId: string): Promise<LocationPoint[]> {
    const { data: locations, error: locationError } = await supabase
      .from('trip_map_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: true });

    if (locationError) {
      throw new Error(`[tripMapService] 加载地点失败: ${locationError.message}`);
    }

    if (!locations?.length) {
      return [];
    }

    const locationIds = locations.map((location) => location.id);
    const restaurantNames = Array.from(
      new Set(locations.filter((l) => l.type === 'restaurant').map((l) => l.name)),
    );
    const attractionNames = Array.from(
      new Set(locations.filter((l) => l.type === 'attraction').map((l) => l.name)),
    );

    const [
      { data: articles, error: articleError },
      { data: videos, error: videoError },
      catalog,
    ] = await Promise.all([
      supabase.from('location_articles').select('*').in('location_id', locationIds),
      supabase.from('location_videos').select('*').in('location_id', locationIds),
      fetchCatalogMaps(restaurantNames, attractionNames),
    ]);

    if (articleError) throw new Error(`[tripMapService] 加载地点文章失败: ${articleError.message}`);
    if (videoError) throw new Error(`[tripMapService] 加载地点视频失败: ${videoError.message}`);

    return locations.map((location) =>
      mapLocation(
        location,
        articles ?? [],
        videos ?? [],
        catalog.restaurantByKey,
        catalog.attractionByKey,
        catalog.mediaByRestaurantId,
      ),
    );
  },

  // Enrich pre-built LocationPoint objects (e.g. preview) with catalog dianpingUrl/videos/description.
  async enrichLocations(locations: LocationPoint[]): Promise<LocationPoint[]> {
    if (!locations.length) return locations;

    const restaurantNames = Array.from(
      new Set(locations.filter((l) => l.type === 'restaurant').map((l) => l.name)),
    );
    const attractionNames = Array.from(
      new Set(locations.filter((l) => l.type === 'attraction').map((l) => l.name)),
    );

    const catalog = await fetchCatalogMaps(restaurantNames, attractionNames);

    return locations.map((loc) => {
      if (loc.type === 'restaurant') {
        const match = catalog.restaurantByKey.get(keyOf(loc.name, loc.city));
        if (match) {
          const mediaRows = catalog.mediaByRestaurantId.get(match.id) ?? [];
          return {
            ...loc,
            dianpingUrl: match.dianpingUrl ?? undefined,
            description: match.description ?? undefined,
            videos: mediaRows.length > 0 ? mediaRows.map(mapRestaurantMedia) : loc.videos,
          };
        }
      } else if (loc.type === 'attraction') {
        const match = catalog.attractionByKey.get(keyOf(loc.name, loc.city));
        if (match) {
          return { ...loc, description: match.description ?? undefined };
        }
      }
      return loc;
    });
  },
};

export default tripMapService;
