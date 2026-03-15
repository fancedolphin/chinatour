import { supabase } from '@/utils/supabase/client';
import type { Tables } from '@/types/database';

type TripMapLocationRow = Tables<'trip_map_locations'>;
type TripMapArticleRow = Tables<'location_articles'>;
type TripMapVideoRow = Tables<'location_videos'>;

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
  platform: TripMapVideoRow['platform'];
  title: string;
};

export type LocationPoint = {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  distance?: string;
  type: TripMapLocationRow['type'];
  order: number;
  articles: TripMapArticle[];
  videos: TripMapVideo[];
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

const mapVideo = (video: TripMapVideoRow): TripMapVideo => ({
  id: video.id,
  thumbnail: video.thumbnail ?? '',
  authorAvatar: video.author_avatar ?? '',
  authorName: video.author_name ?? '',
  date: video.date ?? '',
  platform: video.platform,
  title: video.title ?? '',
});

const mapLocation = (
  location: TripMapLocationRow,
  articles: TripMapArticleRow[],
  videos: TripMapVideoRow[],
): LocationPoint => ({
  id: location.id,
  name: location.name,
  city: location.city,
  district: location.district ?? '',
  address: location.address ?? '',
  lat: location.lat,
  lng: location.lng,
  type: location.type,
  order: location.order_index,
  articles: articles.filter((article) => article.location_id === location.id).map(mapArticle),
  videos: videos.filter((video) => video.location_id === location.id).map(mapVideo),
});

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
    const [{ data: articles, error: articleError }, { data: videos, error: videoError }] = await Promise.all([
      supabase.from('location_articles').select('*').in('location_id', locationIds),
      supabase.from('location_videos').select('*').in('location_id', locationIds),
    ]);

    if (articleError) {
      throw new Error(`[tripMapService] 加载地点文章失败: ${articleError.message}`);
    }

    if (videoError) {
      throw new Error(`[tripMapService] 加载地点视频失败: ${videoError.message}`);
    }

    return locations.map((location) => mapLocation(location, articles ?? [], videos ?? []));
  },
};

export default tripMapService;
