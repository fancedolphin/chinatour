# CI/CD 与 Preview 部署（CHI-128）

## 总览

| 链路 | 触发 | 工作执行方 | 产物 |
|---|---|---|---|
| Production 部署 | push `main` | Cloudflare Pages（两个项目并行） | `zh.chinaview.example` / `en.chinaview.example` |
| PR Preview 部署 | 任意 PR | Cloudflare Pages（每个项目自动建预览域名） | `*.zh-chinaview.pages.dev` / `*.en-chinaview.pages.dev` |
| 双站构建校验 | PR + push `main` | GitHub Actions `build-i18n.yml` | `dist-zh` / `dist-en` artifacts (7d) |
| Planning 回归 | PR + push `main` | GitHub Actions `planning-regression.yml` | `planning-scorecard` artifact |
| Edge Function 部署 | push `main`（触发条件路径 `supabase/functions/**`） | GitHub Actions `deploy-edge-functions.yml` | gemini-proxy / amap-search / generate-embedding 部署到 Supabase |

主部署由 Cloudflare Pages 直接对接 GitHub 完成；GitHub Actions 主要承担**校验**与 **Edge Function 部署**两件事。

## 配置 Cloudflare Pages 自动部署

参见 `docs/i18n/cloudflare-deployment.md`。两个 Pages 项目都开启「自动构建 Production」「自动构建 Preview」，无需自己写 GitHub Action 推 dist。

## GitHub Actions secrets

在仓库 Settings → Secrets and variables → Actions 配置：

| Secret | 用途 |
|---|---|
| `VITE_SUPABASE_URL` | build-i18n 双站构建 |
| `VITE_SUPABASE_ANON_KEY` | 同上 |
| `VITE_AMAP_API_KEY` | 同上 |
| `VITE_AMAP_SECURITY_CODE` | 同上 |
| `SUPABASE_ACCESS_TOKEN` | Edge Function 部署（personal access token） |
| `SUPABASE_PROJECT_REF` | 例如 `ogodnvjaiwelqmjqkvda` |

> Cloudflare Pages 项目的环境变量在 Pages Dashboard 单独配置，不与 GitHub secrets 共享。

## 构建失败反馈

- GitHub Actions：失败状态在 PR check 中可见，仓库级 settings 已开启 `Required status checks` 时，失败会阻止合入。
- Cloudflare Pages：失败时项目页面显示红色徽章，并通过 GitHub commit status `cloudflare-pages` 反馈到 PR check。
- 推荐在仓库 Settings → Branches → `main` branch protection 中要求 `build-i18n / build (zh)`、`build-i18n / build (en)`、`planning-regression / test` 三个 check 必须通过。

## Edge Function 部署细节

- 仅当 `supabase/functions/**` 实际变更时才会跑（path filter）
- `gemini-proxy` 是必需任务，amap-search / generate-embedding 用 `continue-on-error: true` 是因为这两个目前已稳定，临时失败不应阻止主链路；如需严格化，移除该字段
- 部署完成后必须保证 secret 已存在：`supabase secrets set GEMINI_API_KEY=...`（首次部署或换 key 时手动跑）

## 验收对照

- [x] push to main 自动部署 — Cloudflare Pages 自动触发
- [x] PR 有 Preview — Cloudflare Pages 自动生成
- [x] zh/en 双版本构建在 CI 中校验 — `build-i18n.yml` matrix
- [x] 构建失败可见 — Actions check + Pages commit status
- [x] Edge 代理纳入发布流程 — `deploy-edge-functions.yml`
