import { buildNarrativePrompt } from '@/services/llm/promptBuilder';
import { narrativeModel } from '@/services/llm/llmConfig';
import { amapFallbackService } from './amapFallbackService';
import { extractPlanningIntent } from './intentService';
import { itineraryValidator } from './itineraryValidator';
import { plannerService } from './plannerService';
import { planningMetricsStore } from './planningMetrics';
import { ragService } from './ragService';
import { weatherReplanningService } from './weatherReplanningService';
import type { StructuredItinerary, TripPlanningResponse } from './contracts';

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

class TripPlanningService {
  async plan(input: PlanInput): Promise<TripPlanningResponse> {
    const requestId = createRequestId();
    const totalStart = performance.now();

    const intent = extractPlanningIntent(input.userMessage, input.currentPlan);

    const retrieval = await ragService.retrieveBySlots(intent, requestId);

    const fallbackStart = performance.now();
    const fallbackResult = await amapFallbackService.applyFallbackIfNeeded(intent, retrieval, requestId);
    const fallbackMs = performance.now() - fallbackStart;

    const plannerStart = performance.now();
    const tripPlan = plannerService.buildStructuredItinerary({
      intent,
      slots: {
        core_attractions: fallbackResult.slots.core_attractions,
        food: fallbackResult.slots.food,
      },
      bookingTips: retrieval.bookingTips,
    });
    const plannerMs = performance.now() - plannerStart;

    const validatorStart = performance.now();
    const validation = itineraryValidator.validate(tripPlan, intent, retrieval.bookingTips);
    const validatorMs = performance.now() - validatorStart;

    const totalMs = performance.now() - totalStart;

    const stageTimings = {
      embedding: retrieval.stageTimings.embedding,
      rag_retrieve: retrieval.stageTimings.rag_retrieve,
      amap_fallback: fallbackMs,
      planner: plannerMs,
      validator: validatorMs,
      total: totalMs,
    };

    const text = this.buildAssistantText({
      tripPlan,
      canGenerate: validation.can_generate,
      warningCount: validation.warnings.length,
      fallbackTriggered: fallbackResult.fallbackTriggered,
      amapCalls: fallbackResult.amapCalls,
    });

    planningMetricsStore.record({
      requestId,
      fallbackTriggered: fallbackResult.fallbackTriggered,
      amapCalls: fallbackResult.amapCalls,
      canGenerate: validation.can_generate,
      stageTimings,
    });

    const metricsSnapshot = planningMetricsStore.getReport();
    console.info(`[tripPlanningService][${requestId}]`, {
      stageTimings,
      unsatisfiedSlots: retrieval.unsatisfiedSlots,
      fallbackTriggered: fallbackResult.fallbackTriggered,
      amapCalls: fallbackResult.amapCalls,
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
        unsatisfiedSlots: retrieval.unsatisfiedSlots,
        amapCalls: fallbackResult.amapCalls,
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
        input.userMessage || `${input.currentPlan.destination} 雨天改成室内方案`,
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

    const tripPlan: StructuredItinerary = {
      ...input.currentPlan,
      days: input.currentPlan.days.map((day) =>
        day.day === input.day ? replanContext.dayPlan : day,
      ),
    };
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
          rag_retrieve: 0,
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
      return '当前检索到的景点信息不足，已返回最小结构化结果。请补充更明确的目的地或偏好后重试。';
    }

    const lines: string[] = [];
    lines.push(`已生成 ${input.tripPlan.days.length} 天「${input.tripPlan.destination}」行程。`);
    if (input.fallbackTriggered) {
      lines.push(`关键槽位不足，已触发 AMap fallback（调用 ${input.amapCalls} 次）。`);
    }
    if (input.warningCount > 0) {
      lines.push(`检测到 ${input.warningCount} 条可执行性提醒，建议你在保存前查看。`);
    }
    if (input.tripPlan.unknowns.length > 0) {
      lines.push(`未确定信息：${input.tripPlan.unknowns.join('；')}`);
    }

    return lines.join('\n');
  }

  private buildWeatherReplanFallbackText(
    day: number,
    dayPlan: StructuredItinerary['days'][number],
    didChangeDay: boolean,
  ): string {
    if (!didChangeDay) {
      return `第 ${day} 天暂未检索到更合适的室内替代点位，已保留原日程。`;
    }

    const activityNames = dayPlan.activities
      .filter((activity) => activity.type === 'attraction')
      .map((activity) => activity.name)
      .join('、');
    return `已将第 ${day} 天改为雨天室内安排，优先保留室内或室内外皆可的活动：${activityNames || '请查看更新后的日程'}。`;
  }
}

export const tripPlanningService = new TripPlanningService();
