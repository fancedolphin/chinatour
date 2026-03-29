---
id: rag-architecture
type: knowledge
title: RAG Architecture — Chinaview AI Trip Planner
status: active
created: 2026-03-18
updated: 2026-03-18
tags: [rag, supabase, pgvector, gemini, architecture, linear]
---

# RAG Architecture — Chinaview AI Trip Planner

## Source
Linear project: 优化AI规划能力 | Session: 2026-03-18

## Summary
Resolves repeated friction around: which milestone owns what, which tables need seeding, and where the streaming boundary sits.

## Content

### Milestone Dependency Chain

```
M1: 基础设施
  CHI-33 (Zod contracts)         ← no deps, must be FIRST
  CHI-38 (pgvector DB schema)    ← no deps
  CHI-24 (generate-embedding EF) ← no deps
  CHI-59 (cultural_experiences)  ← blockedBy CHI-38
  CHI-60 (events)                ← blockedBy CHI-38
  CHI-61 (markets_and_shopping)  ← blockedBy CHI-38
  CHI-72 (trip_examples schema)  ← blockedBy CHI-33

M2: 知识库建设
  CHI-25 (seed attractions/restaurants/travel_tips) ← blockedBy CHI-38, CHI-24, CHI-33
  CHI-71 (seed cultural/events/markets)             ← blockedBy CHI-59, CHI-60, CHI-61, CHI-24

M3: 检索服务
  CHI-26 (ragService 2-slot MVP)  ← blockedBy CHI-25, CHI-24, CHI-33
  CHI-28 (amap-search EF)         ← no deps
  CHI-29 (amapFallbackService)    ← blockedBy CHI-26, CHI-28
  CHI-33 → moved to M1 (was incorrectly in M3)

M4: Gemini 上下文注入
  CHI-39 (LLM config)    ← no deps
  CHI-37 (intent hook)   ← no deps outside M3
  CHI-27 (prompt builder) ← blockedBy CHI-39
  CHI-30 (Planner)        ← blockedBy CHI-27, CHI-29
  CHI-31 (Validator)      ← blockedBy CHI-30
  CHI-62 (main orchestrator) ← blockedBy CHI-37, CHI-30, CHI-31
  CHI-63 (weather re-RAG)    ← blockedBy CHI-62
  CHI-73 (streaming)         ← blockedBy CHI-62, CHI-27
```

### Tables and Their Roles

| Table | RAG retrieval? | Seeding issue | Notes |
|-------|---------------|---------------|-------|
| attractions | ✅ slot: core_attractions | CHI-25 | Extended with indoor_outdoor, foreigner_features |
| restaurants | ✅ slot: food | CHI-25 | |
| travel_tips | ✅ slot: booking_constraints | CHI-25 | Only booking/ticketing tips in MVP |
| cultural_experiences | ✅ slot: cultural_experiences | CHI-71 | |
| events | ✅ slot: events | CHI-71 | month_filter soft param in match_events() |
| markets_and_shopping | ✅ slot: markets | CHI-71 | signature_items same schema as attractions |
| trip_examples | ❌ test only | CHI-72 | Golden set for E2E; no embedding |
| destinations | ❌ lookup | migration | Reference table |

### MVP Slot Scope

MVP (CHI-26) only retrieves 2 slots: `core_attractions` + `food`.
Full 7-slot is defined in CHI-33 contracts but implemented post-MVP.

### SSE Event Protocol (CHI-73)

```
event: itinerary      → StructuredItinerary JSON (complete, sent once)
event: narrative_chunk → string chunk from generateContentStream()
event: done           → { warnings: ValidationWarning[] }
```

Only Narrative is streamed. Planner + Validator return complete JSON internally before stream starts.

### AMap Fallback Rules

- Triggered only when `core_attractions` or `food` slot is unsatisfied
- Max 2 AMap API calls per request
- Merge priority: coordinates/address → AMap; booking/descriptions → RAG
- source labels: `rag` | `amap` | `rag+amap` | `llm`

## When to Use
- Before adding a new RAG table: check this for naming conventions and slot registration pattern
- Before planning a new milestone: verify dependency chain against this graph
- When debugging "why is this slot always empty": check seeding issue exists and ran successfully

## Context Links
- Leads to: [[decisions/2026-03-18-rag-streaming-narrative-only]]
- Leads to: [[decisions/2026-03-18-trip-examples-test-golden-set-only]]
- Related: [[maxims/data-contracts-must-precede-all-consumers]]
- Related: [[maxims/separate-schema-creation-from-data-seeding]]
