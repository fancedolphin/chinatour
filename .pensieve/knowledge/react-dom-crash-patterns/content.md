---
id: react-dom-crash-patterns
type: knowledge
title: React DOM crash 常见模式：insertBefore 错误
status: active
created: 2026-03-16
updated: 2026-03-16
tags: [react, dom, crash, insertBefore, lucide, button]
---

# React DOM crash 常见模式：insertBefore 错误

## Source
本项目调试记录（2026-03-16），`PublishTripModal.tsx` 撤下广场按钮点击后崩溃

## Summary
看到 `insertBefore` / `commitPlacement` 报错栈且组件名含图标时，立即排查 Button 内 element+文本节点混用。

## Content

### 症状
```
Uncaught NotFoundError: Failed to execute 'insertBefore' on 'Node':
The node before which the new node is to be inserted is not a child of this node.
  at commitPlacement
  at commitReconciliationEffects
  ...
```
错误栈中出现 `<LoaderCircle>`（即 lucide-react 的 `Loader2`）组件名。

### 根因
React 协调（reconciliation）时，需要将新增的 element 节点插入到已存在的文本节点之前，但因渲染树结构变化，文本节点的 DOM 引用已失效。

**触发条件**：
1. 父容器是宿主组件（`<button>`、`<div>` 等）
2. 子节点列表中同时存在：条件渲染的 **element 节点** + **裸字符串文本节点**
3. 条件从 `false` → `true`（element 从无到有）

### 定位路径
```
症状：页面崩溃，控制台 insertBefore 错误
→ 错误栈中有图标组件名（LoaderCircle / Spinner 等）
→ 找到对应的 Button/host 组件
→ 检查其直接子节点：是否有 {bool && <Icon/>} 紧跟裸文字
→ 确认
```

### 修复
```tsx
// ❌ 崩溃
<Button>
  {isLoading ? <Loader2 /> : null}
  按钮文字
</Button>

// ✅ 安全：span 包裹消除裸文本节点
<Button>
  <span className="flex items-center gap-2">
    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
    <span>{isLoading ? '处理中...' : '按钮文字'}</span>
  </span>
</Button>

// ✅ 安全：纯文本条件（不涉及 element/text 类型切换）
<Button>
  {isLoading ? '处理中...' : '按钮文字'}
</Button>
```

### 注意
- `lucide-react` 中 `Loader2` 内部名称是 `LoaderCircle`，报错栈看到 `<LoaderCircle>` 即此组件
- 此问题在 React 18 严格模式下更容易复现

## When to Use
写任何含 loading spinner 的按钮前；看到 `insertBefore` / `commitPlacement` 报错时。

## Context Links
- Leads to: [[maxims/never-mix-conditional-element-and-bare-text-siblings-in-host-component]]
- Related: none
