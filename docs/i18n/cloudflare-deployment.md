# Cloudflare Pages 双站部署指南

本项目以单仓库构建出两套静态产物（`dist/zh` / `dist/en`），通过 **两个独立的 Cloudflare Pages 项目** 分别部署到中、英文域名，共享同一份代码与同一份 Supabase 后端。

## 1. 产物结构

```
dist/
  zh/        # build:zh 输出 — VITE_LOCALE=zh
    index.html
    assets/
    _redirects     # 由 public/_redirects 复制
    _headers       # 由 public/_headers 复制
  en/        # build:en 输出 — VITE_LOCALE=en
    ...
```

`_redirects` 中的 `/*  /index.html  200` 是 SPA fallback，必备。
`_headers` 给静态资源设置长缓存 + 给 `index.html` 设置零缓存，并加 baseline 安全头。

## 2. Cloudflare Pages 项目配置

为中文站和英文站各创建一个 Pages 项目。**两个项目共用同一个 GitHub 仓库**，区别只在构建命令与输出目录。

### 中文站（chinaview-zh）
| 项 | 值 |
|---|---|
| Build command | `npm run build:zh` |
| Build output directory | `dist/zh` |
| Production branch | `main` |
| Custom domain | `zh.chinaview.example` |

### 英文站（chinaview-en）
| 项 | 值 |
|---|---|
| Build command | `npm run build:en` |
| Build output directory | `dist/en` |
| Production branch | `main` |
| Custom domain | `en.chinaview.example` |

每次推 `main` 时两个项目都会触发，但只各自输出自己的 `dist/<locale>`。

## 3. 环境变量

两个 Pages 项目都需要在 Settings → Environment variables 配置以下值（Production + Preview 都要设）：

| 变量 | 中文站 | 英文站 | 说明 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | 同 | 同 | 共用同一个 Supabase 实例 |
| `VITE_SUPABASE_ANON_KEY` | 同 | 同 | 同 |
| `VITE_AMAP_API_KEY` | 同 | 同 | 高德 Web Key（前端） |
| `VITE_AMAP_SECURITY_CODE` | 同 | 同 | 高德安全码 |

`VITE_LOCALE` / `VITE_SITE_TITLE` / `VITE_SITE_DESCRIPTION` 由 `.env.zh` / `.env.en` 提供，不需要在 Cloudflare 设置。

**绝不能**在前端再放 `VITE_GEMINI_API_KEY`：所有 LLM 调用走 `supabase/functions/gemini-proxy`，密钥仅放在 Supabase Edge Function secret。

## 4. Edge Function secret（Supabase 侧）

```bash
supabase secrets set GEMINI_API_KEY=<key>
supabase functions deploy gemini-proxy
```

## 5. 本地预演

```bash
npm run build:both          # 同时产出 dist/zh 与 dist/en
npm run preview:zh           # http://localhost:4173
npm run preview:en           # http://localhost:4174
```

## 6. 上线后回归检查（最小集）

- 每个站点首屏 `<html lang>`、`<title>` 是否正确
- 切到不存在的路由（如 `/foobar`）能落回 SPA 首页
- 静态资源（`/assets/*`）响应头含 `Cache-Control: max-age=31536000`
- Edge Function `gemini-proxy` 在 EN 站调用返回英文叙述
- AMap 脚本带 `lang=en` / `lang=zh_cn`
- `match_attractions` / `match_restaurants` RPC 调用带正确 `locale_filter`

## 7. 常见问题

- **404 直链刷新**：检查 `_redirects` 是否落在 dist 根。
- **AMap 提示安全码错误**：确认 `VITE_AMAP_SECURITY_CODE` 在 Pages 环境变量中存在。
- **EN 站出现中文内容**：定位到调用方是否漏传 `getCurrentLocale()` / `locale_filter`，参考 `src/services/planning/ragService.ts` 中已接入的 RPC 调用作为参考实现。
