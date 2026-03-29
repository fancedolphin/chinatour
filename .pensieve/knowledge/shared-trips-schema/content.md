---
id: shared-trips-schema
type: knowledge
title: shared_trips / user_interactions 表结构与关键约束
status: active
created: 2026-03-15
updated: 2026-03-15
tags: [supabase, schema, shared_trips, user_interactions, trips]
---

# shared_trips / user_interactions 表结构与关键约束

## Source
`src/types/database.ts` + Supabase 实际表结构（2026-03-15 确认）

## Summary
避免重新推断表关系和字段存在性，直接查此文件

## Content

### trips 表（新增字段）
- `source: string | null` — 行程来源标记，`'forked'` 表示从广场导入
- `forked_from: string | null` — 指向被 fork 的原始 trip.id（CHI-15 迁移后添加）
- **迁移 SQL**:
  ```sql
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS forked_from uuid REFERENCES trips(id);
  ```

### shared_trips 表
- `trip_id: string` — 外键 trips.id，`isOneToOne: true`（每个 trip 只能有一条 shared_trips）
- `is_active: boolean` — 软删除标志，取消发布时设为 false，不物理删除
- `user_id: string` — 外键 users.id（发布者）
- 计数字段：`likes_count`, `saves_count`, `comments_count`, `views_count`

### user_interactions 表
- 唯一约束：`(shared_trip_id, user_id)` — upsert 时使用 `onConflict: 'shared_trip_id,user_id'`
- `liked / saved / viewed`：布尔值，附带 `*_at` 时间戳
- 注意：`liked=false` 不等于没有记录，需判断字段值而非行是否存在

### 关系链
```
trips (1) ──── (0..1) shared_trips
shared_trips (1) ──── (0..N) user_interactions
users (1) ──── (0..N) shared_trips
users (1) ──── (0..N) user_interactions
trips (N) ──── (0..1) trips.forked_from (自引用)
```

### Anti-patterns
- ❌ 不要用 `eq('is_active', true).single()` 查 shared_trips，因为同一 trip_id 可能有历史记录（重新发布场景）；用 `maybeSingle()` 更安全
- ❌ 不要直接 delete 取消发布，要 `UPDATE is_active = false`（保留互动数据）
- ❌ 不要信任 `likes_count` 精确性（read-then-write 更新，非原子）

## When to Use
- 实现任何涉及广场发布、点赞、收藏、导入行程的功能前
- 写 sharedTripService 相关方法时

## Context Links
- Leads to: [[decisions/2026-03-15-like-save-count-update-via-read-then-write]]
- Related: none
