import type {
  BookingTip,
  DayPlan,
  MealRecommendation,
  PlaceCandidate,
  PlannedActivity,
  PlanningIntent,
  SlotResult,
  StructuredItinerary,
} from './contracts';
import { haversineDistanceMeters, isDuplicate, isSimilarName } from './entityNormalizer';
import i18n, { getCurrentLocale } from '@/i18n';
import { formatDate as fmtDate, formatTripBudget } from '@/utils/formatters';

interface PlannerInput {
  intent: PlanningIntent;
  slots: {
    core_attractions: SlotResult;
    food: SlotResult;
  };
  bookingTips: BookingTip[];
}

type DaySkeleton = {
  day: number;
  theme: string;
  activities: PlannedActivity[];
  morningAttraction?: PlaceCandidate;
  afternoonAttraction?: PlaceCandidate;
  alternativePlan?: string;
};

type MealPlan = {
  meals: DayPlan['meals'];
  mealDetails?: DayPlan['mealDetails'];
};

interface TwoPhasePlannerInput {
  intent: PlanningIntent;
  skeleton: DaySkeleton[];
  breakfastCandidates: PlaceCandidate[];
  lunchCandidatesByDay?: Record<number, PlaceCandidate[]>;
  dinnerCandidatesByDay?: Record<number, PlaceCandidate[]>;
  defaultFoodCandidates?: PlaceCandidate[];
  bookingTips: BookingTip[];
}

function buildDateRange(durationDays: number): string {
  const locale = getCurrentLocale();
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + durationDays - 1);
  return `${fmtDate(start, locale)} - ${fmtDate(end, locale)}`;
}

function budgetByStyle(intent: PlanningIntent): string {
  const perDay =
    intent.travelStyle === 'relaxed' ? 1300 : intent.travelStyle === 'packed' ? 800 : 1000;
  const total = perDay * intent.durationDays;
  return formatTripBudget(total, perDay, getCurrentLocale());
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
    // 剥离两种语种的"预订/门票"类高频词，便于按景点名近似匹配。
    const normalizedTitle = title
      .replace(/预约|预订|门票|购票|实名/g, '')
      .replace(/\b(booking|reservation|ticket|tickets|admission|reserve)\b/gi, '')
      .trim();
    return (
      isSimilarName(candidate.name, title) ||
      isSimilarName(candidate.name, content) ||
      title.includes(candidate.name) ||
      content.includes(candidate.name) ||
      (Boolean(normalizedTitle) && candidate.name.includes(normalizedTitle))
    );
  });
}

function buildAttractionActivity(
  time: string,
  candidate: PlaceCandidate,
  bookingTips: BookingTip[],
): PlannedActivity {
  const matchedTip = pickBookingTip(candidate, bookingTips);
  const bookingHint = matchedTip
    ? i18n.t('planner.service.bookingHint', { title: matchedTip.title, content: matchedTip.content })
    : '';

  return {
    id: candidate.id,
    time,
    name: candidate.name,
    description: `${candidate.description}${bookingHint}`.trim(),
    type: 'attraction',
    source: candidate.source,
    confidence: candidate.confidence,
    location: candidate.location,
    indoorOutdoor: candidate.indoorOutdoor,
    candidateId: candidate.id,
  };
}

function buildSkeletonDay(
  day: number,
  attractions: PlaceCandidate[],
  bookingTips: BookingTip[],
  options?: {
    baseIndex?: number;
    alternativePlan?: string;
    wrapAttractions?: boolean;
  },
): DaySkeleton {
  const baseIndex = options?.baseIndex ?? (day - 1) * 2;
  const wrapAttractions = options?.wrapAttractions ?? false;
  const morning = wrapAttractions ? attractions[baseIndex % attractions.length] : attractions[baseIndex];
  const afternoonCandidate = wrapAttractions
    ? attractions[(baseIndex + 1) % attractions.length]
    : attractions[baseIndex + 1];
  const afternoon =
    afternoonCandidate && (!morning || !isDuplicate(morning, afternoonCandidate))
      ? afternoonCandidate
      : undefined;

  const activities: PlannedActivity[] = [];
  if (morning) {
    activities.push(buildAttractionActivity('09:00', morning, bookingTips));
  }
  if (afternoon) {
    activities.push(buildAttractionActivity('14:30', afternoon, bookingTips));
  }
  activities.push({
    time: '19:00',
    name: i18n.t('planner.service.freeActivity'),
    description: i18n.t('planner.service.freeActivityDesc'),
    type: 'rest',
    source: 'llm',
    confidence: 0.4,
  });

  const themeBase = morning?.name || afternoon?.name || i18n.t('planner.service.themeFallback');

  return {
    day,
    theme: i18n.t('planner.service.themeSuffix', { base: themeBase }),
    activities,
    morningAttraction: morning,
    afternoonAttraction: afternoon,
    alternativePlan: options?.alternativePlan || i18n.t('planner.service.alternativePlanDefault'),
  };
}

function formatMealString(candidate: PlaceCandidate): string {
  return `${candidate.name} - ${candidate.description}`;
}

function buildMealRecommendation(
  candidate: PlaceCandidate,
  options?: {
    anchor?: PlaceCandidate;
    anchorTime?: string;
    fallbackUsed?: boolean;
  },
): MealRecommendation {
  const proximityMeters =
    candidate.location && options?.anchor?.location
      ? haversineDistanceMeters(candidate.location, options.anchor.location)
      : undefined;

  return {
    placeId: candidate.id,
    candidateId: candidate.id,
    name: candidate.name,
    description: candidate.description,
    source: candidate.source,
    confidence: candidate.confidence,
    location: candidate.location,
    price: candidate.price,
    anchorActivityId: options?.anchor?.id,
    anchorAttractionName: options?.anchor?.name,
    anchorActivityTime: options?.anchorTime,
    proximityMeters,
    fallbackUsed: options?.fallbackUsed,
  };
}

function pickByRotation(
  items: PlaceCandidate[],
  preferredIndex: number,
  usedRestaurantIds: Set<string>,
  usedTodayIds?: Set<string>,
): PlaceCandidate | undefined {
  if (items.length === 0) return undefined;

  // Prefer items unused in the whole trip.
  for (let offset = 0; offset < items.length; offset += 1) {
    const candidate = items[(preferredIndex + offset) % items.length];
    if (!usedRestaurantIds.has(candidate.id)) {
      return candidate;
    }
  }

  // Prefer not-used-today; only fall back to a duplicate if pool exhausted.
  if (usedTodayIds) {
    for (let offset = 0; offset < items.length; offset += 1) {
      const candidate = items[(preferredIndex + offset) % items.length];
      if (!usedTodayIds.has(candidate.id)) {
        return candidate;
      }
    }
  }

  return items[preferredIndex % items.length];
}

function rankNearbyRestaurants(anchor: PlaceCandidate, candidates: PlaceCandidate[]): PlaceCandidate[] {
  if (!anchor.location) {
    return [...candidates].sort((left, right) => right.confidence - left.confidence);
  }

  return [...candidates].sort((left, right) => {
    const leftDistance =
      left.location && anchor.location ? haversineDistanceMeters(anchor.location, left.location) : Number.POSITIVE_INFINITY;
    const rightDistance =
      right.location && anchor.location ? haversineDistanceMeters(anchor.location, right.location) : Number.POSITIVE_INFINITY;

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return right.confidence - left.confidence;
  });
}

function pickNearbyRestaurant(input: {
  anchor?: PlaceCandidate;
  anchorTime?: string;
  primaryCandidates?: PlaceCandidate[];
  fallbackCandidates?: PlaceCandidate[];
  usedRestaurantIds: Set<string>;
  usedTodayIds: Set<string>;
}): MealRecommendation | undefined {
  const primaryCandidates = dedupeCandidates(input.primaryCandidates ?? []);
  const fallbackCandidates = dedupeCandidates(input.fallbackCandidates ?? []);
  const rankedPrimary = input.anchor ? rankNearbyRestaurants(input.anchor, primaryCandidates) : primaryCandidates;
  const rankedFallback = input.anchor ? rankNearbyRestaurants(input.anchor, fallbackCandidates) : fallbackCandidates;

  const chooseFromPool = (
    pool: PlaceCandidate[],
    fallbackUsed: boolean,
  ): MealRecommendation | undefined => {
    if (pool.length === 0) return undefined;
    // Prefer same-day uniqueness, but allow duplication when the pool is
    // exhausted (1-candidate pool over 3 meal slots is a real case).
    const notUsedToday = pool.filter((c) => !input.usedTodayIds.has(c.id));
    const effectivePool = notUsedToday.length > 0 ? notUsedToday : pool;

    const nearestUnusedWithinThreshold =
      input.anchor?.location
        ? effectivePool.find((candidate) => {
            if (!candidate.location) return false;
            return (
              !input.usedRestaurantIds.has(candidate.id) &&
              haversineDistanceMeters(input.anchor!.location!, candidate.location) <= 1500
            );
          })
        : undefined;
    const nearestWithinThreshold =
      input.anchor?.location
        ? effectivePool.find((candidate) => {
            if (!candidate.location) return false;
            return haversineDistanceMeters(input.anchor!.location!, candidate.location) <= 1500;
          })
        : undefined;
    const unused = effectivePool.find((candidate) => !input.usedRestaurantIds.has(candidate.id));
    const chosen = nearestUnusedWithinThreshold || unused || nearestWithinThreshold || effectivePool[0];
    input.usedRestaurantIds.add(chosen.id);
    input.usedTodayIds.add(chosen.id);
    return buildMealRecommendation(chosen, {
      anchor: input.anchor,
      anchorTime: input.anchorTime,
      fallbackUsed,
    });
  };

  return chooseFromPool(rankedPrimary, false) || chooseFromPool(rankedFallback, true);
}

function countAttractions(days: DaySkeleton[]): number {
  return days.reduce(
    (sum, day) => sum + day.activities.filter((activity) => activity.type === 'attraction').length,
    0,
  );
}

function countUniqueAttractionAnchors(days: DaySkeleton[]): number {
  const ids = new Set<string>();
  days.forEach((day) => {
    if (day.morningAttraction) ids.add(day.morningAttraction.id);
    if (day.afternoonAttraction) ids.add(day.afternoonAttraction.id);
  });
  return ids.size;
}

function buildMealActivity(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  time: string,
  detail: MealRecommendation,
): PlannedActivity {
  return {
    id: `${mealType}-${detail.candidateId || detail.placeId || detail.name}`,
    time,
    name: detail.name,
    description: detail.description,
    type: 'meal',
    source: detail.source,
    confidence: detail.confidence,
    location: detail.location,
    mealType,
    anchorActivityId: detail.anchorActivityId,
    candidateId: detail.candidateId || detail.placeId,
  };
}

function buildDayPlanFromSkeleton(day: DaySkeleton, mealPlan?: MealPlan): DayPlan {
  const mealDetails = mealPlan?.mealDetails;
  const mealActivities: PlannedActivity[] = [];

  if (mealDetails?.breakfast) {
    mealActivities.push(buildMealActivity('breakfast', '08:00', mealDetails.breakfast));
  }
  if (mealDetails?.lunch) {
    mealActivities.push(buildMealActivity('lunch', '12:00', mealDetails.lunch));
  }
  if (mealDetails?.dinner) {
    mealActivities.push(buildMealActivity('dinner', '19:00', mealDetails.dinner));
  }

  return {
    day: day.day,
    theme: day.theme,
    activities: [...day.activities, ...mealActivities].sort((left, right) => left.time.localeCompare(right.time)),
    meals: mealPlan?.meals ?? {},
    mealDetails,
    alternativePlan: day.alternativePlan,
  };
}

class PlannerService {
  selectAttractionSkeleton(input: {
    intent: PlanningIntent;
    attractions: PlaceCandidate[];
    bookingTips: BookingTip[];
  }): DaySkeleton[] {
    const attractions = dedupeCandidates(input.attractions);
    const days: DaySkeleton[] = [];

    for (let i = 1; i <= input.intent.durationDays; i += 1) {
      days.push(buildSkeletonDay(i, attractions, input.bookingTips, {
        wrapAttractions: attractions.length > 0,
      }));
    }

    return days;
  }

  buildProximityMeals(input: {
    skeleton: DaySkeleton[];
    breakfastCandidates: PlaceCandidate[];
    lunchCandidatesByDay?: Record<number, PlaceCandidate[]>;
    dinnerCandidatesByDay?: Record<number, PlaceCandidate[]>;
    defaultFoodCandidates?: PlaceCandidate[];
  }): Record<number, MealPlan> {
    const breakfastCandidates = dedupeCandidates(input.breakfastCandidates);
    const defaultFoodCandidates = dedupeCandidates(input.defaultFoodCandidates ?? []);
    const usedRestaurantIds = new Set<string>();

    return Object.fromEntries(
      input.skeleton.map((day, index) => {
        // Per-day strict uniqueness: a single day must never serve the same restaurant twice.
        const usedTodayIds = new Set<string>();

        const breakfastCandidate = pickByRotation(
          breakfastCandidates.length > 0 ? breakfastCandidates : defaultFoodCandidates,
          index,
          usedRestaurantIds,
          usedTodayIds,
        );
        if (breakfastCandidate) {
          usedRestaurantIds.add(breakfastCandidate.id);
          usedTodayIds.add(breakfastCandidate.id);
        }

        const lunchDetail = day.morningAttraction
          ? pickNearbyRestaurant({
              anchor: day.morningAttraction,
              anchorTime: '09:00',
              primaryCandidates: input.lunchCandidatesByDay?.[day.day],
              fallbackCandidates: defaultFoodCandidates,
              usedRestaurantIds,
              usedTodayIds,
            })
          : undefined;
        const dinnerAnchor = day.afternoonAttraction || day.morningAttraction;
        const dinnerDetail = dinnerAnchor
          ? pickNearbyRestaurant({
              anchor: dinnerAnchor,
              anchorTime: day.afternoonAttraction ? '14:30' : '09:00',
              primaryCandidates: input.dinnerCandidatesByDay?.[day.day],
              fallbackCandidates: defaultFoodCandidates,
              usedRestaurantIds,
              usedTodayIds,
            })
          : undefined;

        const breakfastDetail = breakfastCandidate
          ? buildMealRecommendation(breakfastCandidate, { fallbackUsed: breakfastCandidates.length === 0 })
          : undefined;

        return [
          day.day,
          {
            meals: {
              breakfast: breakfastDetail ? formatMealString(breakfastCandidate as PlaceCandidate) : undefined,
              lunch: lunchDetail ? `${lunchDetail.name} - ${lunchDetail.description}` : undefined,
              dinner: dinnerDetail ? `${dinnerDetail.name} - ${dinnerDetail.description}` : undefined,
            },
            mealDetails:
              breakfastDetail || lunchDetail || dinnerDetail
                ? {
                    breakfast: breakfastDetail,
                    lunch: lunchDetail,
                    dinner: dinnerDetail,
                  }
                : undefined,
          } satisfies MealPlan,
        ] as const;
      }),
    );
  }

  buildStructuredItineraryTwoPhase(input: TwoPhasePlannerInput): StructuredItinerary {
    const mealPlans = this.buildProximityMeals({
      skeleton: input.skeleton,
      breakfastCandidates: input.breakfastCandidates,
      lunchCandidatesByDay: input.lunchCandidatesByDay,
      dinnerCandidatesByDay: input.dinnerCandidatesByDay,
      defaultFoodCandidates: input.defaultFoodCandidates,
    });

    const days: DayPlan[] = input.skeleton.map((day) => buildDayPlanFromSkeleton(day, mealPlans[day.day]));

    const totalAttractions = countAttractions(input.skeleton);
    const uniqueAttractions = countUniqueAttractionAnchors(input.skeleton);
    const breakfastPoolSize = dedupeCandidates(input.breakfastCandidates).length;
    const foodPoolSize = dedupeCandidates(input.defaultFoodCandidates ?? []).length;
    const unknowns: string[] = [];
    if (totalAttractions === 0) unknowns.push(i18n.t('planner.service.unknownNoAttractions'));
    if (breakfastPoolSize === 0 && foodPoolSize === 0) unknowns.push(i18n.t('planner.service.unknownNoFood'));
    if (input.bookingTips.length === 0) unknowns.push(i18n.t('planner.service.unknownNoBookingTips'));
    if (totalAttractions > 0 && uniqueAttractions < input.intent.durationDays * 2) {
      unknowns.push(i18n.t('planner.service.unknownAttractionShort'));
    }
    if (
      days.some(
        (day) => day.activities.some((activity) => activity.type === 'attraction') && (!day.meals.lunch || !day.meals.dinner),
      )
    ) {
      unknowns.push(i18n.t('planner.service.unknownAnchorMismatch'));
    }

    return {
      destination: input.intent.destination,
      dates: buildDateRange(input.intent.durationDays),
      budget: budgetByStyle(input.intent),
      days,
      unknowns,
    };
  }

  buildStructuredItinerary(input: PlannerInput): StructuredItinerary {
    const attractions = dedupeCandidates(input.slots.core_attractions.items);
    const foods = dedupeCandidates(input.slots.food.items);
    const skeleton = this.selectAttractionSkeleton({
      intent: input.intent,
      attractions,
      bookingTips: input.bookingTips,
    });

    return this.buildStructuredItineraryTwoPhase({
      intent: input.intent,
      skeleton,
      breakfastCandidates: foods,
      defaultFoodCandidates: foods,
      bookingTips: input.bookingTips,
    });
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

    const indoorPool = dedupeCandidates([
      ...input.indoorCandidates,
      ...(input.culturalCandidates ?? []),
    ]);
    const indoorOnly = indoorPool.filter((candidate) =>
      ['indoor', 'both'].includes(candidate.indoorOutdoor ?? 'outdoor'),
    );
    const preferredCandidates = indoorOnly.filter((candidate) => !existingNames.has(candidate.name));
    const chosenCandidates = preferredCandidates.length >= 2 ? preferredCandidates : indoorOnly;

    if (chosenCandidates.length === 0 && currentDay) {
      return currentDay;
    }

    const skeletonDay = buildSkeletonDay(input.day, chosenCandidates, input.bookingTips ?? [], {
      baseIndex: 0,
      alternativePlan: i18n.t('planner.service.rainyAlt'),
    });
    const mealPlan = this.buildProximityMeals({
      skeleton: [skeletonDay],
      breakfastCandidates: input.foodCandidates ?? [],
      defaultFoodCandidates: input.foodCandidates ?? [],
    })[input.day];

    return {
      day: skeletonDay.day,
      theme: i18n.t('planner.service.rainyThemeSuffix', { base: skeletonDay.theme }),
      activities: buildDayPlanFromSkeleton(skeletonDay, mealPlan).activities,
      meals: mealPlan?.meals ?? {},
      mealDetails: mealPlan?.mealDetails,
      alternativePlan: skeletonDay.alternativePlan,
    };
  }
}

export const plannerService = new PlannerService();
