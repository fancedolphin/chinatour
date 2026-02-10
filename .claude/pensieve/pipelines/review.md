---
name: review
description: |
  代码审查 pipeline。基于 Linus Torvalds 的品味哲学、John Ousterhout 的设计原则与 Google Code Review 标准。

  在以下情况使用此 pipeline：
  - 用户明确要求代码审查
  - 用户说“review”“代码审查”“帮我检查代码”
  - 需要评估代码质量或设计决策

  示例：
  <example>
  User: "帮我 review 这段代码"
  -> 触发此 pipeline
  </example>
  <example>
  User: "检查这个 PR"
  -> 触发此 pipeline
  </example>

signals: ["review", "code review", "check code", "code quality", "代码审查", "审查代码", "检查代码", "代码质量", "review一下"]
stages: [tasks]
gate: auto
---

# 代码审查 Pipeline

这个 pipeline 负责把代码审查直接映射成可执行 task 列表。审查标准与深层依据统一放在 Knowledge 中。

**Knowledge 参考**：`<SYSTEM_SKILL_ROOT>/knowledge/taste-review/content.md`

---

## Task Blueprint（按顺序创建任务）

### Task 1：准备审查上下文

**目标**：明确审查边界，避免漏审

**读取输入**：
1. 用户指定的文件 / 提交 / PR 范围
2. `<SYSTEM_SKILL_ROOT>/knowledge/taste-review/content.md`

**执行步骤**：
1. 确认审查范围（文件 / 提交 / 代码片段）
2. 识别技术语言、业务约束与风险点
3. 输出待审文件清单（按优先级）

**完成标准**：范围清晰，且有可执行的待审文件列表

---

### Task 2：逐文件审查并记录证据

**目标**：基于统一标准形成逐文件结论

**读取输入**：
1. Task 1 产出的待审文件清单
2. `<SYSTEM_SKILL_ROOT>/knowledge/taste-review/content.md`

**执行步骤**：
1. 对每个文件执行审查清单（不在此重复理论）
2. 按严重级别记录结论：PASS / WARNING / CRITICAL
3. 对每条 WARNING/CRITICAL 标注精确代码位置
4. 记录用户可见行为变化风险（若有）

**完成标准**：每个文件都有带证据结论，且高风险问题可定位

---

### Task 3：生成可执行审查报告

**目标**：给出可落地的整改建议与优先级

**读取输入**：
1. Task 2 的审查记录

**执行步骤**：
1. 按严重级别汇总关键问题
2. 提供具体修复建议或重写方案
3. 明确指出任何用户可见行为变化与回归风险
4. 给出推荐修复顺序（先 CRITICAL，再 WARNING）

**完成标准**：报告包含完整发现、定位证据、修复建议与优先级

---

## 执行规则（给 loop 用）

1. 命中此 pipeline 时，按 Task 1 → Task 2 → Task 3 的顺序创建任务。
2. 默认 1:1 映射创建，不合并、不跳步。
3. 若信息缺失，在当前 task 内补齐，不额外新建 phase。
