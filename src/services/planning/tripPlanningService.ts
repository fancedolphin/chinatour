import { buildNarrativePrompt } from '@/services/llm/promptBuilder';
import { narrativeModel } from '@/services/llm/llmConfig';
import { amapFallbackService } from './amapFallbackService';
import { extractPlanningIntent } from './intentService';
import { itineraryValidator } from './itineraryValidator';
import { plannerService } from './plannerService';
import { planningMetricsStore } from './planningMetrics';
import { ragService } from './ragService';
import { weatherReplanningService } from './weatherReplanningService';
import { itineraryTranslator } from './itineraryTranslator';
import type { PlaceCandidate, SlotName, StructuredItinerary, TripPlanningResponse } from './contracts';
import i18n, { getCurrentLocale } from '@/i18n';

interface PlanInput {
  userMessage: string;
  currentPlan?: StructuredItinerary | null;
}

interface WeatherReplanInput {
  day: number;
  currentPlan: StructuredItinerary;
  intent?: ReturnType<typeof extractPlanningIntent>;
  userMessage?: string;
}

function getAttractionSignature(dayPlan?: StructuredItinerary['days'][number] | null): string {
  return (dayPlan?.activities ?? [])
    .filter((activity) => activity.type === 'attraction')
    .map((activity) => `${activity.time}:${activity.name}`)
    .join('|');
}

function hasDayPlanChanged(
  previousDay: StructuredItinerary['days'][number] | undefined,
  nextDay: StructuredItinerary['days'][number],
): boolean {
  if (!previousDay) return true;

  return (
    previousDay.theme !== nextDay.theme ||
    getAttractionSignature(previousDay) !== getAttractionSignature(nextDay) ||
    JSON.stringify(previousDay.meals) !== JSON.stringify(nextDay.meals)
  );
}

function createRequestId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `req_${Date.now()}_${random}`;
}

function buildAnchorKey(day: number, slot: 'lunch' | 'dinner'): string {
  return `day${day}_${slot}`;
}

class TripPlanningService {
  async plan(input: PlanInput): Promise<TripPlanningResponse> {
    const requestId = createRequestId();
    const totalStart = performance.now();

    const intent = extractPlanningIntent(input.userMessage, input.currentPlan);
    const attractionContext = await ragService.retrieveAttractionsOnly(intent, requestId);

    const attractionFallbackStart = performance.now();
    const attractionFallback = await amapFallbackService.applyAttractionFallback(
      intent,
      attractionContext.slot,
      requestId,
    );
    const attractionFallbackMs = performance.now() - attractionFallbackStart;
    let restaurantFallbackMs = 0;
    let totalAmapCalls = attractionFallback.amapCalls;
    let fallbackTriggered = attractionFallback.fallbackTriggered;

    const skeleton = plannerService.selectAttractionSkeleton({
      intent,
      attractions: attractionFallback.slot.items,
      bookingTips: attractionContext.bookingTips,
    });
    const restaurantAnchorCount = skeleton.reduce((count, day) => {
      return count + Number(Boolean(day.morningAttraction)) + Number(Boolean(day.afternoonAttraction || day.morningAttraction));
    }, 0);
    const fallbackBudget = { remaining: Math.ceil(restaurantAnchorCount * 0.5) };
    const restaurantFallbackCache = new Map<string, PlaceCandidate[]>();

    const restaurantStart = performance.now();
    const breakfastContext = await ragService.retrieveRestaurantsForDestination(
      intent,
      `${requestId}_breakfast`,
    );
    let breakfastSlot = breakfastContext.slot;

    if (!breakfastSlot.satisfied) {
      const restaurantFallbackStart = performance.now();
      const fallback = await amapFallbackService.applyRestaurantFallbackNear(
        undefined,
        intent,
        breakfastSlot,
        `${requestId}_breakfast_fallback`,
        { budget: fallbackBudget, cache: restaurantFallbackCache },
      );
      restaurantFallbackMs += performance.now() - restaurantFallbackStart;
      breakfastSlot = fallback.slot;
      totalAmapCalls += fallback.amapCalls;
      fallbackTriggered = fallbackTriggered || fallback.fallbackTriggered;
    }

    const lunchCandidatesByDay: Record<number, PlaceCandidate[]> = {};
    const dinnerCandidatesByDay: Record<number, PlaceCandidate[]> = {};
    let restaurantProximityMs = breakfastContext.stageTimings.retrieval;

    const retrieveRestaurantSlotNearAnchor = async (
      anchor: PlaceCandidate,
      key: string,
    ): Promise<PlaceCandidate[]> => {
      const firstPass = await ragService.retrieveRestaurantsNear(anchor, intent, key, {
        radiusMeters: 1500,
        matchCount: 4,
        includeDestinationFallback: false,
        includeKeywordFallback: false,
      });
      restaurantProximityMs += firstPass.stageTimings.retrieval;
      if (firstPass.slot.satisfied) {
        return firstPass.slot.items;
      }

      const expandedPass = await ragService.retrieveRestaurantsNear(anchor, intent, `${key}_3km`, {
        radiusMeters: 3000,
        matchCount: 6,
        includeDestinationFallback: false,
        includeKeywordFallback: false,
      });
      restaurantProximityMs += expandedPass.stageTimings.retrieval;
      if (expandedPass.slot.satisfied) {
        return expandedPass.slot.items;
      }

      const restaurantFallbackStart = performance.now();
      const fallback = await amapFallbackService.applyRestaurantFallbackNear(
        anchor,
        intent,
        expandedPass.slot,
        `${key}_fallback`,
        { budget: fallbackBudget, cache: restaurantFallbackCache },
      );
      restaurantFallbackMs += performance.now() - restaurantFallbackStart;
      totalAmapCalls += fallback.amapCalls;
      fallbackTriggered = fallbackTriggered || fallback.fallbackTriggered;

      return fallback.slot.items;
    };

    for (const day of skeleton) {
      const lunchAnchor = day.morningAttraction;
      if (lunchAnchor) {
        lunchCandidatesByDay[day.day] = await retrieveRestaurantSlotNearAnchor(
          lunchAnchor,
          `${requestId}_${buildAnchorKey(day.day, 'lunch')}`,
        );
      }

      const dinnerAnchor = day.afternoonAttraction || day.morningAttraction;
      if (dinnerAnchor) {
        dinnerCandidatesByDay[day.day] = await retrieveRestaurantSlotNearAnchor(
          dinnerAnchor,
          `${requestId}_${buildAnchorKey(day.day, 'dinner')}`,
        );
      }
    }

    const fallbackMs = attractionFallbackMs + restaurantFallbackMs;
    const plannerStart = performance.now();
    let tripPlan = plannerService.buildStructuredItineraryTwoPhase({
      intent,
      skeleton,
      breakfastCandidates: breakfastSlot.items,
      lunchCandidatesByDay,
      dinnerCandidatesByDay,
      defaultFoodCandidates: breakfastSlot.items,
      bookingTips: attractionContext.bookingTips,
    });
    const plannerMs = performance.now() - plannerStart;

    if (getCurrentLocale() === 'en') {
      tripPlan = await itineraryTranslator.translateToEnglish(tripPlan);
    }

    const validatorStart = performance.now();
    const validation = itineraryValidator.validate(tripPlan, intent, attractionContext.bookingTips);
    const validatorMs = performance.now() - validatorStart;

    const totalMs = performance.now() - totalStart;
    const unsatisfiedSlots: SlotName[] = [];
    if (!attractionFallback.slot.satisfied) {
      unsatisfiedSlots.push('core_attractions');
    }
    if (
      !breakfastSlot.satisfied ||
      skeleton.some((day) => day.morningAttraction && !(lunchCandidatesByDay[day.day]?.length > 0)) ||
      skeleton.some(
        (day) =>
          (day.afternoonAttraction || day.morningAttraction) &&
          !(dinnerCandidatesByDay[day.day]?.length > 0),
      )
    ) {
      unsatisfiedSlots.push('food');
    }

    const stageTimings = {
      embedding: attractionContext.stageTimings.embedding + breakfastContext.stageTimings.embedding,
      attraction_retrieval: attractionContext.stageTimings.attraction_retrieval,
      restaurant_proximity: restaurantProximityMs,
      restaurant_fallback: restaurantFallbackMs,
      amap_fallback: fallbackMs,
      planner: plannerMs,
      validator: validatorMs,
      total: totalMs,
    };

    const text = this.buildAssistantText({
      tripPlan,
      canGenerate: validation.can_generate,
      warningCount: validation.warnings.length,
      fallbackTriggered,
      amapCalls: totalAmapCalls,
    });

    planningMetricsStore.record({
      requestId,
      fallbackTriggered,
      amapCalls: totalAmapCalls,
      canGenerate: validation.can_generate,
      stageTimings,
    });

    const metricsSnapshot = planningMetricsStore.getReport();
    console.info(`[tripPlanningService][${requestId}]`, {
      stageTimings,
      unsatisfiedSlots,
      fallbackTriggered,
      amapCalls: totalAmapCalls,
      can_generate: validation.can_generate,
      metricsSnapshot,
    });

    return {
      requestId,
      text,
      intent,
      tripPlan,
      validation,
      diagnostics: {
        unsatisfiedSlots,
        amapCalls: totalAmapCalls,
        stageTimings,
      },
    };
  }

  async replanDayForBadWeather(input: WeatherReplanInput): Promise<TripPlanningResponse> {
    const requestId = createRequestId();
    const totalStart = performance.now();
    const intent =
      input.intent ||
      extractPlanningIntent(
        input.userMessage || i18n.t('planner.service.rainyIntent', { destination: input.currentPlan.destination }),
        input.currentPlan,
        { destination: input.currentPlan.destination },
      );

    const plannerStart = performance.now();
    const replanContext = await weatherReplanningService.replanDayForBadWeather({
      day: input.day,
      itinerary: input.currentPlan,
      intent,
    });
    const plannerMs = performance.now() - plannerStart;

    let tripPlan: StructuredItinerary = {
      ...input.currentPlan,
      days: input.currentPlan.days.map((day) =>
        day.day === input.day ? replanContext.dayPlan : day,
      ),
    };

    if (getCurrentLocale() === 'en') {
      tripPlan = await itineraryTranslator.translateToEnglish(tripPlan);
    }
    const previousDay = input.currentPlan.days.find((day) => day.day === input.day);
    const didChangeDay = hasDayPlanChanged(previousDay, replanContext.dayPlan);

    const validatorStart = performance.now();
    const validation = itineraryValidator.validate(tripPlan, intent, replanContext.bookingTips);
    const validatorMs = performance.now() - validatorStart;
    const totalMs = performance.now() - totalStart;

    let text = this.buildWeatherReplanFallbackText(input.day, replanContext.dayPlan, didChangeDay);
    if (didChangeDay) {
      try {
        const prompt = buildNarrativePrompt({
          intent,
          slots: {
            core_attractions: replanContext.slots.core_attractions,
            cultural_experiences: replanContext.slots.cultural_experiences,
          },
          bookingTips: replanContext.bookingTips,
          currentPlan: {
            ...tripPlan,
            days: [replanContext.dayPlan],
          },
          dayOverride: input.day,
          weatherContext: 'rainy day indoor replan',
        });

        const response = await narrativeModel
          .get('Rewrite only the selected day for rainy weather. Keep the plan factual and indoor-first.')
          .generateContent(prompt);
        const generated = response.response.text().trim();
        if (generated) {
          text = generated;
        }
      } catch (error) {
        console.warn(`[tripPlanningService][${requestId}] weather narrative fallback:`, error);
      }
    }

    return {
      requestId,
      text,
      intent,
      tripPlan,
      validation,
      diagnostics: {
        unsatisfiedSlots: [],
        amapCalls: 0,
        stageTimings: {
          embedding: 0,
          attraction_retrieval: 0,
          restaurant_proximity: 0,
          restaurant_fallback: 0,
          amap_fallback: 0,
          planner: plannerMs,
          validator: validatorMs,
          total: totalMs,
        },
      },
    };
  }

  getMetricsReport() {
    return planningMetricsStore.getReport();
  }

  private buildAssistantText(input: {
    tripPlan: StructuredItinerary;
    canGenerate: boolean;
    warningCount: number;
    fallbackTriggered: boolean;
    amapCalls: number;
  }): string {
    if (!input.canGenerate) {
      return i18n.t('planner.service.assistantInsufficient');
    }

    const lines: string[] = [];
    lines.push(i18n.t('planner.service.assistantSummary', {
      count: input.tripPlan.days.length,
      destination: input.tripPlan.destination,
    }));
    if (input.fallbackTriggered) {
      lines.push(i18n.t('planner.service.assistantFallbackTriggered', { count: input.amapCalls }));
    }
    if (input.warningCount > 0) {
      lines.push(i18n.t('planner.service.assistantWarningCount', { count: input.warningCount }));
    }
    if (input.tripPlan.unknowns.length > 0) {
      lines.push(i18n.t('planner.service.assistantUnknowns', {
        value: input.tripPlan.unknowns.join('; '),
      }));
    }

    return lines.join('\n');
  }

  private buildWeatherReplanFallbackText(
    day: number,
    dayPlan: StructuredItinerary['days'][number],
    didChangeDay: boolean,
  ): string {
    if (!didChangeDay) {
      return i18n.t('planner.service.weatherKeptText', { day });
    }

    const activityNames = dayPlan.activities
      .filter((activity) => activity.type === 'attraction')
      .map((activity) => activity.name)
      .join(', ');
    return i18n.t('planner.service.weatherChangedText', {
      day,
      names: activityNames || i18n.t('planner.service.weatherChangedFallback'),
    });
  }
}

export const tripPlanningService = new TripPlanningService();
