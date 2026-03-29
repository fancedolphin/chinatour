---
id: 2026-03-18-trip-examples-test-golden-set-only
type: decision
title: trip_examples Table Is Test Golden Set Only
status: active
created: 2026-03-18
updated: 2026-03-18
tags: [rag, testing, supabase, e2e, golden-set]
---

# trip_examples Table Is Test Golden Set Only

## One-line Conclusion
> `trip_examples` does not participate in production RAG retrieval; it exists exclusively as a golden set for E2E regression tests and offline quality evaluation.

## Context Links
- Based on: [[knowledge/rag-architecture/content]]

## Context

The `003_create_rag_tables.sql` migration creates a `trip_examples` table alongside the RAG tables. Its purpose was ambiguous — it could serve as few-shot examples injected into prompts, or as test data, or both.

## Problem

Without a clear decision, future developers might:
- Add embeddings to `trip_examples` and include it in retrieval queries (adding noise)
- Skip writing test data because they assume it's for prompt injection
- Use it for both purposes and create coupling between test fixtures and production prompts

## Alternatives Considered

- **Few-shot prompt injection**: Rejected for MVP — adds prompt tokens and complexity; LLM generalization is sufficient at this scale
- **Both test + injection**: Rejected — test fixtures need to cover edge cases (bad weather, fallback triggers) that should not appear in production prompts
- **Test golden set only (chosen)**: Clean separation; no embedding needed; directly drives CHI-34 regression tests

## Decision

`trip_examples` stores `{ input_intent, expected_output }` pairs as JSONB. No `embedding` column. Not queried by `ragService`. Contains 5 minimum golden scenarios covering: normal RAG hit, food-focused, industrial tourism, AMap fallback trigger, bad weather replanning.

## Consequence

- CHI-34 (E2E tests) SELECT directly from this table to drive test cases
- CHI-32 (quality metrics) uses it as the evaluation baseline
- Table never appears in `ragService` slot config

## Exploration Reduction
- What to ask less next time: "Should trip_examples have embeddings?" → No
- What to look up less next time: The table schema — see CHI-72
- Invalidation condition: If few-shot injection is needed in a future milestone
