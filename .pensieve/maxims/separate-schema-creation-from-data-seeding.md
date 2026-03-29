---
id: separate-schema-creation-from-data-seeding
type: maxim
title: Separate Schema Creation from Data Seeding
status: active
created: 2026-03-18
updated: 2026-03-18
tags: [database, planning, seeding, rag]
---

# Separate Schema Creation from Data Seeding

## One-line Conclusion
> Creating a table and populating it with data are always two distinct issues — a table that exists but is empty is invisible to retrieval systems.

## Guidance
- Never assume a "create table" issue covers seed data; always create a separate seeding issue
- When a new table is added mid-project, immediately check whether the seeding plan covers it
- Empty tables that are part of a retrieval path (RAG, search, recommendations) will silently return zero results — there is no error, only silent failure
- Seeding issues must declare explicit minimum row counts as acceptance criteria (e.g. "≥ 6 records per city")

## Boundaries
- Does not apply to lookup/config tables seeded by migration SQL itself (e.g. `INSERT INTO roles VALUES ...`)
- Does not apply to tables populated exclusively by user-generated content at runtime

## Context Links
- Based on: [[knowledge/rag-architecture/content]]
- Related: [[maxims/preserve-user-visible-behavior-as-a-hard-rule]]
