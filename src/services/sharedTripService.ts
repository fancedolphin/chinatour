/**
 * Shared Trip Service
 *
 * 广场服务层 - 行程发布、互动（点赞/收藏）、导入（fork）操作
 */

import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert } from '@/types/database';
import i18n from '@/i18n';

export type SharedTrip = Tables<'shared_trips'>;
export type UserInteraction = Tables<'user_interactions'>;

/** 广场卡片展示结构（join trips + users） */
export interface SharedTripCard {
  id: string;
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: string | null;
  budget: string | null;
  imageUrl: string | null;
  description: string | null;
  tags: string[] | null;
  highlights: string[] | null;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharedAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export type SharedTripSortBy = 'latest' | 'hot' | 'recommend';

export interface PublishTripOptions {
  title?: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
  highlights?: string[];
}

export const SHARED_TRIP_CARD_SELECT = `
  id,
  trip_id,
  title,
  cover_image,
  description,
  tags,
  highlights,
  likes_count,
  saves_count,
  comments_count,
  views_count,
  shared_at,
  user_id,
  trips (
    destination,
    start_date,
    end_date,
    duration,
    budget,
    image_url
  ),
  users (
    id,
    display_name,
    avatar_url,
    username
  )
`;

export function mapSharedTripCard(row: any): SharedTripCard {
  return {
    id: row.id,
    tripId: row.trip_id,
    destination: row.trips?.destination ?? row.title ?? i18n.t('shared.untitledTrip'),
    startDate: row.trips?.start_date ?? '',
    endDate: row.trips?.end_date ?? '',
    duration: row.trips?.duration ?? null,
    budget: row.trips?.budget ?? null,
    imageUrl: row.cover_image ?? row.trips?.image_url ?? null,
    description: row.description,
    tags: row.tags,
    highlights: row.highlights,
    likesCount: row.likes_count ?? 0,
    savesCount: row.saves_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    viewsCount: row.views_count ?? 0,
    sharedAt: row.shared_at ?? '',
    author: {
      id: row.users?.id ?? row.user_id,
      name: row.users?.display_name ?? row.users?.username ?? i18n.t('shared.anonymousUser'),
      avatar: row.users?.avatar_url ?? null,
    },
  };
}

export const sharedTripService = {
  /**
   * 根据 sharedTripId 获取单条详情（含作者信息 + 行程数据）
   */
  async getSharedTripById(sharedTripId: string): Promise<SharedTripCard & {
    tripData: {
      itineraries: Array<{
        dayNumber: number;
        date: string | null;
        theme: string | null;
        activities: Array<{
          time: string | null;
          name: string;
          type: string;
          description: string | null;
          duration: string | null;
          price: string | null;
          address: string | null;
        }>;
      }>;
    };
  }> {
    const { data, error } = await supabase
      .from('shared_trips')
      .select(`
        id,
        trip_id,
        title,
        cover_image,
        description,
        tags,
        highlights,
        likes_count,
        saves_count,
        comments_count,
        views_count,
        shared_at,
        user_id,
        trips (
          destination,
          start_date,
          end_date,
          duration,
          budget,
          image_url,
          trip_itineraries (
            day_number,
            date,
            theme,
            activities (
              time,
              name,
              type,
              description,
              duration,
              price,
              address,
              order_index,
              location_lat,
              location_lng,
              image_url
            )
          )
        ),
        users (
          id,
          display_name,
          avatar_url,
          username
        )
      `)
      .eq('id', sharedTripId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(`Shared trip not found: ${sharedTripId}`);
    }

    const row = data as any;
    const itineraries = (row.trips?.trip_itineraries ?? [])
      .sort((a: any, b: any) => a.day_number - b.day_number)
      .map((itin: any) => ({
        dayNumber: itin.day_number,
        date: itin.date,
        theme: itin.theme,
        activities: (itin.activities ?? [])
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((act: any) => ({
            time: act.time,
            name: act.name,
            type: act.type,
            description: act.description,
            duration: act.duration,
            price: act.price,
            address: act.address,
          })),
      }));

    return {
      ...mapSharedTripCard(row),
      tripData: { itineraries },
    };
  },

  /**
   * 获取广场公开行程列表
   */
  async getAllSharedTrips(options?: { sort?: SharedTripSortBy; tag?: string }): Promise<SharedTripCard[]> {
    const sortBy = options?.sort ?? 'recommend';
    const tag = options?.tag;

    let query = supabase
      .from('shared_trips')
      .select(SHARED_TRIP_CARD_SELECT)
      .eq('is_active', true);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (sortBy === 'hot') {
      query = query.order('likes_count', { ascending: false }).order('shared_at', { ascending: false });
    } else if (sortBy === 'latest') {
      query = query.order('shared_at', { ascending: false });
    } else {
      query = query.order('featured', { ascending: false }).order('views_count', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[sharedTripService] 获取广场行程失败:', error.message);
      throw new Error(`Failed to fetch shared trips: ${error.message}`);
    }

    return (data ?? []).map(mapSharedTripCard);
  },

  async getFollowingFeed(userId: string): Promise<SharedTripCard[]> {
    const { data: follows, error: followError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followError) {
      console.error('[sharedTripService] 获取关注列表失败:', followError.message);
      throw new Error(`Failed to fetch following list: ${followError.message}`);
    }

    const followingIds = (follows ?? []).map((row) => row.following_id);
    if (followingIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('shared_trips')
      .select(SHARED_TRIP_CARD_SELECT)
      .eq('is_active', true)
      .in('user_id', followingIds)
      .order('shared_at', { ascending: false });

    if (error) {
      console.error('[sharedTripService] 获取关注 feed 失败:', error.message);
      throw new Error(`Failed to fetch following feed: ${error.message}`);
    }

    return (data ?? []).map(mapSharedTripCard);
  },

  async getSharedTripsByUser(userId: string): Promise<SharedTripCard[]> {
    const { data, error } = await supabase
      .from('shared_trips')
      .select(SHARED_TRIP_CARD_SELECT)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('shared_at', { ascending: false });

    if (error) {
      console.error('[sharedTripService] 获取用户发布行程失败:', error.message);
      throw new Error(`Failed to fetch user shared trips: ${error.message}`);
    }

    return (data ?? []).map(mapSharedTripCard);
  },

  async getLikedSharedTripsByUser(userId: string): Promise<SharedTripCard[]> {
    const { data, error } = await supabase
      .from('user_interactions')
      .select(`
        liked_at,
        shared_trips (
          ${SHARED_TRIP_CARD_SELECT}
        )
      `)
      .eq('user_id', userId)
      .eq('liked', true)
      .order('liked_at', { ascending: false });

    if (error) {
      console.error('[sharedTripService] 获取用户点赞行程失败:', error.message);
      throw new Error(`Failed to fetch liked shared trips: ${error.message}`);
    }

    return (data ?? [])
      .map((row: any) => row.shared_trips)
      .filter(Boolean)
      .map(mapSharedTripCard);
  },

  /**
   * 获取当前用户已发布的行程列表（批量，替代 N 次 isPublished 调用）
   */
  async getMySharedTrips(userId: string): Promise<SharedTrip[]> {
    const { data, error } = await supabase
      .from('shared_trips')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('[sharedTripService] 获取我的已发布行程失败:', error.message);
      throw new Error(`Failed to get my shared trips: ${error.message}`);
    }

    return data ?? [];
  },

  /**
   * 发布行程到广场
   */
  async publishTrip(
    tripId: string,
    userId: string,
    opts: PublishTripOptions = {}
  ): Promise<SharedTrip> {
    const { data: existing } = await supabase
      .from('shared_trips')
      .select('id')
      .eq('trip_id', tripId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('shared_trips')
        .update({
          is_active: true,
          title: opts.title ?? null,
          description: opts.description ?? null,
          cover_image: opts.coverImage ?? null,
          tags: opts.tags ?? null,
          highlights: opts.highlights ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to re-publish trip: ${error.message}`);
      return data!;
    }

    const payload: TablesInsert<'shared_trips'> = {
      trip_id: tripId,
      user_id: userId,
      is_active: true,
      title: opts.title ?? null,
      description: opts.description ?? null,
      cover_image: opts.coverImage ?? null,
      tags: opts.tags ?? null,
      highlights: opts.highlights ?? null,
      likes_count: 0,
      saves_count: 0,
      comments_count: 0,
      views_count: 0,
    };

    const { data, error } = await supabase
      .from('shared_trips')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[sharedTripService] 发布行程失败:', error.message);
      throw new Error(`Failed to publish trip: ${error.message}`);
    }

    return data!;
  },

  /**
   * 取消发布（软删除）
   */
  async unpublishTrip(tripId: string): Promise<void> {
    const { error } = await supabase
      .from('shared_trips')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('trip_id', tripId);

    if (error) throw new Error(`Failed to unpublish trip: ${error.message}`);
  },

  /**
   * 检查行程是否已发布到广场
   */
  async isPublished(tripId: string): Promise<boolean> {
    const { data } = await supabase
      .from('shared_trips')
      .select('id')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .maybeSingle();
    return !!data;
  },

  /**
   * 批量获取用户对一组 shared_trip 的互动状态
   * 返回 Map<sharedTripId, { liked, saved }>
   */
  async getBatchUserInteractions(
    sharedTripIds: string[],
    userId: string
  ): Promise<Map<string, { liked: boolean; saved: boolean }>> {
    if (sharedTripIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('user_interactions')
      .select('shared_trip_id, liked, saved')
      .eq('user_id', userId)
      .in('shared_trip_id', sharedTripIds);

    if (error) {
      console.error('[sharedTripService] 批量获取互动状态失败:', error.message);
      return new Map();
    }

    const result = new Map<string, { liked: boolean; saved: boolean }>();
    for (const row of data ?? []) {
      result.set(row.shared_trip_id, {
        liked: row.liked ?? false,
        saved: row.saved ?? false,
      });
    }
    return result;
  },

  /**
   * 获取某用户对某个 shared_trip 的互动状态
   */
  async getUserInteraction(
    sharedTripId: string,
    userId: string
  ): Promise<UserInteraction | null> {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('shared_trip_id', sharedTripId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[sharedTripService] 获取互动状态失败:', error.message);
      return null;
    }
    return data;
  },

  /**
   * 切换点赞状态，返回新的 liked 值
   */
  async toggleLike(sharedTripId: string, userId: string): Promise<boolean> {
    const existing = await sharedTripService.getUserInteraction(sharedTripId, userId);
    const newLiked = !existing?.liked;

    const { error } = await supabase
      .from('user_interactions')
      .upsert(
        {
          shared_trip_id: sharedTripId,
          user_id: userId,
          liked: newLiked,
          liked_at: newLiked ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shared_trip_id,user_id' }
      );

    if (error) throw new Error(`Failed to toggle like: ${error.message}`);
    return newLiked;
  },

  /**
   * 切换收藏状态，返回新的 saved 值
   */
  async toggleSave(sharedTripId: string, userId: string): Promise<boolean> {
    const existing = await sharedTripService.getUserInteraction(sharedTripId, userId);
    const newSaved = !existing?.saved;

    const { error } = await supabase
      .from('user_interactions')
      .upsert(
        {
          shared_trip_id: sharedTripId,
          user_id: userId,
          saved: newSaved,
          saved_at: newSaved ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shared_trip_id,user_id' }
      );

    if (error) throw new Error(`Failed to toggle save: ${error.message}`);
    return newSaved;
  },

  /**
   * 导入（fork）他人行程到自己的列表
   * 复制 trip + trip_itineraries + activities，标记 source='forked'
   * @returns 新行程 ID
   */
  async forkTrip(sharedTripId: string, targetUserId: string): Promise<string> {
    const { data: shared, error: sharedError } = await supabase
      .from('shared_trips')
      .select('trip_id')
      .eq('id', sharedTripId)
      .single();

    if (sharedError || !shared) {
      throw new Error(`Shared trip not found: ${sharedTripId}`);
    }

    const { data: sourceTrip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        trip_itineraries (
          *,
          activities (*)
        )
      `)
      .eq('id', shared.trip_id)
      .single();

    if (tripError || !sourceTrip) {
      throw new Error(`Source trip not found: ${shared.trip_id}`);
    }

    const { data: newTrip, error: newTripError } = await supabase
      .from('trips')
      .insert({
        user_id: targetUserId,
        destination: sourceTrip.destination,
        start_date: sourceTrip.start_date,
        end_date: sourceTrip.end_date,
        duration: sourceTrip.duration,
        budget: sourceTrip.budget,
        image_url: sourceTrip.image_url,
        ai_prompt: sourceTrip.ai_prompt,
        status: 'planning',
        source: 'forked',
        forked_from: sourceTrip.id,
      })
      .select()
      .single();

    if (newTripError || !newTrip) {
      throw new Error(`Failed to fork trip: ${newTripError?.message}`);
    }

    const itineraries = (sourceTrip as any).trip_itineraries ?? [];
    for (const itin of itineraries) {
      const { data: newItin, error: itinErr } = await supabase
        .from('trip_itineraries')
        .insert({
          trip_id: newTrip.id,
          day_number: itin.day_number,
          date: itin.date,
          theme: itin.theme,
        })
        .select()
        .single();

      if (itinErr || !newItin) {
        console.error('[sharedTripService] 复制行程单失败:', itinErr?.message);
        continue;
      }

      const activities = itin.activities ?? [];
      if (activities.length > 0) {
        const { error: actErr } = await supabase.from('activities').insert(
          activities.map((act: any) => ({
            itinerary_id: newItin.id,
            name: act.name,
            type: act.type,
            time: act.time,
            duration: act.duration,
            description: act.description,
            address: act.address,
            location_lat: act.location_lat,
            location_lng: act.location_lng,
            price: act.price,
            image_url: act.image_url,
            order_index: act.order_index,
          }))
        );
        if (actErr) console.error('[sharedTripService] 复制活动失败:', actErr.message);
      }
    }

    return newTrip.id;
  },
};

export default sharedTripService;
