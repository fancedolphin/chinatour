# 优化AI规划能力 Project - Issues 纯原文

导出时间：2026-03-16  
项目链接：https://linear.app/chinaview/project/优化ai规划能力-8963fe1c9b2b

> 说明：以下内容按 Issue 编号整理，`Description` 为 Linear 中原始文本，不做摘要改写。

---

## CHI-24 Edge Function generate-embedding — 封装 Gemini text-embedding-004

- URL: https://linear.app/chinaview/issue/CHI-24/edge-function-generate-embedding-封装-gemini-text-embedding-004
- Milestone: M1: 嵌入基础设施
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

RAG 管道需要将文本转换为 768 维向量（与 DB schema 中 `vector(768)` 对齐）。Gemini 提供 `text-embedding-004` 模型，输出正好是 768 维。

需要一个 Supabase Edge Function 作为统一的 embedding 生成入口，供：

1. 知识库种子脚本批量写入 embedding
2. 客户端查询前将用户输入转为向量

## Edge Function：`generate-embedding`

### 接口

```ts
// POST /functions/v1/generate-embedding
// Request
{ "text": string }

// Response
{ "embedding": number[] }  // 长度 768
```

### 实现

```ts
// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'text is required' }), { status: 400 });
  }

  const res = await fetch(`${EMBED_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  const data = await res.json();
  const embedding: number[] = data.embedding.values;

  return new Response(JSON.stringify({ embedding }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Secrets 配置

```bash
supabase secrets set GEMINI_API_KEY=<your_key>
```

## 验收标准

- [ ] `POST /functions/v1/generate-embedding` 返回长度 768 的 `embedding` 数组
- [ ] 文本为空时返回 400
- [ ] Gemini API Key 通过 secrets 注入，不硬编码

---

## CHI-25 知识库数据清洗格式规范 + embedding 入库脚本

- URL: https://linear.app/chinaview/issue/CHI-25/知识库数据清洗格式规范-embedding-入库脚本
- Milestone: M2: 知识库建设
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

数据由用户自行爬取，本 issue 定义：

1. 爬取数据清洗后的 **JSON 格式规范**（对齐 DB schema）
2. 清洗脚本需要填写的 `_embedding_text` 字段规则
3. **DB migration**：为 attractions / restaurants 新增 `videos JSONB` 列（存储视频链接）
4. **入库脚本** `scripts/seed-rag-knowledge.mjs`：读取清洗后 JSON → 生成 embedding → upsert DB

---

## 目录结构

```
data/
  cleaned/
    {city}/               # 每个城市一个目录，city 即 destinations.name
      destination.json    # 目的地基本信息（必须先入库，其余表 FK 依赖它）
      attractions.json
      restaurants.json
      travel_tips.json
      transportation.json
```

---

## 数据格式规范

### `destination.json`（单个对象，非数组）

```json
{
  "name": "北京",
  "country": "中国",
  "description": "中国首都，有故宫、长城等世界遗产，历史文化底蕴深厚。",
  "best_season": "春季（4-5月）和秋季（9-10月）",
  "average_budget_daily": "¥300-800",
  "currency": "CNY",
  "timezone": "Asia/Shanghai",
  "_embedding_text": "北京 中国首都 历史文化 故宫 长城 世界遗产 皇家建筑 四合院"
}
```

---

### `attractions.json`（数组）

```json
[
  {
    "name": "故宫博物院",
    "category": "history",
    "description": "明清两代皇宫，世界最大古代宫殿群，馆藏文物超180万件。",
    "address": "北京市东城区景山前街4号",
    "location_lat": 39.9163,
    "location_lng": 116.3972,
    "opening_hours": {
      "weekday": "08:30-17:00",
      "weekend": "08:30-17:00",
      "closed": "周一"
    },
    "ticket_price": "¥60（旺季4-10月）/ ¥40（淡季11-3月）",
    "recommended_duration": "3-4小时",
    "best_time_to_visit": "春秋两季，工作日人少",
    "tags": ["历史", "文化", "世界遗产", "皇家建筑", "博物馆"],
    "avg_rating": 4.8,
    "review_count": 12000,
    "videos": [
      {
        "platform": "douyin",
        "url": "https://www.douyin.com/video/xxx",
        "title": "故宫一日游全攻略",
        "thumbnail_url": "https://..."
      },
      {
        "platform": "xiaohongshu",
        "url": "https://www.xiaohongshu.com/explore/xxx",
        "title": "故宫打卡必去的10个地方",
        "thumbnail_url": "https://..."
      }
    ],
    "_embedding_text": "故宫博物院 明清皇宫 历史文化 世界遗产 皇家建筑 博物馆 ¥60门票 3-4小时参观"
  }
]
```

**category 枚举**：`history` / `nature` / `theme_park` / `museum` / `temple` / `landmark` / `park` / `shopping`

---

### `restaurants.json`（数组）

```json
[
  {
    "name": "全聚德（前门店）",
    "cuisine_type": "北京菜",
    "description": "创立于1864年的百年老字号，以北京烤鸭闻名，片鸭三吃是招牌吃法。",
    "address": "北京市东城区前门大街30号",
    "location_lat": 39.8993,
    "location_lng": 116.3977,
    "price_range": "¥¥¥",
    "meal_type": "lunch,dinner",
    "specialties": ["北京烤鸭", "片鸭三吃", "鸭架汤"],
    "dietary_options": [],
    "opening_hours": { "daily": "11:00-21:00" },
    "reservation_required": true,
    "avg_rating": 4.5,
    "review_count": 8000,
    "videos": [
      {
        "platform": "douyin",
        "url": "https://www.douyin.com/video/yyy",
        "title": "全聚德烤鸭值不值？",
        "thumbnail_url": "https://..."
      }
    ],
    "_embedding_text": "全聚德 北京烤鸭 北京菜 老字号 前门 ¥¥¥ 需要预约 片鸭三吃"
  }
]
```

**price_range 枚举**：`¥`（人均<50）/ `¥¥`（50-150）/ `¥¥¥`（150-400）/ `¥¥¥¥`（400+）

---

### `travel_tips.json`（数组）

```json
[
  {
    "category": "transport",
    "title": "北京地铁出行指南",
    "content": "北京地铁覆盖主要景点，单程¥3起。建议购买交通一卡通，无需每次排队。高峰期（7:30-9:00、17:30-19:00）避开换乘大站（国贸/西直门）。",
    "is_important": true,
    "season_specific": null,
    "videos": [
      {
        "platform": "xiaohongshu",
        "url": "https://...",
        "title": "北京地铁避坑指南",
        "thumbnail_url": "https://..."
      }
    ],
    "_embedding_text": "北京地铁 交通出行 换乘 交通一卡通 高峰期 避坑"
  }
]
```

**category 枚举**：`transport` / `weather` / `food` / `safety` / `culture` / `shopping` / `accommodation`

---

### `transportation.json`（数组）

```json
[
  {
    "type": "subway",
    "name": "北京地铁",
    "description": "覆盖全市主要区域，共27条线路。",
    "price_info": { "base_fare": "¥3起按距离计费", "day_pass": "无通票" },
    "operating_hours": "05:00-23:30（各线末班车略有差异）",
    "tips": "景点周边地铁站：故宫→天安门东站，长城→八达岭景区需转公交。"
  }
]
```

---

## `_embedding_text` 规则

清洗脚本必须填写 `_embedding_text`，入库脚本只读此字段生成向量，不自动拼接。

| 类型 | 内容建议 |
| -- | -- |
| attraction | `名称 + 简短描述关键词 + tags + 价格 + 游玩时长` |
| restaurant | `名称 + 菜系 + 招牌菜 + 价位 + 特色描述词` |
| travel_tip | `标题 + 内容摘要关键词 + category` |
| destination | `城市名 + 国家 + 核心标签 + 著名景点` |

> **原则**：embedding text 越精炼越好，去掉冠词/标点，保留语义关键词，控制在 100-200 字以内。

---

## DB Migration：attractions / restaurants 新增 videos 列

```sql
ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';

ALTER TABLE public.travel_tips
  ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';
```

在执行入库脚本前需先跑此 migration。

---

## 入库脚本：`scripts/seed-rag-knowledge.mjs`

```js
// 用法：
// SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-rag-knowledge.mjs [city]
// 不指定 city 则处理 data/cleaned/ 下所有目录

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 调用 CHI-24 的 Edge Function 生成 embedding
async function embed(text) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/generate-embedding`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  );
  const { embedding } = await res.json();
  return embedding;
}

async function seedCity(cityDir) {
  const cityName = path.basename(cityDir);
  console.log(`\n=== 处理城市：${cityName} ===`);

  // 1. upsert destination，取回 destination_id
  const dest = JSON.parse(fs.readFileSync(`${cityDir}/destination.json`, 'utf8'));
  dest.embedding = await embed(dest._embedding_text);
  delete dest._embedding_text;

  const { data: destRow } = await supabase
    .from('destinations')
    .upsert(dest, { onConflict: 'name' })
    .select('id')
    .single();
  const destinationId = destRow.id;
  console.log(`  destination_id: ${destinationId}`);

  // 2. 批量处理 attractions / restaurants / travel_tips / transportation
  for (const [table, file] of [
    ['attractions', 'attractions.json'],
    ['restaurants', 'restaurants.json'],
    ['travel_tips', 'travel_tips.json'],
    ['transportation', 'transportation.json'],
  ]) {
    const filePath = `${cityDir}/${file}`;
    if (!fs.existsSync(filePath)) continue;

    const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`  ${table}: ${rows.length} 条`);

    for (const row of rows) {
      if (row._embedding_text) {
        row.embedding = await embed(row._embedding_text);
        delete row._embedding_text;
      }
      row.destination_id = destinationId;
    }

    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'name,destination_id' });

    if (error) console.error(`  ❌ ${table} upsert 失败:`, error.message);
    else console.log(`  ✅ ${table} 写入完成`);
  }
}

// 主流程
const cleanedDir = 'data/cleaned';
const targetCity = process.argv[2];
const cities = targetCity
  ? [`${cleanedDir}/${targetCity}`]
  : fs.readdirSync(cleanedDir).map(d => `${cleanedDir}/${d}`);

for (const cityDir of cities) {
  await seedCity(cityDir);
}
```

## 验收标准

- [ ] `data/cleaned/beijing/` 下 5 个文件格式校验通过
- [ ] `node scripts/seed-rag-knowledge.mjs beijing` 执行无报错
- [ ] DB 中 `attractions` 有数据且 `embedding` 非 null
- [ ] `match_attractions(embedding, 0.7, 5, '北京')` 返回相关景点
- [ ] videos 字段正确写入 JSONB，不影响 embedding 生成

---

## CHI-26 ragService.ts — 按规划槽位检索 + 置信度评分（替换单次 query）

- URL: https://linear.app/chinaview/issue/CHI-26/ragservicets-按规划槽位检索-置信度评分替换单次-query
- Milestone: M3: 检索服务
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

原设计用一次 `retrieveContext(destination, preferences)` 检索所有内容。问题在于：

* 混合 query 会把结果压窄（"敦煌 沙漠 历史"会漏掉餐饮/交通/预约约束）
* 没有置信度，无法判断是否足够支撑规划任务
* 无法区分哪些槽位缺失、哪些已满足

本 issue 将检索入口改为**槽位驱动**（slot-based retrieval），每个槽位独立检索，携带相似度分数。

## 核心数据结构

```ts
// 规划意图（由 GuidedQuestionPage 收集后传入）
export interface PlanningIntent {
  destination: string;
  duration_days: number;
  preferences: string[];     // ['历史', '沙漠', '摄影']
  budget_level: '¥' | '¥¥' | '¥¥¥' | '¥¥¥¥';
  travel_style: 'relaxed' | 'packed' | 'balanced';
}

// 单条检索结果，携带来源和置信度
export interface RagItem {
  name: string;
  description: string;
  category: string;
  tags: string[];
  source: 'rag' | 'amap';         // 数据来源
  confidence: number;              // 0-1，来自向量相似度或固定值
  metadata?: Record<string, any>;  // ticket_price / price_range / booking_required 等
}

// 按槽位组织的上下文
export interface SlottedRagContext {
  core_attractions:      RagItem[];   // 目的地核心景点
  food:                  RagItem[];   // 餐饮
  transport:             RagItem[];   // 交通方式
  booking_constraints:   RagItem[];   // 需提前预约/购票的地点
  climate_guidance:      RagItem[];   // 气候/季节建议（静态，非实时天气）
  slot_coverage: {                    // 每个槽位的覆盖情况
    [slot: string]: { count: number; avg_confidence: number; satisfied: boolean }
  };
}
```

## 槽位检索策略

```ts
const SLOT_QUERIES: Record<string, (intent: PlanningIntent) => string> = {
  core_attractions:    (i) => `${i.destination} 必去景点 ${i.preferences.join(' ')}`,
  food:                (i) => `${i.destination} 特色餐饮 ${i.budget_level}`,
  transport:           (i) => `${i.destination} 交通 出行方式 自驾 拼车`,
  booking_constraints: (i) => `${i.destination} 预约 限流 购票 提前`,
  climate_guidance:    (i) => `${i.destination} 气候 季节 穿衣 最佳出行月份`,
};

// 各槽位满足阈值（低于此置信度或数量则认为槽位未满足）
const SLOT_THRESHOLDS = {
  core_attractions:    { min_count: 3, min_avg_confidence: 0.72 },
  food:                { min_count: 2, min_avg_confidence: 0.70 },
  transport:           { min_count: 1, min_avg_confidence: 0.68 },
  booking_constraints: { min_count: 0, min_avg_confidence: 0.0 },  // 可为空
  climate_guidance:    { min_count: 1, min_avg_confidence: 0.68 },
};
```

## 接口

```ts
export const ragService = {
  /**
   * 按规划槽位并发检索，返回带置信度的结构化上下文
   * 每个槽位独立 embedding → pgvector 查询
   */
  async retrieveBySlots(intent: PlanningIntent): Promise<SlottedRagContext>

  /**
   * 判断当前 context 哪些槽位未满足，供 fallback 决策
   */
  getUnsatisfiedSlots(ctx: SlottedRagContext): string[]
}
```

## 验收标准

- [ ] 5 个槽位并发检索，总耗时 < 单次顺序检索 × 5
- [ ] 每个 `RagItem` 携带 `confidence` 字段（来自 pgvector 余弦相似度）
- [ ] `slot_coverage` 正确标记 `satisfied: false` 的槽位
- [ ] TypeScript 无编译错误

---

## CHI-27 geminiService — 结构化输入生成自然语言 + 天气分层处理 + 雨天应急方案响应

- URL: https://linear.app/chinaview/issue/CHI-27/geminiservice-结构化输入生成自然语言-天气分层处理-雨天应急方案响应
- Milestone: M4: Gemini 上下文注入
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

依赖：CHI-30（StructuredItinerary）、CHI-31（ValidationResult）

原设计把检索结果直接塞入 system prompt，问题：

1. 天气信息时间语义错位（"现在晴 14°C" 被当成出行期间天气）
2. 高德 POI 数据在 system prompt 中被 Gemini 默认全部可信
3. 没有处理用户临时说"今天下雨了"的场景

本 issue 是整个链路的**最后一层**，接收已校验的结构化草案，生成最终可读行程，并处理天气两类场景。

## 输入结构

```ts
// geminiService 接收的完整上下文，替换原有扁平 RagContext
interface GenerationInput {
  intent: PlanningIntent;
  validated: ValidationResult;           // 来自 CHI-31
  weather?: {
    type: 'climate' | 'realtime';
    content: string;
    // climate：季节气候描述（静态，来自 travel_tips.climate_guidance）
    // realtime：仅当用户明确提供出发日期时才查询并传入
  };
}
```

## system prompt 结构分区

不再把所有内容平铺，改为明确分区，每区标注权威度：

```
## 行程草案（已经过规划引擎校验）
{validated.itinerary.days → JSON 转 Markdown 表格}

置信度说明：
- [高] 来自知识库（rag）
- [中] 来自高德搜索（amap），建议出发前确认
- [低/AI推测] 模型补全，请以实地为准

## 注意事项（Validator 产出）
{validated.warnings}

## 气候参考（非出行期间实时天气）
{weather.content if type==='climate'}
注：以上为季节性气候参考，非出行当日预报。实际天气请查阅出发前天气预报。

## 待确认事项
{validated.itinerary.unknowns → 逐条列出}

## 生成规则
1. 根据草案写自然语言，不要重新规划景点顺序
2. [低/AI推测] 的地点写"建议到当地咨询"而非直接推荐
3. 如 unknowns 非空，在回复结尾明确告知用户哪些信息无法确认
4. 不要把气候参考当成出行当天天气
```

## 天气分层处理

| 场景 | 天气类型 | 获取方式 | 注入方式 |
| -- | -- | -- | -- |
| 用户未提供出发日期 | `climate` | RAG travel_tips 中的季节描述 | 注入 system prompt，标注"季节参考" |
| 用户提供明确出发日期 | `realtime` | 调用 CHI-28 amap-search weather | 单独注入，标注"出行期间预报" |
| 用户对话中说"今天下雨了" | 触发应急方案 | 见下方 | **不注入 prompt，走应急处理器** |

## 雨天应急方案：响应式触发，非预生成

**不在初次规划时生成备用方案**（避免每个行程都带一套备份，token 浪费且用户体验差）。

当用户在对话中发送包含以下信号的消息时，触发应急处理：

```ts
const WEATHER_TRIGGER_PATTERNS = [
  /下雨/, /雨天/, /下雪/, /天气不好/, /刮风/, /台风/, /暴雨/, /今天天气/,
];

function isWeatherContingencyRequest(message: string): boolean {
  return WEATHER_TRIGGER_PATTERNS.some(p => p.test(message));
}
```

触发后，在下一轮 Gemini 调用前注入专用 prompt 块：

```
## 天气应急模式
用户报告当前天气异常。请针对以下情况调整今日行程：
- 当前规划中的户外景点：{today_outdoor_attractions}
- 备选室内选项（来自知识库）：{indoor_alternatives}
- 调整原则：
  1. 户外重点景点推迟而非取消（给出改期建议）
  2. 优先推荐室内替代（博物馆/商场/美食街）
  3. 如全天室外无替代，诚实告知"建议休整"
  4. 不要凭空编造室内景点
```

注意：应急方案只针对"今天"，不改变整个行程的其他天。

## 完整链路

```
PlanningIntent
    │
    ├─ CHI-26: ragService.retrieveBySlots()
    ├─ CHI-29: amapFallbackService（必要时）
    ├─ CHI-30: tripPlannerService.generateStructuredDraft()
    ├─ CHI-31: itineraryValidator.validate()
    │
    └─ CHI-27: geminiService.generateNarrative(GenerationInput)
                    │
                    ├─ can_generate=true  → 正常输出带置信标注的行程
                    └─ can_generate=false → 降级文案 + 建议用户补充信息

对话轮次 2+：
    用户消息 → isWeatherContingencyRequest()?
                    YES → 注入应急 prompt block → Gemini 输出调整建议
                    NO  → 正常对话（带行程上下文）
```

## 验收标准

- [ ] system prompt 中气候信息有明确"季节参考"标注，不会被当成当天天气
- [ ] `source: 'llm'` 的地点在输出中标注"（AI 推测，请以实地为准）"
- [ ] `unknowns` 非空时回复末尾有"以下信息暂无法确认"提示
- [ ] 用户说"今天下雨了"→ 只调整当天行程，其余天不变
- [ ] 雨天应急不依赖预生成，每次响应式触发
- [ ] `can_generate: false` 时输出降级文案而非错误信息

---

## CHI-28 Edge Function amap-search — 代理高德 POI 关键词搜索 + 天气查询

- URL: https://linear.app/chinaview/issue/CHI-28/edge-function-amap-search-代理高德-poi-关键词搜索-天气查询
- Milestone: 未分配
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

高德 MCP Server（`@amap/amap-maps-mcp-server`）封装了高德 Web Service REST API，其中对 RAG fallback 最有用的是：

* **关键词搜索** `/v3/place/text`：按城市+关键词搜索 POI（景点/餐厅）
* **天气查询** `/v3/weather/weatherInfo`：返回城市实时天气，可注入 travel_tips 上下文

由于 AMap API Key 不能暴露在前端，封装为 Supabase Edge Function 代理。

## Edge Function：`amap-search`

### 接口

```ts
// POST /functions/v1/amap-search
// Request
{
  "action": "places" | "weather",
  "city": string,           // 城市名，如 "北京"
  "keyword"?: string,       // action=places 时必填
  "types"?: string,         // 高德 POI 类型代码，默认见下方
  "limit"?: number          // 返回数量，默认 10，最大 25
}

// Response（action=places）
{
  "pois": [
    {
      "name": string,
      "type": string,        // 高德原始类型，如 "风景名胜;名胜古迹"
      "address": string,
      "location": string,    // "lng,lat" 格式
      "rating": string | null,
      "cost": string | null, // 人均消费（元）
      "photos": [{ "url": string }]
    }
  ]
}

// Response（action=weather）
{
  "weather": string,         // 天气描述，如 "晴"
  "temperature": string,     // 温度
  "winddirection": string,
  "windpower": string,
  "humidity": string,
  "reporttime": string
}
```

### 实现

```ts
// supabase/functions/amap-search/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';

const AMAP_KEY = Deno.env.get('AMAP_API_KEY')!;
const BASE = 'https://restapi.amap.com/v3';

// 高德 POI 类型代码
const POI_TYPES = {
  attractions: '风景名胜|文化场馆|休闲娱乐',
  restaurants: '餐饮服务',
  all: '风景名胜|文化场馆|餐饮服务',
};

serve(async (req) => {
  const { action, city, keyword, types, limit = 10 } = await req.json();

  if (action === 'places') {
    const params = new URLSearchParams({
      keywords: keyword ?? city,
      city,
      types: types ?? POI_TYPES.all,
      output: 'json',
      offset: String(Math.min(limit, 25)),
      key: AMAP_KEY,
    });

    const res = await fetch(`${BASE}/place/text?${params}`);
    const data = await res.json();

    if (data.status !== '1') {
      return new Response(JSON.stringify({ error: data.info }), { status: 500 });
    }

    const pois = (data.pois ?? []).map((p: any) => ({
      name: p.name,
      type: p.type,
      address: p.address,
      location: p.location,
      rating: p.biz_ext?.rating ?? null,
      cost: p.biz_ext?.cost ?? null,
      photos: (p.photos ?? []).slice(0, 2).map((ph: any) => ({ url: ph.url })),
    }));

    return new Response(JSON.stringify({ pois }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'weather') {
    const params = new URLSearchParams({ city, key: AMAP_KEY, extensions: 'base' });
    const res = await fetch(`${BASE}/weather/weatherInfo?${params}`);
    const data = await res.json();
    const live = data.lives?.[0];
    if (!live) return new Response(JSON.stringify({ error: '无天气数据' }), { status: 404 });

    return new Response(JSON.stringify({
      weather: live.weather,
      temperature: live.temperature,
      winddirection: live.winddirection,
      windpower: live.windpower,
      humidity: live.humidity,
      reporttime: live.reporttime,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });
});
```

### Secrets 配置

```bash
supabase secrets set AMAP_API_KEY=<your_web_service_key>
```

> 注意：需使用**高德 Web 服务 API Key**（非 JS API Key），在高德开放平台控制台新建应用时选择「Web服务」类型。

## 验收标准

- [ ] `POST /functions/v1/amap-search { action:"places", city:"北京", keyword:"历史景点" }` 返回 POI 列表
- [ ] `POST /functions/v1/amap-search { action:"weather", city:"成都" }` 返回天气信息
- [ ] API Key 通过 secrets 注入不暴露
- [ ] 高德接口报错时返回 500 + 错误信息

---

## CHI-29 amapFallbackService — 槽位缺失触发 + 实体归一化 + 字段级合并策略

- URL: https://linear.app/chinaview/issue/CHI-29/amapfallbackservice-槽位缺失触发-实体归一化-字段级合并策略
- Milestone: 未分配
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

原设计：`attractions < 3` → 触发 fallback，然后直接合并。存在三个问题：

1. **触发条件粗**：数量不足 ≠ 上下文不足
2. **没有实体归一化**：RAG 的"莫高窟"和高德的"莫高窟景区"会被当成两个地点
3. **合并策略不明确**：字段冲突时谁赢没有规则，prompt 注入后 LLM 自己"脑补"

## 触发条件：从数量改为槽位覆盖信号

```ts
// 依赖 CHI-26 的 SlottedRagContext.slot_coverage
function shouldFallback(ctx: SlottedRagContext): { needed: boolean; slots: string[] } {
  const unsatisfied = ragService.getUnsatisfiedSlots(ctx);
  // 只有 core_attractions / food 未满足时才触发高德搜索
  // transport / climate 未满足时记录 warning，不触发（高德不擅长这类内容）
  const amapRelevantSlots = unsatisfied.filter(s =>
    s === 'core_attractions' || s === 'food'
  );
  return { needed: amapRelevantSlots.length > 0, slots: amapRelevantSlots };
}
```

## 实体归一化

**目标**：防止 RAG + 高德返回同一地点的两个版本被 LLM 当成两个地点。

```ts
function normalizeEntities(ragItems: RagItem[], amapItems: RagItem[]): RagItem[] {
  const result = [...ragItems];

  for (const amapItem of amapItems) {
    const isDuplicate = ragItems.some(r =>
      // 1. 名称模糊匹配（包含关系 or 编辑距离 ≤ 2）
      isSimilarName(r.name, amapItem.name) ||
      // 2. 坐标接近（< 200m）
      (r.metadata?.lat && amapItem.metadata?.lat &&
        haversineDistance(r.metadata, amapItem.metadata) < 0.2)
    );

    if (!isDuplicate) result.push(amapItem);
  }

  return result;
}
```

## 字段级合并策略

| 字段 | 规则 |
| -- | -- |
| `name` | RAG 优先（更整洁），高德仅补充 |
| `description` | RAG 优先，高德为空时用高德 |
| `confidence` | 取较高值，但高德来源标记最高 0.75（防止高德数据过度置信） |
| `metadata.lat/lng` | 高德优先（坐标更精确） |
| `metadata.booking_required` | 任一标记为 true 则为 true |
| `metadata.ticket_price` | RAG 优先（更新时间通常更可控） |
| `source` | `'rag+amap'`（表示已合并） |

## 高德搜索范围限制

防止高德因 `radius` 扩散或商业偏见引入噪声：

```ts
// 搜索时明确限制行政区
callAmapSearch({
  action: 'places',
  city: intent.destination,          // 精确到市级，不扩散到周边
  keyword: `${intent.destination} 景点`,
  types: '风景名胜|文化场馆',
  limit: 10,
  // sortrule: 'weight'（综合排序而非距离），防止过度头部化
})
```

对高德返回的餐厅做 sanity check：过滤掉 `type` 包含"快餐""连锁""外卖"的条目，避免把平台热度高但不具代表性的结果注入规划。

## 完整 fallback 路径

```
ragService.retrieveBySlots(intent)
    │
    ├─ 所有槽位满足 → 直接返回 SlottedRagContext
    │
    └─ core_attractions 或 food 未满足 ↓
          │
          ├─ callAmapSearch(places, attractions)
          ├─ callAmapSearch(places, restaurants)
          │
          ├─ normalizeEntities(ragItems, amapItems)  ← 实体归一化
          ├─ applyMergePolicy(ragItem, amapItem)     ← 字段级合并
          │
          └─ 更新 slot_coverage，标记 source='rag+amap'
```

## 失败路径

| 情形 | 处理 |
| -- | -- |
| 高德也无结果 | 保留 RAG 原结果，在 `slot_coverage` 标记 `satisfied: false`，交给 [CHI-31](https://linear.app/chinaview/issue/CHI-31/itineraryvalidator-可执行性校验层日程过载-通勤-时段-预约) validator 决定是否降级 |
| 高德返回全是连锁/外卖 | sanity check 过滤后同上 |
| 高德接口超时（>3s） | 直接跳过 fallback，记录 console.warn |
| 返回范围扩散（非目的地城市） | 过滤 `pname`/`cityname` 不匹配的 POI |

## 验收标准

- [ ] "敦煌"触发 fallback，slot_coverage.core_attractions.satisfied 变为 true
- [ ] "北京"（已有 RAG 数据）不触发高德请求
- [ ] 归一化后"莫高窟"和"莫高窟景区"不同时出现在结果中
- [ ] 高德连锁餐厅（麦当劳/肯德基）被过滤
- [ ] 高德超时时规划流程不中断

---

## CHI-30 TripPlannerService — 结构化行程草案生成（Planner 层）

- URL: https://linear.app/chinaview/issue/CHI-30/tripplannerservice-结构化行程草案生成planner-层
- Milestone: M4: Gemini 上下文注入
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

依赖：CHI-26（SlottedRagContext）、CHI-29（fallback 合并后数据）

当前链路：检索 → 直接扔给 Gemini 生成自然语言。

问题：Gemini 在没有结构约束时会自己决定哪天去哪里，容易把远距离景点排同一天、把莫高窟这类重点景点挤到傍晚。

本 issue 在检索和自然语言生成之间插入一个 **Planner 层**：先让 Gemini 用 JSON 模式输出结构化草案，再由 CHI-31 Validator 校验，最后才输出可读行程。

## 输出结构

```ts
export interface DayPlan {
  day: number;
  area: string;                  // 当天活动区域，如"敦煌市区"/"西线远郊"
  theme: string;                 // 当天主题，如"沙漠日落+鸣沙山"
  attractions: Array<{
    name: string;
    visit_time: string;          // 建议游览时段，如"09:00-12:00"
    duration_hours: number;
    booking_required: boolean;
    confidence: number;          // 来自 RagItem.confidence
    source: 'rag' | 'amap' | 'rag+amap' | 'llm';  // llm=模型自己补的
  }>;
  restaurants: Array<{
    name: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner';
    confidence: number;
    source: string;
  }>;
  transport_note: string;        // 当天交通说明
  constraints: string[];         // 当天注意事项，如"莫高窟须提前网络预约"
}

export interface StructuredItinerary {
  destination: string;
  duration_days: number;
  days: DayPlan[];
  unknowns: string[];            // 模型认为信息不足、无法确定的事项
  evidence_summary: {            // 本次规划的数据来源概览
    rag_items: number;
    amap_items: number;
    llm_generated: number;
  };
}
```

## 实现

```ts
// src/services/tripPlannerService.ts
export const tripPlannerService = {
  async generateStructuredDraft(
    intent: PlanningIntent,
    context: SlottedRagContext
  ): Promise<StructuredItinerary> {

    const plannerPrompt = buildPlannerPrompt(intent, context);

    // 使用 Gemini JSON 模式，只生成结构，不写自然语言
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: plannerPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: STRUCTURED_ITINERARY_SCHEMA,  // JSON Schema 约束
      },
    });

    return JSON.parse(result.response.text());
  }
};
```

## Planner Prompt 设计原则

```
你是一个行程规划引擎，只输出 JSON，不输出自然语言。

规则：
1. 每天景点不超过 3 个（relaxed: 2, balanced: 3, packed: 4）
2. 同一天的景点必须在地理上相邻（同一区域优先）
3. 远郊景点（如玉门关、雅丹）单独一天，不与市区景点混排
4. 莫高窟等有预约约束的景点，constraints 字段必须注明
5. 鸣沙山等最佳时段为傍晚的景点，visit_time 设为 16:00-20:00
6. 对信息不足的决策，放入 unknowns 而不是自己补全
7. 模型自行补充的地点 source 标记为 "llm"

已知信息（来自知识库，按置信度标注）：
{context_block}
```

## 地理分组策略（辅助 Gemini）

在构建 prompt 前，对 `core_attractions` 按坐标做简单聚类（K-means k=duration_days），生成区域划分建议注入 prompt，让 Gemini 更容易按区域分天。

## 验收标准

- [ ] 输出严格符合 `StructuredItinerary` JSON Schema（Gemini JSON 模式保证）
- [ ] `source: 'llm'` 的条目在最终输出中有特殊标注（如"（AI 推测）"）
- [ ] 敦煌 5 天：玉门关/雅丹不与鸣沙山同一天
- [ ] 莫高窟的 `booking_required: true` 和 `constraints` 注明
- [ ] `unknowns` 字段非空时，CHI-27 生成层会显式告知用户

---

## CHI-31 ItineraryValidator — 可执行性校验层（日程过载 / 通勤 / 时段 / 预约）

- URL: https://linear.app/chinaview/issue/CHI-31/itineraryvalidator-可执行性校验层日程过载-通勤-时段-预约
- Milestone: M4: Gemini 上下文注入
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

依赖：CHI-30（StructuredItinerary）

Planner 层产出结构化草案后，草案仍可能包含：

* 单天 4+ 个景点（体力过载）
* 市区景点和远郊景点同一天（通勤 3 小时+）
* 鸣沙山排在早上（最佳时段是傍晚）
* 莫高窟没有标注预约提示

Validator 在生成自然语言前对草案做规则校验，输出修正建议或直接修正。

## 校验规则集

```ts
const VALIDATORS: Validator[] = [

  // V1: 单日景点数量
  {
    id: 'daily_overload',
    check: (day, intent) =>
      day.attractions.length > MAX_ATTRACTIONS_PER_DAY[intent.travel_style],
    fix: (day, intent) => {
      // 将多出的景点移到相邻天或推入 unknowns
      const max = MAX_ATTRACTIONS_PER_DAY[intent.travel_style];
      const overflow = day.attractions.splice(max);
      return { day, warnings: [`第 ${day.day} 天景点过多，已移出 ${overflow.map(a=>a.name).join('、')}`] };
    },
  },

  // V2: 地理距离（远郊与市区混排）
  {
    id: 'geographic_conflict',
    check: (day) => {
      const coords = day.attractions
        .filter(a => a.metadata?.lat)
        .map(a => ({ lat: a.metadata.lat, lng: a.metadata.lng }));
      return maxPairwiseDistance(coords) > 80; // km
    },
    fix: (day) => ({
      day,
      warnings: [`第 ${day.day} 天含远距离景点，建议分拆至不同天`],
    }),
  },

  // V3: 时段逻辑
  {
    id: 'time_of_day',
    check: (day) => day.attractions.some(a =>
      EVENING_ONLY_ATTRACTIONS.includes(a.name) &&
      parseInt(a.visit_time) < 14
    ),
    fix: (day) => {
      day.attractions = day.attractions.map(a =>
        EVENING_ONLY_ATTRACTIONS.includes(a.name)
          ? { ...a, visit_time: '16:00-20:00' }
          : a
      );
      return { day, warnings: [`鸣沙山等景点已调整至傍晚时段`] };
    },
  },

  // V4: 预约约束显式标注
  {
    id: 'booking_constraint',
    check: (day) => day.attractions.some(a =>
      a.booking_required && !day.constraints.some(c => c.includes(a.name))
    ),
    fix: (day) => {
      day.attractions
        .filter(a => a.booking_required)
        .forEach(a => {
          if (!day.constraints.some(c => c.includes(a.name))) {
            day.constraints.push(`${a.name}需提前网络预约，建议出发前 3-7 天购票`);
          }
        });
      return { day, warnings: [] };
    },
  },

  // V5: 餐厅与当天区域匹配
  {
    id: 'restaurant_area_mismatch',
    check: (day) =>
      day.restaurants.some(r =>
        r.metadata?.lat &&
        day.attractions.some(a => a.metadata?.lat) &&
        minDistanceToAttractions(r, day.attractions) > 15 // km
      ),
    fix: (day) => ({
      day,
      warnings: [`第 ${day.day} 天部分餐厅距景点较远，建议就近用餐`],
    }),
  },
];
```

## 接口

```ts
export interface ValidationResult {
  itinerary: StructuredItinerary;  // 可能已被修正
  warnings: string[];              // 所有 warning 汇总，供生成层注入 prompt
  can_generate: boolean;           // false = 信息严重不足，需降级
}

export const itineraryValidator = {
  validate(draft: StructuredItinerary, intent: PlanningIntent): ValidationResult
};
```

## 降级条件

`can_generate = false` 当：

* `core_attractions` 全部为 `source: 'llm'`（无任何外部数据支撑）
* 超过 50% 的天数存在 `geographic_conflict` 且无法分拆

此时 CHI-27 生成层收到 `can_generate: false`，改为输出：

> "当前对 \[目的地\] 的了解有限，以下是初步建议，请以实地情况为准……"

## 验收标准

- [ ] 敦煌 5 天草案：V2 检测到玉门关与市区混排并输出 warning
- [ ] 莫高窟：V4 自动在 constraints 补充预约说明
- [ ] 鸣沙山排早上时：V3 自动修正为傍晚
- [ ] `can_generate: false` 时生成层输出降级文案而非正常行程
- [ ] 所有 warnings 出现在最终回复末尾的"注意事项"区块中

---

## CHI-32 规划质量指标体系 + 评测基线（离线/线上）

- URL: https://linear.app/chinaview/issue/CHI-32/规划质量指标体系-评测基线离线线上
- Milestone: M4: Gemini 上下文注入
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

当前项目的验收标准以“功能可用”为主，缺少可量化的规划质量目标，难以判断优化是否真正生效。

## 目标

建立统一质量指标与评测闭环，作为迭代与发布门禁。

## 范围

1. 定义核心指标（至少）

* 规划可执行率（itinerary_executable_rate）
* 幻觉占比（llm_generated_ratio）
* 关键约束命中率（booking/time_of_day/geographic）
* 用户采纳率（plan_acceptance_rate，若有埋点）
* 降级率（can_generate_false_rate）

2. 建立评测集

* 构建 20+ 标准化意图样本（北京/敦煌等）
* 覆盖晴天、雨天应急、信息缺失、fallback 触发等场景

3. 评测执行与报告

* 提供自动评测脚本（输出 JSON + Markdown scorecard）
* 每次变更可对比基线（baseline vs current）

4. 发布门禁

* 为关键指标设置最小阈值与回归容忍区间
* 超阈值回退到降级路径或阻断发布

## 验收标准

- [ ] 指标定义文档完成并评审通过
- [ ] 评测样本集 >= 20，覆盖核心场景
- [ ] 可一键生成评测报告并输出对比结果
- [ ] 发布门禁阈值落地并在 CI/发布流程中生效

---

## CHI-33 跨服务数据契约版本化 + Schema 一致性校验

- URL: https://linear.app/chinaview/issue/CHI-33/跨服务数据契约版本化-schema-一致性校验
- Milestone: M3: 检索服务
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

PlanningIntent / SlottedRagContext / StructuredItinerary / ValidationResult 在多服务间流转，当前缺少版本化与一致性约束，字段漂移风险高。

## 目标

建立可演进的数据契约，避免实现阶段“边写边补字段”。

## 范围

1. 契约统一

* 统一 source 枚举：`rag | amap | rag+amap | llm`
* 明确 metadata 结构（lat/lng/booking_required/ticket_price 等）
* 统一 confidence 语义与取值范围（0-1）

2. 版本化

* 所有核心结构增加 `contract_version`
* 定义向后兼容规则与 deprecate 流程

3. 校验机制

* 引入运行时 schema 校验（zod/json schema）
* 在关键入口做 fail-fast + 可观测错误码

4. 工程保障

* 增加契约测试（consumer/provider）
* 新增字段必须补充 schema、示例与迁移说明

## 验收标准

- [ ] 4 个核心结构有统一 schema 与版本号
- [ ] source/metadata/confidence 定义一致且落地
- [ ] 关键链路入口均有 runtime 校验
- [ ] 契约测试可阻断不兼容变更

---

## CHI-34 端到端回归测试与黄金样例（含天气应急）

- URL: https://linear.app/chinaview/issue/CHI-34/端到端回归测试与黄金样例含天气应急
- Milestone: M4: Gemini 上下文注入
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

目前缺少稳定的端到端回归机制，难以及时发现“规划正确性”回退。

## 目标

构建可持续运行的 E2E 回归套件，覆盖主流程与关键分支。

## 范围

1. 黄金样例集

* 目的地：至少北京/敦煌
* 场景：正常规划、fallback 触发、unknowns 非空、`can_generate=false`、用户“今天下雨了”应急

2. 回归断言

* 结构化层断言优先（day/area/constraints/source/confidence）
* 行为断言：雨天仅调整当天，其余天保持稳定
* 约束断言：预约提示、时段修正、地理冲突告警

3. 测试执行

* 提供可重复运行的测试入口（本地 + CI）
* 输出失败样例差异报告

## 验收标准

- [ ] E2E 用例 >= 10，覆盖核心分支
- [ ] 雨天应急只影响当天的断言可稳定通过
- [ ] fallback/validator/降级路径均有自动回归
- [ ] CI 中纳入并可阻断关键回归

---

## CHI-35 可观测性与成本治理（SLO/预算/告警）

- URL: https://linear.app/chinaview/issue/CHI-35/可观测性与成本治理slo预算告警
- Milestone: M3: 检索服务
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

链路升级后包含多跳调用（embedding、检索、fallback、planner、validator、生成），但缺少统一 SLO 与成本约束。

## 目标

建立“质量-性能-成本”三位一体的运行治理能力。

## 范围

1. 统一追踪

* 全链路 request_id 贯穿日志
* stage 级耗时埋点：retrieve/fallback/planner/validator/generate

2. 指标与 SLO

* P50/P95 延迟、错误率、超时率
* fallback 触发率、slot 满足率、llm_generated_ratio、can_generate_false_rate
* 外部 API 成功率（Gemini/AMap/Supabase）

3. 成本预算

* token 预算（单请求/日）
* 外部 API 调用预算与上限策略
* 超预算降级策略（缩短上下文/跳过非关键步骤）

4. 告警与看板

* 关键指标阈值告警
* 可视化面板用于发布后观测

## 验收标准

- [ ] 全链路 request_id 可追踪
- [ ] 核心 SLO 指标可观测并有阈值
- [ ] 成本预算与超限降级策略落地
- [ ] 关键告警已配置并可验证触发

---

## CHI-36 Prompt 安全与外部数据清洗（防注入与可信度隔离）

- URL: https://linear.app/chinaview/issue/CHI-36/prompt-安全与外部数据清洗防注入与可信度隔离
- Milestone: M4: Gemini 上下文注入
- Status: Backlog
- Priority: High

### Description（原文）

## 背景

外部 POI 文本和用户输入直接进入 prompt，存在 prompt injection、脏数据污染、错误权威度放大的风险。

## 目标

建立输入清洗与提示词隔离策略，降低安全与质量风险。

## 范围

1. 输入清洗

* 对 AMap 返回字段做白名单提取与长度限制
* 清理可疑指令片段（如“忽略以上规则”类文本）
* 统一编码与特殊字符处理

2. 权威度隔离

* 明确不同来源信任等级（rag > rag+amap > amap > llm）
* 在 prompt 中分区注入，禁止外部文本覆盖系统规则

3. 安全策略

* 建立“不可被覆盖”的系统约束模板
* 对高风险输入触发降级或二次确认

4. 攻防测试

* 构建注入样例集（用户输入/POI描述）
* 加入回归测试，确保关键规则不被绕过

## 验收标准

- [ ] 外部数据进入 prompt 前完成白名单清洗
- [ ] 高风险注入样例无法改变系统核心规则
- [ ] 来源信任等级在输出层可追踪
- [ ] 注入回归测试纳入 CI
