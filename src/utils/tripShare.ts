import type { TripDetail } from '@/services/tripService';

function parseDate(dateStr?: string | null) {
  if (!dateStr) {
    return null;
  }

  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTripDate(dateStr?: string | null, locale: 'zh-CN' | 'en-US' = 'zh-CN') {
  const date = parseDate(dateStr);
  if (!date) {
    return '';
  }

  return date.toLocaleDateString(locale, locale === 'zh-CN'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTripDateRange(
  startDate?: string | null,
  endDate?: string | null,
  locale: 'zh-CN' | 'en-US' = 'zh-CN',
) {
  const start = formatTripDate(startDate, locale);
  const end = formatTripDate(endDate, locale);
  if (!start && !end) {
    return '';
  }
  if (!end || start === end) {
    return start;
  }
  return `${start} - ${end}`;
}

export function getTripDayCount(input: {
  duration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  itinerariesCount?: number;
}) {
  if (input.itinerariesCount && input.itinerariesCount > 0) {
    return input.itinerariesCount;
  }

  const durationMatch = input.duration?.match(/\d+/);
  if (durationMatch) {
    return Number(durationMatch[0]);
  }

  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  if (start && end) {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  return 1;
}

export function buildTripShareUrl(tripId: string) {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/trip/${tripId}`;
  }
  return `https://smarttravel.ai/trip/${tripId}`;
}

export function extractTripHighlights(trip: TripDetail, limit = 3) {
  return trip.trip_itineraries
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .flatMap((itinerary) => (itinerary.activities ?? [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((activity) => activity.name)
      .filter(Boolean))
    .filter((name, index, list) => list.indexOf(name) === index)
    .slice(0, limit);
}
