# TripMapPage 所有浮层 UI 统一 Portal 到 document.body

## One-line Conclusion
> TripMapPage 的 Top Nav、Day Bar、Export Button、Route Legend 统一通过单个 `createPortal(..., document.body)` 渲染，脱离高德地图 SDK 容器的堆叠上下文。

## Context Links
- Based on: [[knowledge/z-index-layering]]
- Based on: [[maxim/third-party-sdk-containers-create-isolated-stacking-contexts]]
- Related: [[decision/2026-03-15-like-save-count-update-via-read-then-write]]

## Context
TripMapPage 使用高德地图 JS API v1.4.15，地图渲染在一个 `<div ref={mapContainerRef}>` 中。SDK 初始化后会对该容器及其子元素设置 `position: absolute`、`overflow: hidden`，形成独立的 CSS 堆叠上下文。

## Problem
Day Layer Tab Bar（总览 | 第1天 | 第2天 ...）在地图容器内部渲染时完全不可见，即使：
- 数据正确（console.log 确认 `itineraryDays` 非空、`showDayBar === true`）
- 使用 `position: fixed; z-index: 99999`
- 使用红色背景 + 大号字体的纯测试 div

根因：高德地图 SDK 容器创建了独立堆叠上下文，内部的 fixed/absolute 元素无论 z-index 多大都被 SDK 图层压住。

## Alternatives Considered
- **Option A: 提高 z-index 到极大值** → 无效，堆叠上下文隔离无法靠 z-index 突破
- **Option B: 每个浮层单独 createPortal** → 可行但分散，多个 portal 入口难以统一维护显示条件
- **Option C: 用高德 SDK 的 AMap.Control 自定义控件** → 样式受限，无法使用 React 组件生态

## Decision
所有地图页浮层 UI 合并为单个 `createPortal` 块，渲染到 `document.body`：
```tsx
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
- 使用 inline `style` 设置 `position: fixed` 和 `zIndex`（调试友好）
- 外层容器 `pointerEvents: 'none'`，可点击子元素 `pointerEvents: 'auto'`
- Day Bar 的显示条件独立于 `mapLoaded`（只依赖 `itineraryDays.length > 0`）

## Consequence
- 所有浮层 UI 统一在一处维护，新增浮层只需在 portal fragment 中添加
- 完全脱离 SDK 堆叠上下文，z-index 生效
- ExportScopeSheet（全屏 modal）因自带 `fixed inset-0 z-[70]` + backdrop，保留在原位

## Exploration Reduction
- What to ask less next time: "为什么地图上的 UI 不可见" → 先检查是否在 SDK 容器内部
- What to look up less next time: Day Bar 不显示的调试路径（数据 → 样式 → 堆叠上下文 → portal）
- Invalidation condition: 如果迁移到不创建独立堆叠上下文的地图库（如 Leaflet），portal 不再必需（但也无害）
