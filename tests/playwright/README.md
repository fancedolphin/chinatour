# Playwright 浏览器 E2E

落地 Linear 项目「质量保障：全页面端到端测试」全部 6 个模块文档中标注为 **自动化** 的 P0/P1 用例。

## 模块覆盖矩阵

| 模块文档 | spec 文件 | 覆盖范围 |
|---|---|---|
| 认证与导航 | `e2e/p0-auth-guard.spec.ts` | P0 重定向 / 登录 / 深链 / 底部导航 / 后退前进；P1 登录错误 + `auth:unauthorized` 事件 |
| Planner 与 AI 规划链路 | `e2e/p0-planner-preview.spec.ts` + `e2e/planner-extended.spec.ts` | P0 入口分支 + ExistingPlan 文本生成；P1 详情卡保留为 TODO |
| Trips、详情与地图 | `e2e/p0-trips-flow.spec.ts` | P0 列表/详情/地图/继续修改/删除（删除默认 skip） |
| Discover 与共享行程 | `e2e/p0-discover-import.spec.ts` | P0 列表/详情/导入/作者主页/关注 tab；P1 搜索 |
| Profile 与 Tips | `e2e/profile-tips.spec.ts` | P0 我的主页/他人主页返回链路/Tips 加载；P1 食物百科筛选 |
| 模态框、弹层与第三方出口 | `e2e/modals.spec.ts` | P0 PublishTripModal / ShareTripModal / ExportScopeSheet 打开关闭 |

按 `playwright test --list`：**zh project 31 个 + en project 9 个（仅 auth-guard 通用）+ setup 1 个 = 41 个**。

## 架构

- **Auth setup project**：`auth.setup.ts` 一次登录写 storageState，所有 spec 复用，跑得快。
- **方案 C 混合后端**：Auth/CRUD 走真 Supabase，Gemini/AMap/AMap-SDK 经 `fixtures/stubs.ts` 拦截。
- **stable test ids**（已注入）：
  - `data-testid="trip-card"` （MyTripsPage）
  - `data-testid="shared-trip-card"` + `data-testid="author-link"` （SharedTripFeedList）
  - `data-testid="nav-{planner|trips|tips|discover|profile}"` （TripPlannerBottomNav）
- **EN matrix**：目前只把 `p0-auth-guard` 纳入 EN project（路由/权限文案与 i18n 无关），业务模块 i18n 文案稳定后再扩。
- **skip 策略**：依赖测试账号已有数据的用例若数据为空则 `test.skip()` —— CI 不红屏；nightly 通过 seed 脚本消除 skip。

## 本地运行

```bash
npx playwright install chromium      # 一次性
npm run test:e2e:browser              # 全部
npm run test:e2e:browser:ui           # UI 调试
npx playwright test e2e/p0-auth-guard.spec.ts   # 单文件
```

`webServer` 自动起 `npm run dev`。如已起好 vite，加 `PLAYWRIGHT_SKIP_WEBSERVER=1`。

## CI

`.github/workflows/e2e-browser.yml` PR 触发，需要 Secrets：

- `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY`
- `E2E_AMAP_API_KEY`
- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`

失败时上传 `playwright-report` artifact（含 trace + video + screenshot）。

## 仍属人工回归（参见总计划 L3）

| 项 | 原因 |
|---|---|
| 真实 AMap SDK 渲染 / 缩放 / 聚合 | SDK 已被 stub 拦截，不验证渲染 |
| 外部地图 App 深链跳转（`uri.amap.com`/`maps://`） | 浏览器无法验证 native scheme |
| 图片分享 / 二维码 / 剪贴板 | DOM API 在 headless 不可靠 |
| 第三方点评/外链跳转 | 走第三方网络 |
| 弱网 / 长文本 / 真实 LLM 波动 | 主链路用 stub，体验类待人工 |
| 多次连续规划、超长输入文本 | 同上 |

## 下一步迭代

| 项 | 状态 |
|---|---|
| 1. seed fixture trip in auth.setup | ✅ 完成（idempotent，via dev-mode `window.__supabase`） |
| 2. EN matrix（auth-guard + en-locale 双 dev server） | ✅ 完成 |
| 3. P1 雨天重规划 spec | ✅ 完成 service-level（`tests/e2e/weatherReplan.test.ts`，含餐厅锚点联动） |
| 4. P1 加载失败 overlay | ✅ 完成（`trip-map-error.spec.ts`，stub amap-config 失败） |
| 5. Detail Card 打开/关闭 | 🟡 待补，需 GuidedQuestion → 结果展示链路稳定 |
| 6. 删除行程 case | 🟡 默认 skip，nightly + seed 重置 |
| 7. shared trip seeding | 🟡 P0 discover/import 仍部分 skip，需 seed 一条 published trip |

## 双站 dev server

EN matrix 真实运行 `vite --mode en`（`.env.en` 注入 `VITE_LOCALE=en`），而非 localStorage 切换。  
`playwright.config.ts` 同时拉起 zh@5173 + en@5174 两个 dev server，setup-zh / setup-en 各自登录到对应 origin 写自己的 `tests/playwright/.auth/user-{zh|en}.json`。
