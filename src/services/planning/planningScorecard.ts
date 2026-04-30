import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { planningEvaluationDataset, type PlanningEvaluationCase } from '../../data/planningEvaluationDataset';
import { planningScorecardBaseline } from '../../data/planningScorecardBaseline';
import { extractPlanningIntent } from './intentService';
import { itineraryValidator } from './itineraryValidator';
import { plannerService } from './plannerService';

const HARD_GATES = {
  coreAttractionsRecallAt8: 0.85,
  foodRecallAt5: 0.75,
  restaurantProximityCoverage: 0.8,
  itineraryExecutableRate: 0.9,
  constraintHitRate: 0.95,
  llmGeneratedRatio: 0.2,
  canGenerateFalseRate: 0.05,
} as const;

export type PlanningScorecard = {
  sampleCount: number;
  passingCases: number;
  failingCases: number;
  intentMatchRate: number;
  coreAttractionsRecallAt8: number;
  foodRecallAt5: number;
  restaurantProximityCoverage: number;
  itineraryExecutableRate: number;
  constraintHitRate: number;
  llmGeneratedRatio: number;
  canGenerateFalseRate: number;
  failures: Array<{ id: string; scenario: string; issues: string[] }>;
};

function round(value: number): number {
  return Number(value.toFixed(4));
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 1;
  return numerator / denominator;
}

function matchesExpected(caseItem: PlanningEvaluationCase) {
  const extracted = extractPlanningIntent(caseItem.prompt);
  const issues: string[] = [];

  if (extracted.destination !== caseItem.expectedIntent.destination) {
    issues.push(`destination=${extracted.destination}`);
  }
  if (extracted.durationDays !== caseItem.expectedIntent.durationDays) {
    issues.push(`duration=${extracted.durationDays}`);
  }
  if (extracted.travelStyle !== caseItem.expectedIntent.travelStyle) {
    issues.push(`travelStyle=${extracted.travelStyle}`);
  }
  if (
    typeof caseItem.expectedIntent.includeIndustrial === 'boolean' &&
    extracted.includeIndustrial !== caseItem.expectedIntent.includeIndustrial
  ) {
    issues.push(`includeIndustrial=${extracted.includeIndustrial}`);
  }
  if (
    caseItem.expectedIntent.cuisinePreference &&
    extracted.cuisinePreference !== caseItem.expectedIntent.cuisinePreference
  ) {
    issues.push(`cuisine=${extracted.cuisinePreference ?? 'none'}`);
  }
  if (caseItem.expectedIntent.groupType && extracted.groupType !== caseItem.expectedIntent.groupType) {
    issues.push(`groupType=${extracted.groupType ?? 'none'}`);
  }
  if (
    typeof caseItem.expectedIntent.travelMonth === 'number' &&
    extracted.travelMonth !== caseItem.expectedIntent.travelMonth
  ) {
    issues.push(`travelMonth=${extracted.travelMonth ?? 'none'}`);
  }

  return {
    extracted,
    issues,
  };
}

function intersectCount(actual: string[], expected: string[]): number {
  const actualSet = new Set(actual);
  return expected.filter((item) => actualSet.has(item)).length;
}

function compareAgainstBaseline(scorecard: PlanningScorecard): string[] {
  const failures: string[] = [];

  if (scorecard.coreAttractionsRecallAt8 < HARD_GATES.coreAttractionsRecallAt8) {
    failures.push('core_attractions_recall@8 below hard gate');
  }
  if (scorecard.foodRecallAt5 < HARD_GATES.foodRecallAt5) {
    failures.push('food_recall@5 below hard gate');
  }
  if (scorecard.restaurantProximityCoverage < HARD_GATES.restaurantProximityCoverage) {
    failures.push('restaurant_proximity_coverage below hard gate');
  }
  if (scorecard.itineraryExecutableRate < HARD_GATES.itineraryExecutableRate) {
    failures.push('itinerary_executable_rate below hard gate');
  }
  if (scorecard.constraintHitRate < HARD_GATES.constraintHitRate) {
    failures.push('constraint_hit_rate below hard gate');
  }
  if (scorecard.llmGeneratedRatio > HARD_GATES.llmGeneratedRatio) {
    failures.push('llm_generated_ratio above hard gate');
  }
  if (scorecard.canGenerateFalseRate > HARD_GATES.canGenerateFalseRate) {
    failures.push('can_generate_false_rate above hard gate');
  }

  if (scorecard.coreAttractionsRecallAt8 < planningScorecardBaseline.coreAttractionsRecallAt8 - 0.03) {
    failures.push('core_attractions_recall@8 regressed by more than 3pp');
  }
  if (scorecard.foodRecallAt5 < planningScorecardBaseline.foodRecallAt5 - 0.03) {
    failures.push('food_recall@5 regressed by more than 3pp');
  }
  if (
    scorecard.restaurantProximityCoverage <
    planningScorecardBaseline.restaurantProximityCoverage - 0.05
  ) {
    failures.push('restaurant_proximity_coverage regressed by more than 5pp');
  }
  if (scorecard.itineraryExecutableRate < planningScorecardBaseline.itineraryExecutableRate - 0.02) {
    failures.push('itinerary_executable_rate regressed by more than 2pp');
  }

  return failures;
}

export function evaluatePlanningDataset(dataset = planningEvaluationDataset): PlanningScorecard {
  let matchedIntentCases = 0;
  let passingCases = 0;
  let totalExpectedCore = 0;
  let matchedCore = 0;
  let totalExpectedFood = 0;
  let matchedFood = 0;
  let proximityEligibleMeals = 0;
  let proximityHitMeals = 0;
  let executableCases = 0;
  let bookingAwareCases = 0;
  let bookingSatisfiedCases = 0;
  let llmAttractions = 0;
  let totalAttractions = 0;
  let canGenerateFalse = 0;
  const failures: PlanningScorecard['failures'] = [];

  for (const caseItem of dataset) {
    const { extracted, issues } = matchesExpected(caseItem);
    if (issues.length === 0) {
      matchedIntentCases += 1;
    }

    const skeleton = plannerService.selectAttractionSkeleton({
      intent: extracted,
      attractions: caseItem.slots.core_attractions.items,
      bookingTips: caseItem.bookingTips,
    });
    const lunchCandidatesByDay = Object.fromEntries(
      skeleton
        .filter((day) => day.morningAttraction)
        .map((day) => [day.day, caseItem.slots.food.items]),
    );
    const dinnerCandidatesByDay = Object.fromEntries(
      skeleton
        .filter((day) => day.afternoonAttraction || day.morningAttraction)
        .map((day) => [day.day, caseItem.slots.food.items]),
    );
    const itinerary = plannerService.buildStructuredItineraryTwoPhase({
      intent: extracted,
      skeleton,
      breakfastCandidates: caseItem.slots.food.items,
      lunchCandidatesByDay,
      dinnerCandidatesByDay,
      defaultFoodCandidates: caseItem.slots.food.items,
      bookingTips: caseItem.bookingTips,
    });
    const validation = itineraryValidator.validate(itinerary, extracted, caseItem.bookingTips);

    const topCore = caseItem.slots.core_attractions.items.slice(0, 8).map((item) => item.name);
    const topFood = caseItem.slots.food.items.slice(0, 5).map((item) => item.name);
    matchedCore += intersectCount(topCore, caseItem.expectedCoreAttractions);
    matchedFood += intersectCount(topFood, caseItem.expectedFoods);
    totalExpectedCore += caseItem.expectedCoreAttractions.length;
    totalExpectedFood += caseItem.expectedFoods.length;

    const attractionActivities = itinerary.days.flatMap((day) =>
      day.activities.filter((activity) => activity.type === 'attraction'),
    );
    totalAttractions += attractionActivities.length;
    llmAttractions += attractionActivities.filter((activity) => activity.source === 'llm').length;
    proximityEligibleMeals += 1;
    proximityHitMeals += validation.coverage.restaurantProximityCoverage;

    if (validation.can_generate) {
      executableCases += 1;
    } else {
      canGenerateFalse += 1;
    }

    if (caseItem.bookingTips.length > 0) {
      bookingAwareCases += 1;
      const hasBookingWarning = validation.warnings.some((warning) => warning.rule === 'booking_constraint');
      if (!hasBookingWarning) {
        bookingSatisfiedCases += 1;
      }
    }

    const caseIssues = [...issues];
    if (validation.can_generate !== caseItem.expectCanGenerate) {
      caseIssues.push(`can_generate=${validation.can_generate}`);
    }
    if (intersectCount(topCore, caseItem.expectedCoreAttractions) !== caseItem.expectedCoreAttractions.length) {
      caseIssues.push('core recall miss');
    }
    if (intersectCount(topFood, caseItem.expectedFoods) !== caseItem.expectedFoods.length) {
      caseIssues.push('food recall miss');
    }
    if (caseItem.bookingTips.length > 0) {
      const hasBookingWarning = validation.warnings.some((warning) => warning.rule === 'booking_constraint');
      if (hasBookingWarning) {
        caseIssues.push('booking warning remained');
      }
    }

    if (caseIssues.length === 0) {
      passingCases += 1;
    } else {
      failures.push({
        id: caseItem.id,
        scenario: caseItem.scenario,
        issues: caseIssues,
      });
    }
  }

  return {
    sampleCount: dataset.length,
    passingCases,
    failingCases: dataset.length - passingCases,
    intentMatchRate: round(ratio(matchedIntentCases, dataset.length)),
    coreAttractionsRecallAt8: round(ratio(matchedCore, totalExpectedCore)),
    foodRecallAt5: round(ratio(matchedFood, totalExpectedFood)),
    restaurantProximityCoverage: round(ratio(proximityHitMeals, proximityEligibleMeals)),
    itineraryExecutableRate: round(ratio(executableCases, dataset.length)),
    constraintHitRate: round(ratio(bookingSatisfiedCases, bookingAwareCases)),
    llmGeneratedRatio: round(ratio(llmAttractions, totalAttractions)),
    canGenerateFalseRate: round(ratio(canGenerateFalse, dataset.length)),
    failures,
  };
}

export function renderPlanningScorecard(scorecard: PlanningScorecard): string {
  return [
    '# Planning Scorecard',
    '',
    `- sample_count: ${scorecard.sampleCount}`,
    `- passing_cases: ${scorecard.passingCases}`,
    `- failing_cases: ${scorecard.failingCases}`,
    '',
    '| Metric | Current | Baseline | Hard Gate |',
    '| --- | ---: | ---: | ---: |',
    `| intent_match_rate | ${scorecard.intentMatchRate.toFixed(2)} | ${planningScorecardBaseline.intentMatchRate.toFixed(2)} | n/a |`,
    `| core_attractions_recall@8 | ${scorecard.coreAttractionsRecallAt8.toFixed(2)} | ${planningScorecardBaseline.coreAttractionsRecallAt8.toFixed(2)} | ${HARD_GATES.coreAttractionsRecallAt8.toFixed(2)} |`,
    `| food_recall@5 | ${scorecard.foodRecallAt5.toFixed(2)} | ${planningScorecardBaseline.foodRecallAt5.toFixed(2)} | ${HARD_GATES.foodRecallAt5.toFixed(2)} |`,
    `| restaurant_proximity_coverage | ${scorecard.restaurantProximityCoverage.toFixed(2)} | ${planningScorecardBaseline.restaurantProximityCoverage.toFixed(2)} | ${HARD_GATES.restaurantProximityCoverage.toFixed(2)} |`,
    `| itinerary_executable_rate | ${scorecard.itineraryExecutableRate.toFixed(2)} | ${planningScorecardBaseline.itineraryExecutableRate.toFixed(2)} | ${HARD_GATES.itineraryExecutableRate.toFixed(2)} |`,
    `| constraint_hit_rate | ${scorecard.constraintHitRate.toFixed(2)} | ${planningScorecardBaseline.constraintHitRate.toFixed(2)} | ${HARD_GATES.constraintHitRate.toFixed(2)} |`,
    `| llm_generated_ratio | ${scorecard.llmGeneratedRatio.toFixed(2)} | ${planningScorecardBaseline.llmGeneratedRatio.toFixed(2)} | <= ${HARD_GATES.llmGeneratedRatio.toFixed(2)} |`,
    `| can_generate_false_rate | ${scorecard.canGenerateFalseRate.toFixed(2)} | ${planningScorecardBaseline.canGenerateFalseRate.toFixed(2)} | <= ${HARD_GATES.canGenerateFalseRate.toFixed(2)} |`,
    '',
    '## Failing Cases',
    ...(scorecard.failures.length
      ? scorecard.failures.map((item) => `- ${item.id} (${item.scenario}): ${item.issues.join(', ')}`)
      : ['- none']),
  ].join('\n');
}

export function writePlanningScorecardArtifacts(scorecard: PlanningScorecard): string[] {
  const artifactDir = process.env.PLANNING_SCORECARD_DIR
    ? resolve(process.env.PLANNING_SCORECARD_DIR)
    : existsSync('/mnt/d/chinaview/Nodb')
      ? resolve('/mnt/d/chinaview/Nodb', 'artifacts')
      : resolve(process.cwd(), 'artifacts');
  try {
    mkdirSync(artifactDir, { recursive: true });
  } catch {
    execFileSync('mkdir', ['-p', artifactDir]);
  }

  const jsonPath = resolve(artifactDir, 'planning-scorecard.json');
  const mdPath = resolve(artifactDir, 'planning-scorecard.md');

  writeFileSync(jsonPath, JSON.stringify(scorecard, null, 2));
  writeFileSync(mdPath, `${renderPlanningScorecard(scorecard)}\n`);

  return [jsonPath, mdPath];
}

export function assertPlanningScorecard(scorecard: PlanningScorecard): string[] {
  const failures = compareAgainstBaseline(scorecard);
  if (scorecard.sampleCount < 30) {
    failures.push('sample_count below 30');
  }
  if (scorecard.failingCases > 0) {
    failures.push('golden cases contain failures');
  }
  return failures;
}
