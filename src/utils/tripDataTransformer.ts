/**
 * Trip Data Transformer
 *
 * 数据转换工具，负责将 AI 生成的 TripPlan 转换为数据库插入格式
 */

import type { TripInsert } from '@/services/tripService';
import type { TripItineraryInsert, ActivityInsert } from '@/services/itineraryService';
import { amapService } from '@/services/amapService';
import { geocodeAddress } from '@/services/googleGeocodingService';

// ============ AI 生成的行程方案类型 ============

export interface PlanActivity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'transport' | 'rest' | 'meal';
  address?: string;
  image_url?: string;
  duration?: string;
  price?: string;
  geoCoordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DayPlan {
  day: number;
  theme: string;
  activities: PlanActivity[];
  meals: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  alternativePlan?: string;
}

export interface TripPlan {
  destination: string;
  dates: string; // 格式: "2024年10月1日 - 10月7日"
  budget: string;
  days: DayPlan[];
}

// ============ 转换结果类型 ============

export interface TransformedTripData {
  trip: TripInsert;
  itineraries: {
    itinerary: Omit<TripItineraryInsert, 'trip_id'>;
    activities: Omit<ActivityInsert, 'itinerary_id'>[];
  }[];
}

// ============ 转换工具函数 ============

/**
 * 解析日期字符串
 * @param dateStr - 格式: "2024年10月1日 - 10月7日"
 * @returns { startDate: string, endDate: string } ISO 格式日期
 */
export function parseDates(dateStr: string): { startDate: string; endDate: string } {
  // 尝试解析 "2024年10月1日 - 10月7日" 格式
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*[-–]\s*(\d{1,2})月(\d{1,2})日/);

  if (match) {
    const [, year, startMonth, startDay, endMonth, endDay] = match;
    const startDate = `${year}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDate = `${year}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    return { startDate, endDate };
  }

  // 尝试解析跨年格式 "2024年12月28日 - 2025年1月3日"
  const crossYearMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*[-–]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);

  if (crossYearMatch) {
    const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = crossYearMatch;
    const startDate = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const endDate = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    return { startDate, endDate };
  }

  // English formats — let Date.parse handle whatever it can:
  //   "April 29, 2026 - May 2, 2026"
  //   "Apr 29 - May 2, 2026"        (year on the right side only)
  //   "April 29 - 2026-05-02"
  const dashSplit = dateStr.split(/\s*[-–]\s*/);
  if (dashSplit.length === 2) {
    let [leftStr, rightStr] = dashSplit;

    // If the year is only on the right side, copy it to the left ("Apr 29 - May 2, 2026")
    const rightYearMatch = rightStr.match(/\b(\d{4})\b/);
    if (rightYearMatch && !/\b\d{4}\b/.test(leftStr)) {
      leftStr = `${leftStr}, ${rightYearMatch[1]}`;
    }

    const leftMs = Date.parse(leftStr);
    const rightMs = Date.parse(rightStr);
    if (!Number.isNaN(leftMs) && !Number.isNaN(rightMs)) {
      const toIso = (ms: number) => {
        const d = new Date(ms);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      return { startDate: toIso(leftMs), endDate: toIso(rightMs) };
    }
  }

  throw new Error(`[tripDataTransformer] Unable to parse date format: ${dateStr}`);
}

/**
 * 将 AI 活动类型映射到数据库类型
 * @param type - AI 活动类型
 * @returns 数据库活动类型
 */
export function mapActivityType(type: 'attraction' | 'transport' | 'rest' | 'meal'): string {
  const typeMap: Record<string, string> = {
    attraction: 'attraction',
    transport: 'transport',
    rest: 'other',
    meal: 'meal',
  };

  if (!typeMap[type]) {
    throw new Error(`[tripDataTransformer] 未知的活动类型: ${type}`);
  }

  return typeMap[type];
}

/**
 * 根据目的地确定图片 URL
 * @param destination - 目的地名称
 * @returns 图片 URL
 */
export function getDestinationImageUrl(destination: string): string {
  const dest = destination.toLowerCase();

  // 目的地到图片的映射
  const imageMap: Record<string, string> = {
    '上海': 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=1000',
    'shanghai': 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=1000',
    '伦敦': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1000',
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1000',
    '北京': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1000',
    'beijing': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1000',
    '东京': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1000',
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1000',
  };

  // 查找匹配的目的地
  for (const [key, url] of Object.entries(imageMap)) {
    if (dest.includes(key)) {
      return url;
    }
  }

  // 默认图片
  return 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1000';
}

// ============ Amap 增强辅助函数 ============

const extractCity = (destination: string): string => {
  if (!destination) return '';
  const parts = destination.split(/·|\.| |,|，/).map((p) => p.trim()).filter(Boolean);
  return parts[0] || destination;
};

const hasCoordinates = (
  coordinates?: PlanActivity['geoCoordinates'],
): coordinates is NonNullable<PlanActivity['geoCoordinates']> =>
  !!coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng);

const parsePoiLocation = (location?: string): PlanActivity['geoCoordinates'] | undefined => {
  if (!location) {
    return undefined;
  }

  const [lngStr, latStr] = location.split(',');
  const lat = Number.parseFloat(latStr);
  const lng = Number.parseFloat(lngStr);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }

  return { lat, lng };
};

const enhanceActivity = async (activity: PlanActivity, city: string): Promise<PlanActivity> => {
  // 跳过交通活动
  if (activity.type === 'transport') {
    return activity;
  }

  if ((activity.type === 'meal' || activity.type === 'attraction') && hasCoordinates(activity.geoCoordinates)) {
    return activity;
  }

  // 活动类型映射
  const typeMap: Record<PlanActivity['type'], string | undefined> = {
    meal: '餐饮服务',
    attraction: '风景名胜',
    rest: '酒店',
    transport: undefined,
  };

  try {
    let enhanced = { ...activity };

    // 如果有坐标，优先附近搜索
    let poi = null;
    if (hasCoordinates(activity.geoCoordinates)) {
      const nearby = await amapService.searchNearby(
        activity.geoCoordinates.lat,
        activity.geoCoordinates.lng,
        activity.name,
        1200,
      );
      poi = nearby && nearby.length > 0 ? nearby[0] : null;
    }

    // 兜底文本搜索
    if (!poi) {
      const pois = await amapService.searchPOI(
        enhanced.name,
        city,
        typeMap[enhanced.type],
      );
      poi = pois && pois.length > 0 ? pois[0] : null;
    }

    // 找到 POI 后增强活动信息
    if (poi) {
      enhanced = {
        ...enhanced,
        address: poi.address || enhanced.address,
        image_url: poi.photos && poi.photos.length > 0 ? poi.photos[0].url : enhanced.image_url,
        duration: enhanced.duration,
        price: poi.cost || enhanced.price,
      };

      const coords = parsePoiLocation(poi.location);
      if (coords) {
        enhanced = {
          ...enhanced,
          geoCoordinates: coords,
        };
      }
    }

    if (!hasCoordinates(enhanced.geoCoordinates)) {
      const query = enhanced.address || `${enhanced.name} ${city}`.trim();
      const coords = await geocodeAddress(query);

      if (coords) {
        enhanced = {
          ...enhanced,
          geoCoordinates: coords,
        };
      }
    }

    return enhanced;
  } catch (error) {
    console.error('[tripDataTransformer] Failed to enhance activity with Amap', {
      activityName: activity.name,
      error,
    });
    return activity; // 失败时返回原活动信息
  }
};

/**
 * 转换完整的 TripPlan 为数据库格式
 * @param plan - AI 生成的行程方案
 * @param userId - 当前用户 ID
 * @returns TransformedTripData - 转换后的数据，可直接用于数据库插入
 */
export function transformTripPlan(plan: TripPlan, userId: string): TransformedTripData {
  const { startDate, endDate } = parseDates(plan.dates);
  const imageUrl = getDestinationImageUrl(plan.destination);

  // 1. 转换 trip 基础信息
  const trip: TripInsert = {
    user_id: userId,
    destination: plan.destination,
    start_date: startDate,
    end_date: endDate,
    duration: `${plan.days.length}天`,
    budget: plan.budget,
    image_url: imageUrl,
    status: 'planning',
    source: 'ai',
  };

  // 2. 转换 itineraries 和 activities
  const itineraries = plan.days.map((day) => {
    // 转换 itinerary
    const itinerary: Omit<TripItineraryInsert, 'trip_id'> = {
      day_number: day.day,
      theme: day.theme,
      date: null, // AI 生成的方案通常没有具体日期
    };

    // 转换 activities
    const activities: Omit<ActivityInsert, 'itinerary_id'>[] = day.activities.map((act, index) => ({
      time: act.time,
      name: act.name,
      description: act.description,
      type: mapActivityType(act.type),
      order_index: index,
      location_lat: act.geoCoordinates?.lat,
      location_lng: act.geoCoordinates?.lng,
      address: act.address,
      image_url: act.image_url,
      duration: act.duration,
      price: act.price,
    }));

    return { itinerary, activities };
  });

  return { trip, itineraries };
}

/**
 * 转换并先通过高德地图增强活动信息
 * @param plan - AI 生成的行程方案
 * @param userId - 当前用户 ID
 * @returns TransformedTripData - 转换并增强后的数据
 */
export async function transformTripPlanWithEnhancement(
  plan: TripPlan,
  userId: string,
): Promise<TransformedTripData> {
  const city = extractCity(plan.destination);

  const enhancedDays = await Promise.all(
    plan.days.map(async (day) => ({
      ...day,
      activities: await Promise.all(day.activities.map((activity) => enhanceActivity(activity, city))),
    })),
  );

  return transformTripPlan(
    {
      ...plan,
      days: enhancedDays,
    },
    userId,
  );
}

// ============ 服务对象导出 ============

export const tripDataTransformer = {
  parseDates,
  mapActivityType,
  getDestinationImageUrl,
  transform: transformTripPlan,
  transformWithEnhancement: transformTripPlanWithEnhancement,
};

export default tripDataTransformer;
