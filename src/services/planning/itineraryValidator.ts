import type {
  BookingTip,
  MealRecommendation,
  PlannedActivity,
  PlanningIntent,
  StructuredItinerary,
  ValidationResult,
  ValidationWarning,
} from './contracts';
import { isSimilarName, normalizeEntityName } from './entityNormalizer';

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number },
): number {
  const earthRadius = 6371;
  const dLat = toRad(right.lat - left.lat);
  const dLng = toRad(right.lng - left.lng);
  const p =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(left.lat)) * Math.cos(toRad(right.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
}

function getAttractions(activities: PlannedActivity[]): PlannedActivity[] {
  return activities.filter((activity) => activity.type === 'attraction');
}

function hasMealActivity(
  day: StructuredItinerary['days'][number],
  slot: 'lunch' | 'dinner',
): boolean {
  return day.activities.some((activity) => activity.type === 'meal' && activity.mealType === slot);
}

function overloadThreshold(intent: PlanningIntent): number {
  if (intent.travelStyle === 'relaxed') return 2;
  if (intent.travelStyle === 'packed') return 4;
  return 3;
}

function hasBookingHint(activities: PlannedActivity[]): boolean {
  return activities.some((activity) => /预约|预订|门票|购票|实名/.test(activity.description));
}

function dayHasRelevantBookingConstraint(
  activities: PlannedActivity[],
  bookingTips: BookingTip[],
): boolean {
  return activities.some((activity) =>
    bookingTips.some((tip) => {
      const title = tip.title || '';
      const content = tip.content || '';
      const text = `${title} ${content}`;
      const normalizedTitle = title.replace(/预约|预订|门票|购票|实名|提醒/g, '').trim();
      const normalizedContent = content.replace(/预约|预订|门票|购票|实名|提醒/g, '').trim();
      const normalizedActivity = normalizeEntityName(activity.name);
      const normalizedText = normalizeEntityName(text);
      const relaxedActivity = activity.name.replace(/博物院|博物馆|公园|景区|景点/g, '').trim();
      return (
        isSimilarName(activity.name, title) ||
        isSimilarName(activity.name, content) ||
        isSimilarName(activity.name, text) ||
        text.includes(activity.name) ||
        (Boolean(relaxedActivity) && text.includes(relaxedActivity)) ||
        normalizedText.includes(normalizedActivity) ||
        (Boolean(normalizedTitle) && activity.name.includes(normalizedTitle)) ||
        (Boolean(normalizedContent) && activity.name.includes(normalizedContent))
      );
    }),
  );
}

function parseHour(value: string): number | null {
  const match = value.match(/(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
}

function shouldWarnTimeOfDay(activity: PlannedActivity): boolean {
  const hour = parseHour(activity.time);
  if (hour === null) return false;

  if (/鸣沙山|灯会|夜景/.test(activity.name) && hour < 15) {
    return true;
  }

  return false;
}

function getMealDetail(
  day: StructuredItinerary['days'][number],
  slot: 'lunch' | 'dinner',
): MealRecommendation | undefined {
  return day.mealDetails?.[slot];
}

function getAnchorAttraction(
  day: StructuredItinerary['days'][number],
  mealDetail: MealRecommendation | undefined,
): PlannedActivity | undefined {
  if (!mealDetail?.anchorAttractionName) {
    return undefined;
  }

  return day.activities.find(
    (activity) =>
      activity.type === 'attraction' && activity.name === mealDetail.anchorAttractionName,
  );
}

class ItineraryValidator {
  validate(
    itinerary: StructuredItinerary,
    intent: PlanningIntent,
    bookingTips: BookingTip[],
  ): ValidationResult {
    const warnings: ValidationWarning[] = [];
    const maxAttractionsPerDay = overloadThreshold(intent);
    let daysWithAttractions = 0;
    let eligibleRestaurantSlots = 0;
    let proximityCoveredSlots = 0;
    let proximityDistanceTotalMeters = 0;
    let proximityDistanceCount = 0;

    itinerary.days.forEach((day) => {
      const attractions = getAttractions(day.activities);
      if (attractions.length > 0) {
        daysWithAttractions += 1;
      } else {
        warnings.push({
          rule: 'daily_attraction_missing',
          day: day.day,
          severity: 'warning',
          message: '当日缺少景点，无法生成完整行程。',
        });
      }

      if (attractions.length > maxAttractionsPerDay) {
        warnings.push({
          rule: 'daily_overload',
          day: day.day,
          severity: 'warning',
          message: `当日景点数量 ${attractions.length} 超过建议上限 ${maxAttractionsPerDay}。`,
        });
      }

      for (let i = 0; i < attractions.length - 1; i += 1) {
        const current = attractions[i];
        const next = attractions[i + 1];
        if (!current.location || !next.location) continue;
        const km = distanceKm(current.location, next.location);
        if (km > 20) {
          warnings.push({
            rule: 'geographic_conflict',
            day: day.day,
            severity: 'warning',
            message: `${current.name} 与 ${next.name} 直线距离约 ${km.toFixed(1)}km，当日可能过于分散。`,
          });
          break;
        }
      }

      if (
        bookingTips.length > 0 &&
        dayHasRelevantBookingConstraint(attractions, bookingTips) &&
        !hasBookingHint(attractions)
      ) {
        warnings.push({
          rule: 'booking_constraint',
          day: day.day,
          severity: 'warning',
          message: '存在预约/购票约束，但当日活动描述未体现预约提示。',
        });
      }

      for (const activity of attractions) {
        if (shouldWarnTimeOfDay(activity)) {
          warnings.push({
            rule: 'time_of_day',
            day: day.day,
            severity: 'warning',
            message: `${activity.name} 更适合下午或傍晚安排，当前时段可能体验欠佳。`,
          });
          break;
        }
      }

      for (const slot of ['lunch', 'dinner'] as const) {
        if (attractions.length === 0) continue;
        eligibleRestaurantSlots += 1;

        if (!day.meals[slot] && !hasMealActivity(day, slot)) {
          warnings.push({
            rule: 'restaurant_missing',
            day: day.day,
            severity: 'warning',
            message: `${slot === 'lunch' ? '午餐' : '晚餐'}缺少餐厅，无法确认行程完整性。`,
          });
          continue;
        }

        const mealDetail = getMealDetail(day, slot);
        const anchorAttraction = getAnchorAttraction(day, mealDetail);

        if (!mealDetail || !mealDetail.anchorAttractionName) {
          warnings.push({
            rule: 'restaurant_missing',
            day: day.day,
            severity: 'warning',
            message: `${slot === 'lunch' ? '午餐' : '晚餐'}未绑定锚点景点，无法确认就近性。`,
          });
          continue;
        }

        if (!mealDetail.location || !anchorAttraction?.location) {
          warnings.push({
            rule: 'restaurant_proximity_missing',
            day: day.day,
            severity: 'warning',
            message: `${slot === 'lunch' ? '午餐' : '晚餐'}缺少餐厅或景点坐标，无法确认就近性。`,
          });
          continue;
        }

        const km = distanceKm(anchorAttraction.location, mealDetail.location);
        proximityDistanceTotalMeters += km * 1000;
        proximityDistanceCount += 1;
        if (km > 1.5) {
          warnings.push({
            rule: 'restaurant_proximity',
            day: day.day,
            severity: 'warning',
            message: `${slot === 'lunch' ? '午餐' : '晚餐'}距离锚点景点约 ${km.toFixed(1)}km，未达到就近餐厅要求。`,
          });
          continue;
        }
        proximityCoveredSlots += 1;
      }
    });
    const restaurantProximityCoverage =
      eligibleRestaurantSlots === 0 ? 0 : proximityCoveredSlots / eligibleRestaurantSlots;
    const dailyAttractionCompleteness =
      itinerary.days.length === 0 ? 0 : daysWithAttractions / itinerary.days.length;
    const restaurantAvgDistanceMeters =
      proximityDistanceCount === 0 ? null : proximityDistanceTotalMeters / proximityDistanceCount;

    return {
      can_generate: dailyAttractionCompleteness === 1 && restaurantProximityCoverage >= 0.8,
      warnings,
      coverage: {
        restaurantProximityCoverage,
        dailyAttractionCompleteness,
        restaurantAvgDistanceMeters,
      },
    };
  }
}

export const itineraryValidator = new ItineraryValidator();
