---
id: never-mix-conditional-element-and-bare-text-siblings-in-host-component
type: maxim
title: 不要在宿主组件内混用条件 JSX 元素与裸文本节点作为兄弟节点
status: active
created: 2026-03-16
updated: 2026-03-16
tags: [react, dom, crash, button, rendering]
---

# 不要在宿主组件内混用条件 JSX 元素与裸文本节点作为兄弟节点

## One-line Conclusion
> 在 `<Button>`、`<div>` 等宿主组件内，条件渲染的 JSX 元素与裸文本节点不能作为直接兄弟节点并列——必须用 `<span>` 统一包裹。

## Guidance

- **危险模式**：
  ```tsx
  <Button>
    {isLoading ? <Loader2 /> : null}
    提交文字
  </Button>
  ```
  当 `isLoading` 从 `false` 变 `true`，React 尝试在已存在的文本节点前插入新元素节点，触发：
  `Uncaught NotFoundError: Failed to execute 'insertBefore' on 'Node'`

- **安全模式（包裹法）**：
  ```tsx
  <Button>
    <span className="flex items-center gap-2">
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      <span>{isLoading ? '处理中...' : '提交文字'}</span>
    </span>
  </Button>
  ```

- **安全模式（纯文本条件）**：
  ```tsx
  <Button>
    {isLoading ? '处理中...' : '提交文字'}
  </Button>
  ```
  纯字符串之间切换不产生 element/text 节点类型变化，不会崩溃。

- **高危场景**：所有包含 loading spinner 图标的按钮；使用 `&&` 短路渲染图标后紧跟文字的地方。

- **lucide-react 中 `Loader2` 的实际名称是 `LoaderCircle`**，错误栈中看到 `<LoaderCircle>` 报错即指向此模式。

## Boundaries
- 纯文本节点之间的条件切换（`{a ? '文字A' : '文字B'}`）不受此限制
- React Portal 渲染到独立 DOM 挂载点的内容不受此限制

## Context Links
- Based on: [[knowledge/react-dom-crash-patterns/content]]
- Related: none
