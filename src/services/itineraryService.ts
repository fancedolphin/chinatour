/**
 * Itinerary Service
 *
 * 行程详情服务层 - 提供每日行程和活动的 CRUD 操作
 * 使用 Supabase 客户端进行数据库交互
 */

import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

// ============ 类型定义 ============
export type TripItinerary = Tables<'trip_itineraries'>;
export type TripItineraryInsert = TablesInsert<'trip_itineraries'>;
export type TripItineraryUpdate = TablesUpdate<'trip_itineraries'>;

export type Activity = Tables<'activities'>;
export type ActivityInsert = TablesInsert<'activities'>;
export type ActivityUpdate = TablesUpdate<'activities'>;

// 行程详情类型（包含嵌套的活动）
export interface ItineraryWithActivities extends TripItinerary {
  activities: Activity[];
}

// ============ Itinerary CRUD 方法 ============

/**
 * 创建单个每日行程
 * @param itinerary - 每日行程数据
 * @returns Promise<TripItinerary> - 创建的每日行程对象
 * @throws {Error} 如果创建失败
 */
async function createItinerary(itinerary: TripItineraryInsert): Promise<TripItinerary> {
  const { data, error } = await supabase
    .from('trip_itineraries')
    .insert(itinerary)
    .select()
    .single();

  if (error) {
    console.error('[itineraryService] 创建每日行程失败:', error.message);
    throw new Error(`Failed to create itinerary: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create itinerary: No data returned');
  }

  console.log('[itineraryService] 每日行程创建成功:', data.id);
  return data;
}

/**
 * 批量创建每日行程
 * @param itineraries - 每日行程数组
 * @returns Promise<TripItinerary[]> - 创建的每日行程列表
 * @throws {Error} 如果创建失败或输入为空
 */
async function createItineraries(itineraries: TripItineraryInsert[]): Promise<TripItinerary[]> {
  if (!itineraries || itineraries.length === 0) {
    throw new Error('No itineraries provided');
  }

  const { data, error } = await supabase
    .from('trip_itineraries')
    .insert(itineraries)
    .select();

  if (error) {
    console.error('[itineraryService] 批量创建每日行程失败:', error.message);
    throw new Error(`Failed to create itineraries: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create itineraries: No data returned');
  }

  console.log(`[itineraryService] 成功创建 ${data.length} 条每日行程`);
  return data;
}

/**
 * 更新每日行程
 * @param itineraryId - 每日行程ID
 * @param updates - 要更新的字段
 * @returns Promise<TripItinerary> - 更新后的每日行程对象
 * @throws {Error} 如果更新失败或行程不存在
 */
async function updateItinerary(itineraryId: string, updates: TripItineraryUpdate): Promise<TripItinerary> {
  const { data, error } = await supabase
    .from('trip_itineraries')
    .update(updates)
    .eq('id', itineraryId)
    .select()
    .single();

  if (error) {
    console.error('[itineraryService] 更新每日行程失败:', error.message);
    throw new Error(`Failed to update itinerary: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Itinerary not found: ${itineraryId}`);
  }

  console.log('[itineraryService] 每日行程更新成功:', itineraryId);
  return data;
}

/**
 * 删除每日行程
 * @param itineraryId - 每日行程ID
 * @returns Promise<void>
 * @throws {Error} 如果删除失败
 *
 * 注意：由于外键级联删除配置，删除每日行程会自动删除：
 * - 关联的 activities 记录
 */
async function deleteItinerary(itineraryId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_itineraries')
    .delete()
    .eq('id', itineraryId);

  if (error) {
    console.error('[itineraryService] 删除每日行程失败:', error.message);
    throw new Error(`Failed to delete itinerary: ${error.message}`);
  }

  console.log('[itineraryService] 每日行程删除成功（含关联活动）:', itineraryId);
}

/**
 * 获取行程的所有每日行程
 * @param tripId - 行程ID
 * @returns Promise<TripItinerary[]> - 每日行程列表，按 day_number 排序
 * @throws {Error} 如果查询失败
 */
async function getTripItineraries(tripId: string): Promise<TripItinerary[]> {
  const { data, error } = await supabase
    .from('trip_itineraries')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true });

  if (error) {
    console.error('[itineraryService] 获取每日行程列表失败:', error.message);
    throw new Error(`Failed to fetch trip itineraries: ${error.message}`);
  }

  return data;
}

/**
 * 获取包含活动的每日行程详情
 * @param itineraryId - 每日行程ID
 * @returns Promise<ItineraryWithActivities> - 包含活动列表的每日行程
 * @throws {Error} 如果查询失败或行程不存在
 */
async function getItineraryWithActivities(itineraryId: string): Promise<ItineraryWithActivities> {
  const { data, error } = await supabase
    .from('trip_itineraries')
    .select(`
      *,
      activities (*)
    `)
    .eq('id', itineraryId)
    .single();

  if (error) {
    console.error('[itineraryService] 获取行程详情失败:', error.message);
    throw new Error(`Failed to fetch itinerary detail: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Itinerary not found: ${itineraryId}`);
  }

  // 按 order_index 排序活动
  if (data.activities && data.activities.length > 0) {
    data.activities.sort((a, b) =>
      (a.order_index ?? 0) - (b.order_index ?? 0)
    );
  }

  return data as ItineraryWithActivities;
}

// ============ Activity CRUD 方法 ============

/**
 * 添加活动
 * @param activity - 活动数据
 * @returns Promise<Activity> - 创建的活动对象
 * @throws {Error} 如果创建失败
 */
async function addActivity(activity: ActivityInsert): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) {
    console.error('[itineraryService] 添加活动失败:', error.message);
    throw new Error(`Failed to add activity: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to add activity: No data returned');
  }

  console.log('[itineraryService] 活动添加成功:', data.id);
  return data;
}

/**
 * 更新活动
 * @param activityId - 活动ID
 * @param updates - 要更新的字段
 * @returns Promise<Activity> - 更新后的活动对象
 * @throws {Error} 如果更新失败或活动不存在
 */
async function updateActivity(activityId: string, updates: ActivityUpdate): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    console.error('[itineraryService] 更新活动失败:', error.message);
    throw new Error(`Failed to update activity: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Activity not found: ${activityId}`);
  }

  console.log('[itineraryService] 活动更新成功:', activityId);
  return data;
}

/**
 * 删除活动
 * @param activityId - 活动ID
 * @returns Promise<void>
 * @throws {Error} 如果删除失败
 */
async function deleteActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    console.error('[itineraryService] 删除活动失败:', error.message);
    throw new Error(`Failed to delete activity: ${error.message}`);
  }

  console.log('[itineraryService] 活动删除成功:', activityId);
}

/**
 * 获取某日的所有活动
 * @param itineraryId - 每日行程ID
 * @returns Promise<Activity[]> - 活动列表，按 order_index 排序
 * @throws {Error} 如果查询失败
 */
async function getActivitiesByItinerary(itineraryId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[itineraryService] 获取活动列表失败:', error.message);
    throw new Error(`Failed to fetch activities: ${error.message}`);
  }

  return data;
}

/**
 * 重排活动顺序
 * @param itineraryId - 每日行程ID
 * @param activityIds - 活动ID数组，数组顺序即为新的排序
 * @returns Promise<Activity[]> - 更新后的活动列表，按 order_index 排序
 * @throws {Error} 如果活动不属于该行程或更新失败
 */
async function reorderActivities(itineraryId: string, activityIds: string[]): Promise<Activity[]> {
  if (!activityIds || activityIds.length === 0) {
    throw new Error('No activity IDs provided');
  }

  // 1. 验证所有活动都属于该 itinerary
  const { data: existingActivities, error: fetchError } = await supabase
    .from('activities')
    .select('id')
    .eq('itinerary_id', itineraryId)
    .in('id', activityIds);

  if (fetchError) {
    console.error('[itineraryService] 验证活动失败:', fetchError.message);
    throw new Error(`Failed to fetch activities: ${fetchError.message}`);
  }

  if (!existingActivities || existingActivities.length !== activityIds.length) {
    throw new Error('Some activities do not belong to this itinerary');
  }

  // 2. 批量更新 order_index（数组索引即为新顺序）
  const updates = activityIds.map((id, index) =>
    supabase
      .from('activities')
      .update({ order_index: index })
      .eq('id', id)
  );

  await Promise.all(updates);

  // 3. 返回更新后的活动列表（按 order_index 排序）
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[itineraryService] 获取更新后的活动列表失败:', error.message);
    throw new Error(`Failed to fetch updated activities: ${error.message}`);
  }

  console.log(`[itineraryService] 成功重排 ${activityIds.length} 个活动`);
  return data;
}

// ============ 服务对象导出 ============

export const itineraryService = {
  // Itinerary CRUD
  createItinerary,
  createItineraries,
  updateItinerary,
  deleteItinerary,
  getTripItineraries,
  getItineraryWithActivities,

  // Activity CRUD
  addActivity,
  updateActivity,
  deleteActivity,
  getActivitiesByItinerary,
  reorderActivities,
};

export default itineraryService;
