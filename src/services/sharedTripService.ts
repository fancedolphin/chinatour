/**
 * Shared Trip Service
 *
 * 广场服务层 - 行程发布、互动（点赞/收藏）、导入（fork）操作
 */

import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert } from '@/types/database';

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
  description?: string;
  tags?: string[];
  highlights?: string[];
}

export const sharedTripService = {
  /**
   * 获取广场公开行程列表
   */
  async getSharedTrips(sortBy: SharedTripSortBy = 'recommend'): Promise<SharedTripCard[]> {
    let query = supabase
      .from('shared_trips')
      .select(`
        id,
        trip_id,
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
          avatar_url
        )
      `)
      .eq('is_active', true);

    if (sortBy === 'hot') {
      query = query.order('likes_count', { ascending: false });
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

    return (data || []).map((row: any) => ({
      id: row.id,
      tripId: row.trip_id,
      destination: row.trips?.destination ?? '',
      startDate: row.trips?.start_date ?? '',
      endDate: row.trips?.end_date ?? '',
      duration: row.trips?.duration ?? null,
      budget: row.trips?.budget ?? null,
      imageUrl: row.trips?.image_url ?? null,
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
        name: row.users?.display_name ?? '用户',
        avatar: row.users?.avatar_url ?? null,
      },
    }));
  },

  /**
   * 发布行程到广场
   */
  async publishTrip(
    tripId: string,
    userId: string,
    opts: PublishTripOptions = {}
  ): Promise<SharedTrip> {
    // 检查是否已发布
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
          description: opts.description ?? null,
          tags: opts.tags ?? null,
          highlights: opts.highlights ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to re-publish trip: ${error.message}`);
      console.log('[sharedTripService] 行程重新发布成功:', existing.id);
      return data!;
    }

    const payload: TablesInsert<'shared_trips'> = {
      trip_id: tripId,
      user_id: userId,
      is_active: true,
      description: opts.description ?? null,
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

    console.log('[sharedTripService] 行程发布成功:', data!.id);
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
    console.log('[sharedTripService] 取消发布成功:', tripId);
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

    // 同步更新 likes_count（乐观更新，忽略失败）
    const { data: current } = await supabase
      .from('shared_trips')
      .select('likes_count')
      .eq('id', sharedTripId)
      .single();

    if (current) {
      const newCount = Math.max(0, (current.likes_count ?? 0) + (newLiked ? 1 : -1));
      await supabase
        .from('shared_trips')
        .update({ likes_count: newCount })
        .eq('id', sharedTripId);
    }

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

    const { data: current } = await supabase
      .from('shared_trips')
      .select('saves_count')
      .eq('id', sharedTripId)
      .single();

    if (current) {
      const newCount = Math.max(0, (current.saves_count ?? 0) + (newSaved ? 1 : -1));
      await supabase
        .from('shared_trips')
        .update({ saves_count: newCount })
        .eq('id', sharedTripId);
    }

    return newSaved;
  },

  /**
   * 导入（fork）他人行程到自己的列表
   * 复制 trip + trip_itineraries + activities，标记 source='forked'
   * @returns 新行程 ID
   */
  async forkTrip(sharedTripId: string, targetUserId: string): Promise<string> {
    // 1. 获取原始行程 ID
    const { data: shared, error: sharedError } = await supabase
      .from('shared_trips')
      .select('trip_id')
      .eq('id', sharedTripId)
      .single();

    if (sharedError || !shared) {
      throw new Error(`Shared trip not found: ${sharedTripId}`);
    }

    // 2. 获取完整行程详情
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

    // 3. 创建新行程
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

    // 4. 复制行程单 + 活动
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

    console.log('[sharedTripService] Fork 完成:', { sharedTripId, newTripId: newTrip.id });
    return newTrip.id;
  },
};

export default sharedTripService;
