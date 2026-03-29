---
id: z-index-layering
type: knowledge
title: 本项目 z-index 层级约定
status: active
created: 2026-03-16
updated: 2026-03-16
tags: [z-index, modal, bottom-nav, fixed, layering]
---

# 本项目 z-index 层级约定

## Source
`src/App.tsx`、`src/components/TripPlannerBottomNav.tsx`、`src/components/PublishTripModal.tsx`

## Summary
避免反复猜测 Modal 被导航栏压住的原因——直接查此表决定 z-index 值。

## Content

### 当前层级表

| 元素 | className | 说明 |
|------|-----------|------|
| 顶部导航栏 | `fixed top-0 z-50` | App.tsx header |
| 底部导航栏 | `fixed bottom-0 z-50` | TripPlannerBottomNav.tsx |
| Modal / Sheet | `fixed inset-0 z-[60]` | **必须高于 z-50** |
| Toast (sonner) | 默认 `z-[9999]` | Toaster 组件自带 |

### 关键规则

**为什么 Modal 必须用 `z-[60]` 而不是 `z-50`？**

App.tsx 的渲染顺序：
```
1. 主内容区（renderPage() → MyTripsPage → Modal 渲染在此）
2. TripPlannerBottomNav   ← 后渲染，z-50 相同时 DOM 顺序更靠后，覆盖 Modal
```
即使两者都是 `z-50`，底部导航因 DOM 顺序更晚，始终渲染在 Modal 之上。

**Modal Bottom Sheet 高度**

使用 `style={{ maxHeight: '80vh' }}` 而不是 `max-h-[calc(100vh-4rem)]`，因为 Modal 的 `z-[60]` 已覆盖底部导航，Sheet 可以占满整个视口高度。

### 症状→根因→定位

```
症状：Modal 内容显示但底部按钮被裁掉 / 底部导航可见压在 Modal 上方
→ 检查 Modal 的 z-index 是否 <= 50
→ 检查 App.tsx 中 Modal 的渲染位置（是否在 BottomNav 之前）
→ 将 Modal z-index 改为 z-[60] 解决
```

### Anti-patterns
- ❌ `z-50` 用于 Modal（与导航栏相同，DOM 顺序决定胜负）
- ❌ `max-h-[90vh]` 搭配 `items-end` 而不提升 z-index（Sheet 被导航栏截断）

## When to Use
新建任何 Modal、Sheet、Drawer、Popover 组件之前。

## Context Links
- Related: none
