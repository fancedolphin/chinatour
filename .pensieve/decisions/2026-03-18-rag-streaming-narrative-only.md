---
id: 2026-03-18-rag-streaming-narrative-only
type: decision
title: RAG Streaming — Narrative Only, Structured JSON is Not Streamed
status: active
created: 2026-03-18
updated: 2026-03-18
tags: [rag, streaming, sse, gemini, architecture]
---

# RAG Streaming — Narrative Only

## One-line Conclusion
> Only the final Narrative LLM output is streamed via SSE; Planner and Validator return complete structured JSON before the stream starts.

## Context Links
- Based on: [[knowledge/rag-architecture/content]]
- Leads to: [[knowledge/rag-architecture/content]]

## Context

The RAG planning pipeline has two types of LLM output:
1. **Structured JSON** (Planner, Validator) — uses `responseSchema`, output must be complete to be valid
2. **Free-text narrative** (Narrative builder) — long prose that can be displayed progressively

## Problem

Streaming the entire pipeline would require partial JSON parsing or holding all structured data in a buffer, adding complexity without UX benefit. The user cannot act on a partial itinerary JSON.

## Alternatives Considered

- **Stream everything**: Requires complex partial-JSON assembly on the frontend; Planner output is useless until complete anyway
- **Stream nothing**: Leads to 8s+ blank screen; poor perceived performance
- **Stream only structured JSON first, then narrative**: Chosen — gives frontend the card/map data immediately, then streams prose

## Decision

The Supabase Edge Function `trip-planner-stream` publishes three SSE event types:
- `itinerary` — complete `StructuredItinerary` JSON (sent once, non-streamed internally)
- `narrative_chunk` — incremental text chunks from `generateContentStream()`
- `done` — validation warnings

Frontend renders cards/map on `itinerary` event, appends narrative chunks as they arrive.

## Consequence

- First meaningful content (cards + map skeleton) appears in < 5s P90
- Narrative text streams with typewriter effect
- `tripPlanningService` must expose `planStructured()` for Edge Function internal use

## Exploration Reduction
- What to ask less next time: "Should we stream the planner output?" → No, structured JSON must be complete
- What to look up less next time: Edge Function SSE pattern for Supabase Deno runtime
- Invalidation condition: If Gemini supports partial structured JSON streaming with guaranteed schema compliance
