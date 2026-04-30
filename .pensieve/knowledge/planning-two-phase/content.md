---
id: planning-two-phase
type: knowledge
title: AI Planner Two-Phase Itinerary Contract
status: active
created: 2026-04-28
updated: 2026-04-28
tags: [planning, rag, itinerary, meals, validation]
---

# AI Planner Two-Phase Itinerary Contract

## One-line Conclusion
Two-phase planning is complete only when meals are planner-owned `activities`, not UI-synthesized strings: attractions form the day skeleton, restaurants are retrieved per attraction anchor, and validator coverage gates `can_generate`.

## Implementation Notes
- `StructuredItinerary.days[].activities` may contain `type: 'meal'` with `mealType`, `anchorActivityId`, and `candidateId`.
- `meals` and `mealDetails` remain as compatibility projections for existing UI, but planner activity data is the source of truth.
- The restaurant fallback chain should be: 1.5 km DB search, 3 km DB search, AMap around, then shared destination food pool with warnings.
- Rainy-day replanning must rebuild meals for the new indoor anchors; keeping old meals breaks the anchor-to-restaurant invariant.
- Golden tests that import Vite modules through `tsx` need `tsconfig.json` path aliases and any `import.meta.env` access must tolerate non-Vite Node execution.

## Verification
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:golden`
- `npm run build:both`
