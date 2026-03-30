---
id: z-index-layering
type: knowledge
title: 本项目 z-index 层级约定
status: active
created: 2026-03-16
updated: 2026-03-30
tags: [z-index, modal, bottom-nav, fixed, layering, amap, portal, stacking-context]
---

# 本项目 z-index 层级约定

## Source
`src/App.tsx`、`src/components/TripPlannerBottomNav.tsx`、`src/components/PublishTripModal.tsx`、`src/components/TripMapPage.tsx`

## Summary
避免反复猜测 Modal 被导航栏压住、或地图浮层被 SDK 容器吞没的原因——直接查此表决定 z-index 值和渲染策略。

## Content

### 当前层级表

| 元素 | className / style | 说明 |
|------|-------------------|------|
| 顶部导航栏 | `fixed top-0 z-50` | App.tsx header |
| 底部导航栏 | `fixed bottom-0 z-50` | TripPlannerBottomNav.tsx |
| Modal / Sheet | `fixed inset-0 z-[60]` | **必须高于 z-50** |
| TripMapPage 全屏 | `fixed inset-0 z-[60]` | 地图页容器 |
| TripMapPage 浮层 HUD | `createPortal(..., document.body)` + inline `zIndex: 2147483646~7` | **必须 portal** |
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

### AMap SDK 地图容器的独立堆叠上下文（2026-03-30 新增）

**根因：** 高德地图 SDK 初始化后，会对地图容器 `<div>` 及其内部生成的子元素添加 `position: absolute`、`overflow: hidden`、以及自己的 `z-index` 管理。这导致地图容器形成一个**独立的 CSS 堆叠上下文（stacking context）**。

**后果：** 在地图容器 `<div>` 内部渲染的 `position: fixed` / `position: absolute` 元素，无论 z-index 设到多大（甚至 `z-[99999]`、`2147483647`），都无法逃逸出地图 SDK 创建的堆叠上下文。元素会被地图 SDK 的内部图层（瓦片层、覆盖物层等）压住，视觉上完全不可见。

**解法：使用 `createPortal` 渲染到 `document.body`**
```tsx
// ✅ 正确：所有地图浮层统一 portal 到 body
{showMapOverlay && mapLoaded && createPortal(
  <>
    {/* Top Nav */}
    {/* Day Bar */}
    {/* Export Button */}
    {/* Route Legend */}
  </>,
  document.body,
)}
```

**实践要点：**
- 用 inline `style` 而非 Tailwind class 设置 `position: fixed` 和 `zIndex`，调试时一眼可见
- 所有地图浮层放在**同一个 portal 入口**，避免多处 `createPortal` 分散维护
- `pointerEvents: 'none'` 设在外层容器，`pointerEvents: 'auto'` 设在可点击子元素上
- ExportScopeSheet 等全屏 modal 因自带 `fixed inset-0 z-[70]` + 背景遮罩，可以不进 portal

### 症状→根因→定位

```
症状：Modal 内容显示但底部按钮被裁掉 / 底部导航可见压在 Modal 上方
→ 检查 Modal 的 z-index 是否 <= 50
→ 检查 App.tsx 中 Modal 的渲染位置（是否在 BottomNav 之前）
→ 将 Modal z-index 改为 z-[60] 解决

症状：地图页上的浮层 UI（Tab Bar / 按钮 / 图例）完全不可见
→ 无论 z-index 设到多大，甚至 fixed + z-[99999] + 红色背景都看不到
→ 根因：元素在地图 SDK 容器内部，被 SDK 的堆叠上下文隔离
→ 用 createPortal(element, document.body) 将浮层渲染到 body 解决
→ 切勿在地图容器内部放置任何需要"浮"在地图之上的 UI

症状：Day Bar 数据正常（console.log 确认 itineraryDays 非空）但 UI 不显示
→ 先排除数据问题（确认 showDayBar === true）
→ 再排除样式问题（用 red background + 大字测试 div 验证）
→ 如果 style 测试 div 也不可见 → 是 DOM 容器堆叠上下文问题 → portal 方案
```

### Anti-patterns
- ❌ `z-50` 用于 Modal（与导航栏相同，DOM 顺序决定胜负）
- ❌ `max-h-[90vh]` 搭配 `items-end` 而不提升 z-index（Sheet 被导航栏截断）
- ❌ 在高德地图容器内部放 `fixed` / `absolute` 浮层并尝试用 z-index 解决（永远被 SDK 层压住）
- ❌ 多个地图浮层各自独立 `createPortal`（分散维护、容易遗漏）
- ❌ 把 Day Bar 的显示条件绑定到 `mapLoaded`（mapLoaded 是最后才变 true 的状态，造成不必要耦合；Day Bar 只依赖是否有 itinerary 数据）

## When to Use
- 新建任何 Modal、Sheet、Drawer、Popover 组件之前
- 在地图页（TripMapPage）添加任何浮层 UI 之前
- 调试"明明有数据但 UI 不显示"的问题时

## Context Links
- Related: [[maxim: third-party-sdk-containers-create-isolated-stacking-contexts]]
