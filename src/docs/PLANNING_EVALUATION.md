# Planning Evaluation

## Scope

This repository keeps two layers of planning verification:

- `test:unit`: pure unit tests for entity normalization, validator rules, prompt safety, and prompt assembly
- `test:e2e`: service-level weather replanning checks
- `test:golden`: offline scorecard over 32 standardized intent fixtures

## Offline Scorecard Metrics

- `core_attractions_recall@8`: expected core attractions found in the top 8 retrieved candidates
- `food_recall@5`: expected food candidates found in the top 5 retrieved candidates
- `restaurant_proximity_coverage`: fraction of lunch/dinner meals that pass the proximity validator without `restaurant_proximity_missing`
- `itinerary_executable_rate`: fraction of fixtures where validator returns `can_generate=true`
- `constraint_hit_rate`: fraction of booking-aware fixtures where validator does not emit `booking_constraint`
- `llm_generated_ratio`: fraction of attraction activities whose source is `llm`
- `can_generate_false_rate`: fraction of fixtures where validator returns `can_generate=false`

## Hard Gates

- `core_attractions_recall@8 >= 0.85`
- `food_recall@5 >= 0.75`
- `restaurant_proximity_coverage >= 0.80`
- `itinerary_executable_rate >= 0.90`
- `constraint_hit_rate >= 0.95`
- `llm_generated_ratio <= 0.20`
- `can_generate_false_rate <= 0.05`

## Baseline Guardrails

- Any recall metric dropping by more than `0.03` fails the golden run
- `restaurant_proximity_coverage` dropping by more than `0.05` fails the golden run
- `itinerary_executable_rate` dropping by more than `0.02` fails the golden run

## Artifacts

`npm run test:golden` writes:

- `artifacts/planning-scorecard.json`
- `artifacts/planning-scorecard.md`
