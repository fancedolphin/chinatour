---
id: 2026-03-15-like-save-count-update-via-read-then-write
type: decision
title: 点赞/收藏计数用 read-then-write 更新
status: active
created: 2026-03-15
updated: 2026-03-15
tags: [supabase, counter, likes, saves, rpc]
---

# 点赞/收藏计数用 read-then-write 更新

## One-line Conclusion
> 不用 RPC `increment_likes`，改用先 SELECT likes_count 再 UPDATE 的方式

## Context Links
- Based on: [[knowledge/shared-trips-schema/content]]
- Leads to: none
- Related: none

## Context

`sharedTripService.toggleLike / toggleSave` 需要在用户点赞后同步更新 `shared_trips.likes_count`。

## Problem

写服务时尝试调用 `supabase.rpc('increment_likes', ...)` 但该函数在数据库中不存在（`database.ts` Functions 列表中无此 RPC）。使用 TypeScript 强类型会报错；用 `as any` 规避类型检查运行时也会失败（PGRST204）。

## Alternatives Considered

- **RPC `increment_likes`**: 原子操作、并发安全，但需要在 Supabase SQL 编辑器中创建函数。当前不打算为此单独开 migration。
- **read-then-write（当前方案）**: 先 SELECT 当前值，计算新值后 UPDATE。并发下可能有轻微计数漂移，但对「点赞数」这种展示性计数可接受。

## Decision

使用 read-then-write：`SELECT likes_count` → `Math.max(0, count + delta)` → `UPDATE likes_count`。
计数飘移在社交展示场景可接受；若后期需要精确计数再补 RPC。

## Consequence

- 代码简单，无需额外 DB migration
- 高并发下（>100 QPS/row）可能轻微不准，但当前流量不需要担心

## Exploration Reduction
- What to ask less next time: DB 里是否有 increment RPC？→ 没有，直接 read-then-write
- What to look up less next time: 不需要查 Supabase RPC 文档，不需要写 migration
- Invalidation condition: 若在 Supabase 创建了 `increment_likes` / `increment_saves` RPC 函数，改用 RPC
