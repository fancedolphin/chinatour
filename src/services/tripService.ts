/**
 * Trip Service
 *
 * 行程服务层 - 提供行程CRUD操作
 * 使用 Supabase 客户端进行数据库交互
 */

import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import type { TransformedTripData } from '@/utils/tripDataTransformer';

// 类型别名定义
export type Trip = Tables<'trips'>;
export type TripInsert = TablesInsert<'trips'>;
export type TripUpdate = TablesUpdate<'trips'>;

export type TripItinerary = Tables<'trip_itineraries'>;
export type Activity = Tables<'activities'>;
type TripMapLocationInsert = TablesInsert<'trip_map_locations'>;

// 行程详情类型（包含嵌套的行程单和活动）
export interface TripDetail extends Trip {
  trip_itineraries: (TripItinerary & {
    activities: Activity[];
  })[];
}

function extractTripCity(destination: string): string {
  const parts = destination
    .split(/·|,|，|\/|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[0] || destination;
}

function mapActivityToMapLocationType(activityType: string): TripMapLocationInsert['type'] | null {
  switch (activityType) {
    case 'meal':
    case 'dining':
    case 'restaurant':
      return 'restaurant';
    case 'attraction':
    case 'sightseeing':
      return 'attraction';
    case 'rest':
    case 'accommodation':
    case 'leisure':
    case 'hotel':
      return 'hotel';
    default:
      return null;
  }
}

function buildTripMapLocations(
  tripId: string,
  destination: string,
  itineraries: Array<{
    itinerary: Pick<TripItinerary, 'day_number'>;
    activities: Array<Pick<Activity, 'name' | 'type' | 'address' | 'location_lat' | 'location_lng' | 'order_index'>>;
  }>,
): TripMapLocationInsert[] {
  const city = extractTripCity(destination);

  return itineraries
    .flatMap(({ itinerary, activities }) =>
      activities
        .map((activity) => {
          if (!Number.isFinite(activity.location_lat) || !Number.isFinite(activity.location_lng)) {
            return null;
          }

          const locationType = mapActivityToMapLocationType(activity.type);
          if (!locationType) {
            return null;
          }

          return {
            trip_id: tripId,
            name: activity.name,
            city,
            district: null,
            address: activity.address,
            lat: activity.location_lat!,
            lng: activity.location_lng!,
            type: locationType,
            order_index: itinerary.day_number * 100 + (activity.order_index ?? 0),
          };
        })
        .filter((location): location is TripMapLocationInsert => Boolean(location)),
    );
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
   * 批量创建行程及其子项
   * @param transformedData - 预先转换好的行程、每日行程和活动数据
   * @returns Promise<TripDetail> - 包含每日行程与活动的完整行程
   */
  async createTripWithItineraries(transformedData: TransformedTripData): Promise<TripDetail> {
    console.log('[tripService] 开始批量创建行程数据:', {
      destination: transformedData.trip.destination,
      itineraryCount: transformedData.itineraries.length,
    });

    const createdTrip = await tripService.createTrip(transformedData.trip);
    console.log('[tripService] 行程创建完成，准备创建每日行程:', {
      tripId: createdTrip.id,
      itineraryCount: transformedData.itineraries.length,
    });

    const itinerariesPayload = transformedData.itineraries.map(({ itinerary }) => ({
      ...itinerary,
      trip_id: createdTrip.id,
    }));

    const { data: createdItineraries, error: itinerariesError } = await supabase
      .from('trip_itineraries')
      .insert(itinerariesPayload)
      .select();

    if (itinerariesError) {
      console.error('[tripService] 批量创建每日行程失败:', itinerariesError.message);
      throw new Error(`Failed to create itineraries: ${itinerariesError.message}`);
    }

    if (!createdItineraries || createdItineraries.length === 0) {
      throw new Error('Failed to create itineraries: No data returned');
    }

    console.log('[tripService] 每日行程创建成功，准备创建活动:', {
      tripId: createdTrip.id,
      itineraryCount: createdItineraries.length,
    });

    const itineraryByDay = createdItineraries.reduce<Record<number, TripItinerary>>((acc, itinerary) => {
      acc[itinerary.day_number] = itinerary;
      return acc;
    }, {});

    const activitiesPayload = transformedData.itineraries.flatMap(({ activities, itinerary }) => {
      const createdItinerary = itineraryByDay[itinerary.day_number];

      if (!createdItinerary) {
        console.warn('[tripService] 未找到匹配的每日行程记录:', {
          dayNumber: itinerary.day_number,
          tripId: createdTrip.id,
        });
        return [];
      }

      return activities.map((activity) => ({
        ...activity,
        itinerary_id: createdItinerary.id,
      }));
    });

    let createdActivities: Activity[] = [];

    if (activitiesPayload.length > 0) {
      const { data: insertedActivities, error: activitiesError } = await supabase
        .from('activities')
        .insert(activitiesPayload)
        .select();

      if (activitiesError) {
        console.error('[tripService] 批量创建活动失败:', activitiesError.message);
        throw new Error(`Failed to create activities: ${activitiesError.message}`);
      }

      if (insertedActivities && insertedActivities.length > 0) {
        createdActivities = insertedActivities;
      }

      console.log('[tripService] 活动创建成功:', {
        count: createdActivities.length,
        itineraryIds: createdItineraries.map((itinerary) => itinerary.id),
      });
    } else {
      console.log('[tripService] 无活动需要创建');
    }

    const activityMap = createdActivities.reduce<Record<string, Activity[]>>((acc, activity) => {
      if (!acc[activity.itinerary_id]) {
        acc[activity.itinerary_id] = [];
      }
      acc[activity.itinerary_id].push(activity);
      return acc;
    }, {});

    const itinerariesWithActivities = createdItineraries.map((itinerary) => {
      const activities = activityMap[itinerary.id] || [];
      activities.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

      return {
        ...itinerary,
        activities,
      };
    });

    const mapLocationsPayload = buildTripMapLocations(
      createdTrip.id,
      createdTrip.destination,
      itinerariesWithActivities.map((itinerary) => ({
        itinerary,
        activities: itinerary.activities,
      })),
    );

    if (mapLocationsPayload.length > 0) {
      const { error: mapLocationsError } = await supabase
        .from('trip_map_locations')
        .insert(mapLocationsPayload);

      if (mapLocationsError) {
        console.error('[tripService] 批量创建地图地点失败:', mapLocationsError.message);
      } else {
        console.log('[tripService] 地图地点创建成功:', {
          tripId: createdTrip.id,
          count: mapLocationsPayload.length,
        });
      }
    }

    const tripDetail: TripDetail = {
      ...createdTrip,
      trip_itineraries: itinerariesWithActivities,
    };

    console.log('[tripService] 行程及所有子项创建完成:', {
      tripId: createdTrip.id,
      itineraryCount: itinerariesWithActivities.length,
      activityCount: createdActivities.length,
    });

    return tripDetail;
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
