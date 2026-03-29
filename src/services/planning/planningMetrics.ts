type PlanningRunMetrics = {
  requestId: string;
  fallbackTriggered: boolean;
  amapCalls: number;
  canGenerate: boolean;
  stageTimings: {
    embedding: number;
    rag_retrieve: number;
    amap_fallback: number;
    planner: number;
    validator: number;
    total: number;
  };
};

const MAX_SAMPLES = 200;

class PlanningMetricsStore {
  private runs: PlanningRunMetrics[] = [];

  record(run: PlanningRunMetrics): void {
    this.runs.push(run);
    if (this.runs.length > MAX_SAMPLES) {
      this.runs = this.runs.slice(this.runs.length - MAX_SAMPLES);
    }
  }

  getReport() {
    if (this.runs.length === 0) {
      return {
        totalRequests: 0,
        fallbackRate: 0,
        avgAmapCalls: 0,
        canGenerateFalseRate: 0,
        p95TotalMs: 0,
      };
    }

    const totalRequests = this.runs.length;
    const fallbackCount = this.runs.filter((item) => item.fallbackTriggered).length;
    const canGenerateFalseCount = this.runs.filter((item) => !item.canGenerate).length;
    const totalAmapCalls = this.runs.reduce((sum, item) => sum + item.amapCalls, 0);
    const sortedTotals = this.runs
      .map((item) => item.stageTimings.total)
      .sort((a, b) => a - b);
    const p95Index = Math.min(sortedTotals.length - 1, Math.ceil(sortedTotals.length * 0.95) - 1);

    return {
      totalRequests,
      fallbackRate: fallbackCount / totalRequests,
      avgAmapCalls: totalAmapCalls / totalRequests,
      canGenerateFalseRate: canGenerateFalseCount / totalRequests,
      p95TotalMs: sortedTotals[p95Index],
    };
  }
}

export const planningMetricsStore = new PlanningMetricsStore();
