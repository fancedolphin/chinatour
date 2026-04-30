# i18n / 双站部署 — 技术方案冻结（CHI-116）

冻结日期：2026-04-27
适用范围：项目「国际化：英文站点 + 双站部署」全部后续 issue。
本文件是后续 issue 的实施依据，发生偏差需先更新本文件再改实现。

## 1. 唯一主部署平台

**Cloudflare Pages**。

- 同一 git 仓库 → 两个 Pages Project：
  - `chinaview-zh` — 中文站，`Build Command: npm run build:zh`，`Build Output: dist/zh`
  - `chinaview-en` — 英文站，`Build Command: npm run build:en`，`Build Output: dist/en`
- 主域名：
  - `chinaview.cn`（中文站）
  - `chinaview.app`（英文站）
- 路由回退：`_redirects` 文件统一 `/* /index.html 200`，避免 SPA 刷新 404。
- 备选平台（Vercel/GitHub Actions 自定义部署）仅作为文档保留，不进入主执行链路。
  Linear 上对应的 CHI-112 / CHI-113 / CHI-114 / CHI-115 已标记为 Duplicate/Superseded，
  本项目所有部署相关工作以 CHI-126（实施）+ CHI-128（CI/CD）为唯一来源。

## 2. 私密配置边界

> 规则：浏览器 bundle 内不允许出现任何只允许后端持有的 API Key。
> 凡是命中以下 (a)(b)(c) 之一，必须放到 Supabase Edge Function 的 Secret，并由前端通过
> `supabase.functions.invoke(...)` 调用：
>   (a) 不能撤销/限流难度大；
>   (b) 与计费账户绑定，被滥用直接造成账单；
>   (c) 文档明确标注为 server-side only。

### 公开变量（允许打进前端 bundle，前缀 `VITE_*`）

| 变量 | 用途 | 双站差异 |
| --- | --- | --- |
| `VITE_LOCALE` | 站点语言（`zh` / `en`） | **差异**（zh.env=zh / en.env=en） |
| `VITE_SITE_TITLE` | HTML 标题 / `<title>` 注入 | 差异 |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 共用 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公开 key（受 RLS 保护） | 共用 |
| `VITE_AMAP_API_KEY` | 高德 JS API Web 端 key（必须公开，由白名单/安全码兜底） | 共用 |
| `VITE_AMAP_SECURITY_CODE` | 高德 JS 安全码 | 共用 |
| `VITE_GOOGLE_MAP_API_KEY` | Google Maps JS（如保留） | 共用 |
| `VITE_API_BASE_URL` | 自定义后端 base url（保留） | 共用 |
| `VITE_ENV` | 环境标识（dev/prod 等） | 共用 |

### 私密变量（必须放在 Supabase Functions Secrets，前端不可见）

| 变量 | 持有者 | 调用入口 |
| --- | --- | --- |
| `GEMINI_API_KEY` | Supabase Functions Secrets | `supabase/functions/gemini-proxy`、`supabase/functions/generate-embedding` |
| `AMAP_API_KEY`（服务端 REST） | Supabase Functions Secrets | `supabase/functions/amap-search`、`supabase/functions/amap-config` |
| `AMAP_SECURITY_CODE`（服务端） | Supabase Functions Secrets | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅在 seed/migration 脚本（本机/CI） | 不进入任何前端构建 |

### 已废弃

- `VITE_GEMINI_API_KEY` — **本项目起从前端彻底移除**，已从 `vite-env.d.ts` 与
  `.env.example` 删除。`.env.local` 中如仍残留请清理（仅本地，无需提交）。

## 3. AI 调用链路

```
浏览器  →  supabase.functions.invoke('gemini-proxy', { body })
                │
                ▼
        Supabase Edge Function (Deno)
                │  附 GEMINI_API_KEY
                ▼
        https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

- 入口文件：`supabase/functions/gemini-proxy/index.ts`
- 请求体（前端 → proxy）：
  ```ts
  {
    model: 'gemini-2.5-flash' | 'gemini-2.5-pro',
    systemInstruction?: string,
    contents: Content[],          // [{ role: 'user'|'model', parts: [{ text }] }]
    generationConfig?: {...},
    safetySettings?: [{ category, threshold }, ...]
  }
  ```
- 响应体（proxy → 前端）：
  ```ts
  { text: string, model: string, duration_ms: number, raw: <google response> }
  ```
- 前端 wrapper：`src/services/llm/llmConfig.ts`，保留原有
  `narrativeModel.get(...).generateContent(...)` 与
  `narrativeModel.startChat(...).sendMessage(...)` API 形态，
  调用方（`geminiService.ts`、`tripPlanningService.ts`）无需改动。

### 模型白名单

仅 `gemini-2.5-flash` 与 `gemini-2.5-pro` 允许通过 proxy；其他模型由专用 Edge Function 处理
（embedding 已有 `generate-embedding`）。

## 4. 双站环境变量矩阵

```
.env             # 共用基线（提交到仓库的占位）
.env.local       # 本机开发（不提交）
.env.zh          # 中文站构建专用（VITE_LOCALE=zh, VITE_SITE_TITLE=智行中国）
.env.en          # 英文站构建专用（VITE_LOCALE=en, VITE_SITE_TITLE=ChinaView）
```

实际域名 / 远端 Secret 注入由 CHI-117（构建脚本）与 CHI-126（部署）落地。

## 5. 验收映射

| 验收项 | 已落地 | 文件 |
| --- | --- | --- |
| 项目只存在一个主部署方案 | ✅ Cloudflare Pages | 本文件 §1 |
| `VITE_*` 中不再包含私密 API key | ✅ 移除 `VITE_GEMINI_API_KEY` | `src/vite-env.d.ts`、`.env.example` |
| AI 请求链路改为服务端/Edge 代理 | ✅ `gemini-proxy` Edge Function | `supabase/functions/gemini-proxy/` |
| 环境变量矩阵 | ✅ | 本文件 §2 §4 |

## 6. 后续依赖本文件的 issue

- CHI-117 双站构建：使用 §4 的 mode/env 文件命名
- CHI-118 i18n 基础层：使用 `VITE_LOCALE` 决定默认语言
- CHI-126 双站部署：按 §1 配置 Cloudflare Pages
- 其余 P2/P3 内容/数据/AI 票均在本边界内执行，不允许重新引入 `VITE_GEMINI_API_KEY`
