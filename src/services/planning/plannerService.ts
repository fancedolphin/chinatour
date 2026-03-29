import type {
  BookingTip,
  DayPlan,
  PlaceCandidate,
  PlannedActivity,
  PlanningIntent,
  SlotResult,
  StructuredItinerary,
} from './contracts';

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
    intent.travelStyle === 'relaxed' ? 1300 : intent.travelStyle === 'aggressive' ? 800 : 1000;
  const total = perDay * intent.durationDays;
  return `约¥${total.toLocaleString()}（人均¥${perDay}/天）`;
}

function pick<T>(items: T[], index: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[index % items.length];
}

function buildAttractionActivity(
  time: string,
  candidate: PlaceCandidate,
  bookingTips: BookingTip[],
): PlannedActivity {
  const bookingHint =
    bookingTips.length > 0 ? `；预约提示：${bookingTips[0].title} - ${bookingTips[0].content}` : '';

  return {
    time,
    name: candidate.name,
    description: `${candidate.description}${bookingHint}`.trim(),
    type: 'attraction',
    source: candidate.source,
    confidence: candidate.confidence,
    location: candidate.location,
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

function buildDayPlan(
  day: number,
  attractions: PlaceCandidate[],
  foods: PlaceCandidate[],
  bookingTips: BookingTip[],
): DayPlan {
  const baseIndex = (day - 1) * 2;
  const morning = pick(attractions, baseIndex);
  const afternoon = pick(attractions, baseIndex + 1) || morning;

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

  const themeBase = morning?.name || afternoon?.name || '城市探索';

  return {
    day,
    theme: `${themeBase} 深度体验`,
    activities,
    meals: buildMeals(day - 1, foods),
    alternativePlan: '如遇下雨，可将户外活动替换为博物馆或商业综合体。',
  };
}

class PlannerService {
  buildStructuredItinerary(input: PlannerInput): StructuredItinerary {
    const attractions = input.slots.core_attractions.items;
    const foods = input.slots.food.items;

    const days: DayPlan[] = [];
    for (let i = 1; i <= input.intent.durationDays; i += 1) {
      days.push(buildDayPlan(i, attractions, foods, input.bookingTips));
    }

    const unknowns: string[] = [];
    if (attractions.length === 0) unknowns.push('缺少景点候选，建议补充目的地关键词');
    if (foods.length === 0) unknowns.push('缺少餐饮候选，建议补充饮食偏好');
    if (input.bookingTips.length === 0) unknowns.push('未检索到预约/购票约束');

    return {
      destination: input.intent.destination,
      dates: buildDateRange(input.intent.durationDays),
      budget: budgetByStyle(input.intent),
      days,
      unknowns,
    };
  }
}

export const plannerService = new PlannerService();
