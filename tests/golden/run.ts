import {
  assertPlanningScorecard,
  evaluatePlanningDataset,
  writePlanningScorecardArtifacts,
} from '../../src/services/planning/planningScorecard';

const scorecard = evaluatePlanningDataset();
const artifactPaths = writePlanningScorecardArtifacts(scorecard);
const failures = assertPlanningScorecard(scorecard);

console.log(JSON.stringify({ scorecard, artifactPaths, failures }, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
