import type {
  BookingTip,
  PlannedActivity,
  PlanningIntent,
  StructuredItinerary,
  ValidationResult,
  ValidationWarning,
} from './contracts';

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

function overloadThreshold(intent: PlanningIntent): number {
  if (intent.travelStyle === 'relaxed') return 2;
  if (intent.travelStyle === 'packed') return 4;
  return 3;
}

function hasBookingHint(activities: PlannedActivity[]): boolean {
  return activities.some((activity) => /预约|预订|门票|购票|实名/.test(activity.description));
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

class ItineraryValidator {
  validate(
    itinerary: StructuredItinerary,
    intent: PlanningIntent,
    bookingTips: BookingTip[],
  ): ValidationResult {
    const warnings: ValidationWarning[] = [];
    const maxAttractionsPerDay = overloadThreshold(intent);

    itinerary.days.forEach((day) => {
      const attractions = getAttractions(day.activities);

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

      if (bookingTips.length > 0 && !hasBookingHint(attractions)) {
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
    });

    const totalAttractions = itinerary.days
      .flatMap((day) => day.activities)
      .filter((activity) => activity.type === 'attraction').length;

    return {
      can_generate: totalAttractions > 0,
      warnings,
    };
  }
}

export const itineraryValidator = new ItineraryValidator();
