# 双语回归验收清单（CHI-127）

每次发布到 Production 前，按以下顺序在 zh 站和 en 站各跑一遍。任何 ❌ 项必须修复后才发布。

## 0. 构建/部署

- [ ] `npm run test` 全绿（vitest 36 用例）
- [ ] `npm run build:zh` 成功，`dist/zh/index.html` 含 `lang="zh"`、标题为「智行中国」
- [ ] `npm run build:en` 成功，`dist/en/index.html` 含 `lang="en"`、标题为「ChinaView」
- [ ] `dist/{zh,en}/_redirects` 与 `_headers` 都存在
- [ ] Cloudflare Pages 两个项目最近一次构建均为 Success

## 1. 顶层站点 / 文案

| 入口 | zh 站 | en 站 |
|---|---|---|
| 首屏 Header / 主 CTA | 中文 | 英文 |
| 登录页 | 中文 | 英文 |
| 我的行程列表（空态、状态徽章、删除二次确认） | 中文 | 英文 |
| AI Planner Chat 引导问、4 个 quick prompt | 中文 | 英文 |
| Trip Detail 行程/预算 Tab、分段标签、预订提示 | 中文 | 英文 |
| Trip Map 信息浮窗、收藏 toast、距离单位 | 中文 | 英文 |
| Destination Explore 搜索/历史/热门 | 中文 | 英文 |

抽样 ≥ 6 处页面，确认无 zh 字符泄漏到 en 站、无 i18n key 原样输出（如 `planner.service.assistantSummary`）。

## 2. 日期 / 数字 / 货币

- [ ] zh 站显示「4月28日 - 5月5日」「约¥3,200（人均¥400/天）」「2小时30分钟」
- [ ] en 站显示「Apr 28 – May 5」「~¥3,200 (¥400/day)」「2h 30min`」
- [ ] 跨年日期范围在两个 locale 都正确（用 Intl.DateTimeFormat.formatRange，带 fallback）

## 3. AI / RAG / Prompt

- [ ] zh 站 chat 输出全中文，含 JSON code block 时 schema 字段名为英文
- [ ] en 站 chat 输出全英文，中文地名首次出现含括号原字（如 "West Lake (西湖)"）
- [ ] 切换语言后下一次对话立即生效（无须刷新）
- [ ] `gemini-proxy` Edge Function 日志可见，且不含 `VITE_GEMINI_API_KEY`
- [ ] 触发雨天 replan，narrative 文本语言与当前 locale 一致

## 4. RAG / 数据 locale 路由

在 SQL editor 跑：

```sql
select locale, count(*) from attractions group by 1;
select locale, count(*) from restaurants group by 1;
select locale, count(*) from travel_tips group by 1;
select locale, count(*) from destinations group by 1;
```

- [ ] `locale='en'` 行数 > 0（运行过 `npm run seed:rag-en` 之后）
- [ ] `locale='zh'` 行数维持原值（未被 EN 覆盖）
- [ ] 在 en 站打开 Network，找一次 `match_attractions` POST，body 含 `"locale_filter":"en"`
- [ ] 同样位置在 zh 站抓包，body 含 `"locale_filter":"zh"`

## 5. 地图

- [ ] AMap 脚本 URL 在 zh 站为 `lang=zh_cn`，en 站为 `lang=en`
- [ ] EN 站打开一个有 `name_en` 的地点，详情面板显示英文名 + 英文地址；无 `name_en` 时回落中文
- [ ] City cluster 数量与展开行为在两站一致
- [ ] 静态地图导出（高德 staticmap）markers 正常

## 6. 安全 & 缓存头

```bash
curl -I https://en.chinaview.example/assets/index-XXXX.js
```

- [ ] `Cache-Control: public, max-age=31536000, immutable`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

```bash
curl -I https://en.chinaview.example/index.html
```

- [ ] `Cache-Control: public, max-age=0, must-revalidate`

## 7. SPA Fallback

- [ ] 直接打开 `https://en.chinaview.example/trip/non-existent-id` 不返回 Cloudflare 404，而是落回 SPA index 并由前端处理
- [ ] zh 站同样行为

## 8. 切换语言（持久化）

- [ ] 在 zh 站点用 Settings 切到英文，刷新后保留英文 UI（localStorage 持久化）
- [ ] 反向同样

## 9. Linear 状态

- [ ] CHI-116 ~ CHI-127 所有 issue 切到 Done
- [ ] 在 CHI-127 评论里贴本次回归的截图/录屏证据

---

签字人：______________  日期：______________
