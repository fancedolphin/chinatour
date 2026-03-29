import { amapFallbackService } from './amapFallbackService';
import { extractPlanningIntent } from './intentService';
import { itineraryValidator } from './itineraryValidator';
import { plannerService } from './plannerService';
import { planningMetricsStore } from './planningMetrics';
import { ragService } from './ragService';
import type { StructuredItinerary, TripPlanningResponse } from './contracts';

interface PlanInput {
  userMessage: string;
  currentPlan?: StructuredItinerary | null;
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
      tripPlan,
      validation,
      diagnostics: {
        unsatisfiedSlots: retrieval.unsatisfiedSlots,
        amapCalls: fallbackResult.amapCalls,
        stageTimings,
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
}

export const tripPlanningService = new TripPlanningService();
