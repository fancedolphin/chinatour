/**
 * Trip Service
 *
 * 行程服务层 - 提供行程CRUD操作
 * 使用 Supabase 客户端进行数据库交互
 */

import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

// 类型别名定义
export type Trip = Tables<'trips'>;
export type TripInsert = TablesInsert<'trips'>;
export type TripUpdate = TablesUpdate<'trips'>;

export type TripItinerary = Tables<'trip_itineraries'>;
export type Activity = Tables<'activities'>;

// 行程详情类型（包含嵌套的行程单和活动）
export interface TripDetail extends Trip {
  trip_itineraries: (TripItinerary & {
    activities: Activity[];
  })[];
}

/**
 * 行程服务对象
 */
export const tripService = {
  /**
   * 获取用户行程列表
   * @param userId - 用户ID
   * @returns Promise<Trip[]> - 行程列表，按创建时间倒序排列
   * @throws {Error} 如果查询失败
   */
  async getUserTrips(userId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[tripService] 获取用户行程失败:', error.message);
      throw new Error(`Failed to fetch user trips: ${error.message}`);
    }

    return data;
  },

  /**
   * 获取行程详情（含每日行程和活动）
   * @param tripId - 行程ID
   * @returns Promise<TripDetail> - 完整行程信息，包含嵌套的行程单和活动
   * @throws {Error} 如果查询失败或行程不存在
   */
  async getTripDetail(tripId: string): Promise<TripDetail> {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        trip_itineraries (
          *,
          activities (*)
        )
      `)
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('[tripService] 获取行程详情失败:', error.message);
      throw new Error(`Failed to fetch trip detail: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Trip not found: ${tripId}`);
    }

    return data as TripDetail;
  },

  /**
   * 创建行程
   * @param trip - 行程数据（Partial类型，id等字段会自动生成）
   * @returns Promise<Trip> - 创建的行程对象
   * @throws {Error} 如果创建失败
   */
  async createTrip(trip: TripInsert): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert(trip)
      .select()
      .single();

    if (error) {
      console.error('[tripService] 创建行程失败:', error.message);
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create trip: No data returned');
    }

    console.log('[tripService] 行程创建成功:', data.id);
    return data;
  },

  /**
   * 更新行程
   * @param tripId - 行程ID
   * @param updates - 要更新的字段（Partial类型）
   * @returns Promise<Trip> - 更新后的行程对象
   * @throws {Error} 如果更新失败
   */
  async updateTrip(tripId: string, updates: TripUpdate): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('[tripService] 更新行程失败:', error.message);
      throw new Error(`Failed to update trip: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Trip not found: ${tripId}`);
    }

    console.log('[tripService] 行程更新成功:', tripId);
    return data;
  },

  /**
   * 删除行程
   * @param tripId - 行程ID
   * @returns Promise<void>
   * @throws {Error} 如果删除失败
   *
   * 注意：由于外键级联删除配置，删除行程会自动删除：
   * - 关联的 trip_itineraries 记录
   * - 关联的 activities 记录
   * - 关联的 shared_trips 记录
   */
  async deleteTrip(tripId: string): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) {
      console.error('[tripService] 删除行程失败:', error.message);
      throw new Error(`Failed to delete trip: ${error.message}`);
    }

    console.log('[tripService] 行程删除成功:', tripId);
  },
};

export default tripService;
