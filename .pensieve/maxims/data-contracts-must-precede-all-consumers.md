---
id: data-contracts-must-precede-all-consumers
type: maxim
title: Data Contracts Must Precede All Consumers
status: active
created: 2026-03-18
updated: 2026-03-18
tags: [architecture, planning, types, dependencies]
---

# Data Contracts Must Precede All Consumers

## One-line Conclusion
> Type/schema definition files are always a blocking dependency for every service that imports from them — never plan them in the same milestone as their consumers.

## Guidance
- Any file that exports shared types (Zod schemas, TypeScript interfaces, SQL enums) must be scheduled in an earlier milestone than the services that import from it
- When reviewing a project plan, check: does every consumer issue have the contract issue in its `blockedBy`?
- Contract version bumps (adding fields, renaming enums) require updating all consumers before the PR merges

## Boundaries
- Does not apply to module-internal types used by only one file
- If a type is trivially inlined (e.g. a one-off `{ id: string }`), a shared contract file is unnecessary

## Context Links
- Based on: [[knowledge/rag-architecture/content]]
- Related: [[maxims/reduce-complexity-before-adding-branches]]
