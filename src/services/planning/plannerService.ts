import type {
  BookingTip,
  DayPlan,
  PlaceCandidate,
  PlannedActivity,
  PlanningIntent,
  SlotResult,
  StructuredItinerary,
} from './contracts';
import { isDuplicate, isSimilarName } from './entityNormalizer';

interface PlannerInput {
  intent: PlanningIntent;
  slots: {
    core_attractions: SlotResult;
    food: SlotResult;
  };
  bookingTips: BookingTip[];
}

function formatDate(date: Date, includeYear: boolean): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return includeYear ? `${year}年${month}月${day}日` : `${month}月${day}日`;
}

function buildDateRange(durationDays: number): string {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + durationDays - 1);
  return `${formatDate(start, true)} - ${formatDate(end, false)}`;
}

function budgetByStyle(intent: PlanningIntent): string {
  const perDay =
    intent.travelStyle === 'relaxed' ? 1300 : intent.travelStyle === 'packed' ? 800 : 1000;
  const total = perDay * intent.durationDays;
  return `约¥${total.toLocaleString()}（人均¥${perDay}/天）`;
}

function pick<T>(items: T[], index: number, wrap = true): T | undefined {
  if (items.length === 0) return undefined;
  if (!wrap) {
    return items[index];
  }
  return items[index % items.length];
}

function dedupeCandidates(items: PlaceCandidate[]): PlaceCandidate[] {
  return items.reduce<PlaceCandidate[]>((unique, candidate) => {
    const index = unique.findIndex((existing) => isDuplicate(existing, candidate));
    if (index === -1) {
      unique.push(candidate);
      return unique;
    }

    if (candidate.confidence > unique[index].confidence) {
      unique[index] = candidate;
    }
    return unique;
  }, []);
}

function pickBookingTip(candidate: PlaceCandidate, bookingTips: BookingTip[]): BookingTip | undefined {
  return bookingTips.find((tip) => {
    const title = tip.title || '';
    const content = tip.content || '';
    const normalizedTitle = title.replace(/预约|预订|门票|购票|实名/g, '').trim();
    return (
      isSimilarName(candidate.name, title) ||
      isSimilarName(candidate.name, content) ||
      title.includes(candidate.name) ||
      content.includes(candidate.name) ||
      Boolean(normalizedTitle) && candidate.name.includes(normalizedTitle)
    );
  });
}

function buildAttractionActivity(
  time: string,
  candidate: PlaceCandidate,
  bookingTips: BookingTip[],
): PlannedActivity {
  const matchedTip = pickBookingTip(candidate, bookingTips);
  const bookingHint = matchedTip ? `；预约提示：${matchedTip.title} - ${matchedTip.content}` : '';

  return {
    time,
    name: candidate.name,
    description: `${candidate.description}${bookingHint}`.trim(),
    type: 'attraction',
    source: candidate.source,
    confidence: candidate.confidence,
    location: candidate.location,
    indoorOutdoor: candidate.indoorOutdoor,
  };
}

function buildMeals(dayIndex: number, foodCandidates: PlaceCandidate[]): DayPlan['meals'] {
  const breakfast = pick(foodCandidates, dayIndex * 3);
  const lunch = pick(foodCandidates, dayIndex * 3 + 1);
  const dinner = pick(foodCandidates, dayIndex * 3 + 2);

  return {
    breakfast: breakfast ? `${breakfast.name} - ${breakfast.description}` : undefined,
    lunch: lunch ? `${lunch.name} - ${lunch.description}` : undefined,
    dinner: dinner ? `${dinner.name} - ${dinner.description}` : undefined,
  };
}

function mergeMeals(
  existingMeals: DayPlan['meals'] | undefined,
  nextMeals: DayPlan['meals'],
): DayPlan['meals'] {
  return {
    breakfast: nextMeals.breakfast ?? existingMeals?.breakfast,
    lunch: nextMeals.lunch ?? existingMeals?.lunch,
    dinner: nextMeals.dinner ?? existingMeals?.dinner,
  };
}

function buildDayPlan(
  day: number,
  attractions: PlaceCandidate[],
  foods: PlaceCandidate[],
  bookingTips: BookingTip[],
  options?: {
    baseIndex?: number;
    alternativePlan?: string;
    wrapAttractions?: boolean;
  },
): DayPlan {
  const baseIndex = options?.baseIndex ?? (day - 1) * 2;
  const morning = pick(attractions, baseIndex, options?.wrapAttractions ?? false);
  const afternoonCandidate = pick(attractions, baseIndex + 1, options?.wrapAttractions ?? false);
  const afternoon =
    afternoonCandidate && (!morning || !isDuplicate(morning, afternoonCandidate))
      ? afternoonCandidate
      : undefined;

  const activities: PlannedActivity[] = [];
  if (morning) {
    activities.push(buildAttractionActivity('09:00', morning, bookingTips));
  }
  activities.push({
    time: '12:00',
    name: '午间移动',
    description: '按就近原则前往午餐区域。',
    type: 'transport',
    source: 'llm',
    confidence: 0.45,
  });
  if (afternoon) {
    activities.push(buildAttractionActivity('14:30', afternoon, bookingTips));
  }
  activities.push({
    time: '19:00',
    name: '自由活动',
    description: '根据体力安排夜间散步或休息。',
    type: 'rest',
    source: 'llm',
    confidence: 0.4,
  });

  const themeBase = morning?.name || afternoon?.name || '自由探索';

  return {
    day,
    theme: `${themeBase} 深度体验`,
    activities,
    meals: buildMeals(day - 1, foods),
    alternativePlan: options?.alternativePlan || '如遇下雨，可将户外活动替换为博物馆或商业综合体。',
  };
}

class PlannerService {
  buildStructuredItinerary(input: PlannerInput): StructuredItinerary {
    const attractions = dedupeCandidates(input.slots.core_attractions.items);
    const foods = dedupeCandidates(input.slots.food.items);

    const days: DayPlan[] = [];
    for (let i = 1; i <= input.intent.durationDays; i += 1) {
      days.push(buildDayPlan(i, attractions, foods, input.bookingTips));
    }

    const unknowns: string[] = [];
    if (attractions.length === 0) unknowns.push('缺少景点候选，建议补充目的地关键词');
    if (foods.length === 0) unknowns.push('缺少餐饮候选，建议补充饮食偏好');
    if (input.bookingTips.length === 0) unknowns.push('未检索到预约/购票约束');
    if (attractions.length > 0 && attractions.length < input.intent.durationDays) {
      unknowns.push('景点候选数量不足，后续日期可能需要人工补充或减少天数');
    }

    return {
      destination: input.intent.destination,
      dates: buildDateRange(input.intent.durationDays),
      budget: budgetByStyle(input.intent),
      days,
      unknowns,
    };
  }

  replanDayForBadWeather(input: {
    itinerary: StructuredItinerary;
    day: number;
    indoorCandidates: PlaceCandidate[];
    culturalCandidates?: PlaceCandidate[];
    foodCandidates?: PlaceCandidate[];
    bookingTips?: BookingTip[];
  }): DayPlan {
    const currentDay = input.itinerary.days.find((item) => item.day === input.day);
    const existingNames = new Set(
      currentDay?.activities
        .filter((activity) => activity.type === 'attraction')
        .map((activity) => activity.name) ?? [],
    );

    const indoorPool = dedupeCandidates([...input.indoorCandidates, ...(input.culturalCandidates ?? [])]);
    const indoorOnly = indoorPool.filter((candidate) =>
      ['indoor', 'both'].includes(candidate.indoorOutdoor ?? 'outdoor'),
    );
    const preferredCandidates = indoorOnly.filter((candidate) => !existingNames.has(candidate.name));
    const chosenCandidates = preferredCandidates.length >= 2 ? preferredCandidates : indoorOnly;

    if (chosenCandidates.length === 0 && currentDay) {
      return currentDay;
    }

    const replannedDay = buildDayPlan(
      input.day,
      chosenCandidates,
      input.foodCandidates ?? [],
      input.bookingTips ?? [],
      {
        baseIndex: 0,
        alternativePlan: '已改为室内优先方案，保留可步行或短途移动的备选点位。',
      },
    );

    return {
      ...replannedDay,
      theme: `${replannedDay.theme}（雨天改线）`,
      meals: mergeMeals(currentDay?.meals, replannedDay.meals),
    };
  }
}

export const plannerService = new PlannerService();
