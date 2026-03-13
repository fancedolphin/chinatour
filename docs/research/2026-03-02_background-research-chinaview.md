# ChinaView 背景研究：面向中国旅游场景的 RAG 增强行程规划系统

## 1 引言
在生成式 AI 快速进入旅游应用语境的当下，“会生成”已不再构成系统竞争力的充分条件。旅行规划并非单纯的文本组织任务，而是一个同时受时间窗口、空间可达性、预算限制、营业时段与个体偏好约束的复杂决策过程。对于中国旅游场景而言，这一复杂性更为突出：用户的真实规划路径往往跨越多个信息系统，在评论平台获取目的地印象，在社交内容平台寻找“在地经验”，再在地图服务中核验地理位置与开放状态，最终以高认知负担手工拼装为可执行行程。

这一结构性摩擦具有明确的产业背景。官方统计显示，2024 年中国国内旅游出游人次达到 56.15 亿，国内游客总花费超过 5.75 万亿元人民币；入境旅游亦显著恢复，全年入境游客约 1.32 亿人次 [S1][S2]。在如此规模的市场中，能够降低信息切换成本、提升计划可执行性的系统，不是“体验优化”，而是具有实际经济与社会价值的基础设施问题。

基于上述语境，ChinaView 的研究问题不在于“如何让模型生成更流畅的攻略文本”，而在于“如何使系统在中国本地知识语境中生成可验证、可执行、可解释的多日行程”。据项目规格与仓库证据，该项目提出并部分实现了一个由检索增强、空间核验与行程生命周期管理构成的架构路径：以 RAG 提供本地知识支撑，以地图/POI 数据承担执行层核验，再通过保存、编辑与分享机制实现从生成到执行的闭环 [P1][P2][P3][P6]。本文据此展开系统化背景研究，讨论其学术合理性、产业位置与责任边界。

## 2 研究方法与证据策略
本文采用系统综述与市场调研结合的证据框架，并以 PRISMA 2020 所强调的透明性原则组织检索与筛选逻辑 [T1]。研究围绕四个问题展开：其一，LLM-only 为何在旅游规划任务中存在结构性不足；其二，混合检索与重排机制是否构成更稳健技术路径；其三，主流市场方案在“本地知识深度—可执行性—可解释性”维度上的边界何在；其四，项目在法律、社会、伦理与职业责任上应满足何种约束。

证据来源由五类构成。第一类是学术文献与基准，覆盖 RAG、检索与重排、旅游规划任务评测、公平性研究。第二类是官方技术文档，包括 Elasticsearch 检索体系、Google Places 与 Supabase RLS。第三类是官方市场资料，主要来自 Tripadvisor、Google、Trip.com 与 Booking 的产品发布文本。第四类是治理与标准文本，涵盖 GDPR/ICO、PIPL、EU AI Act、WCAG、ACM/BCS 与 OWASP。第五类是项目内部证据，用于校准“架构宣称”与“当前实现状态”之间的边界 [P2][P3][P4][P5][P6]。

本研究在方法上并不追求“罗列尽可能多的来源”，而是强调三重对齐：技术主张需与文献证据对齐，产业判断需与产品事实对齐，治理建议需与可执行工程控制对齐。换言之，背景研究的目标是形成可被后续设计、实现与评估直接继承的论证链条。

## 3 文献综述：从文本生成到约束感知规划
### 3.1 旅游规划任务的范式转移
早期旅游推荐系统主要处理“信息过载”问题，输出形式常为景点、酒店或餐饮的排序列表。然而，近期研究显示，旅游场景的核心难点正在从单点推荐转向多约束行程构建。TravelPlanner 基准明确指出，真实旅行规划需要工具访问、约束满足与多步骤协同，在该任务设定下，通用大模型并不天然具备稳定表现 [T6]。随后 TripTailor、TripCraft 与 TP-RAG 延展了这一范式，进一步将“路线效率、时空一致性、POI 合理性与个性化贴合度”纳入关键评测维度 [T7][T8][T9]。

这一转移对本项目具有直接方法论含义：如果系统仅以语言流畅性衡量质量，它可能输出“叙事上令人信服”的计划，却无法保证“执行上可落地”。因此，旅游规划研究的评价重心应当从“文本质量”转向“决策质量”。

### 3.2 LLM-only 路径的能力与边界
LLM-only 路径的优势在于自然交互与高可读性输出，但其结构性不足同样明确。首先，参数记忆并不等于现实世界状态，尤其在营业时段、临时关闭、价格波动等动态信息上缺乏稳定可靠的外部锚点。其次，在多约束联动下，模型容易出现局部合理、全局失配的问题，例如地点安排看似精彩却忽略跨区移动成本。再次，系统难以给出足够强的来源可追溯性，导致用户难以评估建议的可信度 [T6][T9]。

因此，LLM-only 在本研究中应被视为必要比较基线，而非可直接部署的最终方案。这一立场并非否认模型价值，而是强调模型价值必须被约束感知机制与外部证据机制所补全。

### 3.3 RAG 与混合检索在旅游场景中的适配性
RAG 的核心贡献在于将生成过程与可更新外部知识绑定，从而改善可验证性与可控性 [T2]。在旅游场景中，这意味着系统不再只“回忆”目的地，而能“检索”目的地。项目规格提出的检索链路——KNN 向量召回、关键词门控、BM25 重排、cross-encoder 精排与 ACL 过滤——在理论与工程上均可得到支持 [P1]。

从 IR 文献看，DPR 为语义召回提供了强基线 [T3]；BM25 在词法精确匹配上仍具韧性 [T4]；cross-encoder 重排能在候选集后处理阶段显著提升 top-k 精度 [T5]。Elastic 官方文档也明确支持混合检索与语义重排的工业实践路径 [T10][T11][T12]。对旅游查询这种“软意图 + 硬约束”混合输入而言，单一检索机制通常难以兼顾召回广度与业务可控性，因此分层检索与重排具备合理性。

需要强调的是，该路径并非无代价。检索层级越多，计算成本与延迟风险越高。若缺乏候选规模控制、缓存与降级策略，系统可能在“准确性提升”与“交互响应”之间失衡。也就是说，RAG 架构是否优于 LLM-only，不仅取决于理论正确性，还取决于工程执行质量。

### 3.4 地图 enrichment 的方法论地位：执行层而非视觉层
在多数产品叙事中，地图容易被误读为展示组件。本文认为，地图在旅游规划系统中应被界定为执行层。Google Places 文档支持地点详情、营业时段、照片、评论摘要等结构化字段，这使“文本建议”能够映射为“可核验地点单元” [T13]。结合路径与空间关系信息，系统可进一步判断行程的地理可达性与时段可执行性。

Otaki 等人的交互式地图研究进一步说明，地图不仅服务可视化，还可作为人机协商接口：用户通过空间化编辑直接约束系统计划，系统再基于反馈迭代推荐 [T14]。据此，本项目将地图接入与本地知识检索并置，具有明确理论依据：前者负责现实核验与执行承载，后者负责语义深度与在地知识密度。

## 4 市场与产业分析：能力层分工与竞争空缺
### 4.1 现实市场的能力层分工
当前旅游信息生态可概括为四类能力层：评论/攻略层、地图事实层、交易履约层与社交启发层。Tripadvisor 类型平台在口碑聚合与内容覆盖方面成熟；Google Maps/Places 在地点事实与空间操作方面突出；Trip.com 与 Booking 等 OTA 在库存联动与交易闭环方面具备优势；中文 UGC 生态则提供高密度在地经验与情境叙事 [M1][M2][M3][M4][M5]。

问题在于，这些能力层并未天然整合。用户实际仍需在多系统间迁移语境并承担信息对齐成本。该摩擦构成 ChinaView 的市场入口：不是与任一单平台在其最强能力上正面竞争，而是尝试构建跨层整合能力。

### 4.2 主要竞品的批判性观察
Tripadvisor 已部署 AI 规划功能，说明“AI 旅行规划”已进入主流产品路线 [M1]。其优势是规模化评论资产与成熟内容生态；其边界在于，面向中国语境的细粒度本地知识并非其天然强项，且多约束行程执行的一体化支持仍有限。

Google 生态在地点事实与地图执行方面几乎构成行业基准 [M2][T13]。但若脱离深度本地知识与约束协同机制，其更接近强大的“地点检索与导航系统”，而非完整“旅行规划推理系统”。

Trip.com 路线显示了另一种强路径：把 AI 推荐与库存、预订、行程管理深度耦合，强调从建议到交易的闭环效率 [M3][M4]。其潜在边界在于推荐逻辑可能受商业闭环牵引，不必然以“本地知识多样性”作为首要优化目标。

Booking 的 AI 功能延展同样强化了国际化交易场景的效率 [M5]，但在中国本地文化语境与细粒度社交经验整合上并非其核心优势域。

综上，现有平台并非“弱”，而是“各自强于不同层”。ChinaView 的可行差异化不在于复制这些平台，而在于以 RAG+Map 的中间层能力，将“本地知识深度、空间可执行性与解释性”同时推进。

## 5 法律、社会、伦理与职业责任讨论
### 5.1 法律与合规责任
GDPR/UK GDPR 的数据最小化与“设计即隐私”原则对本项目高度相关，因为系统处理用户偏好、预算、时间与行为轨迹等数据 [L1][L2]。这意味着架构层面必须默认最小采集、最小留存与目的限定，并为用户提供数据控制能力。

由于项目面向中国旅游语境，PIPL 对自动化决策、透明性与必要性原则同样构成实质约束 [L3]。系统不应将“个性化”理解为不受边界的画像扩张，而应提供可理解、可拒绝、可降级的推荐机制。

EU AI Act 的风险导向治理进一步提示：即使旅游规划通常不属于最严格高风险分类，系统仍可能在偏见放大、错误引导与脆弱群体影响方面产生现实后果 [L4]。因此，风险台账、日志可审计性与人工兜底不是附加项，而是上线前提。

### 5.2 社会影响与公共价值
旅游推荐系统天然具有“注意力分配权”。若系统长期偏向热门地点，它不仅影响用户体验，也影响地方文化可见性与中小经营体曝光机会。对中国场景而言，这种偏置可能进一步放大“平台热榜即目的地真相”的认知误差。故而，多样性与代表性应被视为社会层面的质量指标，而非仅是推荐算法中的可选参数。

可达性也是核心社会议题。移动端、多语言、不同预算与不同行动能力用户并存，要求系统在信息结构、交互逻辑和替代方案上满足普适设计原则。WCAG 2.2 为此提供了可操作基线 [L5]。

### 5.3 伦理责任：公平、诚实与可追溯
伦理层面的关键不只是“不要错误”，而是“不要以确定口吻表达不确定信息”。旅行规划中的错误可能直接带来金钱损失、时间损失甚至安全风险，因此系统应明确表达置信度、时效性和证据来源，而非将生成语气误当事实保证。

公平性方面，推荐系统研究已指出曝光不均衡与群体差异影响是长期问题 [T16]。这要求项目在评估阶段引入 persona 分层、公平指标与偏差审计，避免“平均表现良好”掩盖特定群体体验受损。

### 5.4 职业责任与工程纪律
ACM 与 BCS 职业准则共同强调公共利益、能力边界与责任可追踪 [L6][L7]。在工程实现上，这对应为最小权限、访问控制验证、威胁建模与事件响应流程。OWASP 对访问控制失效的长期警示进一步说明，安全问题不应在产品后期“补做”，而应在架构期内化 [L8]。

据仓库证据，项目已在数据库层采取 RLS 路径，这是正确方向 [P2][L11]；但职业标准要求的不只是“有机制”，还包括“机制可持续验证”，例如策略测试、审计日志与异常处置闭环。

## 6 需求与风险的学术化归纳
在需求层面，ChinaView 需要同时满足四类核心能力：本地知识检索、可执行行程构建、可编辑交互体验与分享反馈回流。其非功能目标则集中于安全、解释性、性能韧性与评估可复现性。

在风险层面，最优先风险包括：信息过时与幻觉、第三方 API 不稳定、热门偏置与文化失衡、访问控制回归及评估外部效度不足。相应缓解策略应内生于设计：检索证据约束、时效标记、缓存与降级、RLS 测试、对照实验与局限披露。风险治理在这里不是“管理附件”，而是系统有效性的组成部分。

## 7 结论
本文从文献、市场与治理三条证据链论证了同一结论：在中国旅游语境下，LLM-only 方案难以持续满足“可信且可执行”的规划要求；RAG 增强并结合地图执行层，是更具理论与工程可行性的方向。与此同时，架构合理性并不自动等于产品有效性。项目下一阶段的关键不在继续强化叙事，而在通过严格对照实验将“设计优势”转化为“可测量优势”，并以法律、社会、伦理与职业责任为边界完成可部署化。

从这个意义上说，ChinaView 的价值不应被理解为“又一个 AI 旅行助手”，而应被理解为一次关于“如何在本地知识语境中构建可解释、可执行、可治理的生成式规划系统”的实践性研究。

---

## References

### Project evidence
- [P1] COMP5200M 项目规格：`LI26-Spec.docx`。
- [P2] 数据库与RLS迁移：`supabase/migrations/002_create_core_tables.sql`，`supabase/migrations/003_create_rag_tables.sql`。
- [P3] 服务层实现：`src/services/tripService.ts`，`src/services/itineraryService.ts`。
- [P4] AI 聊天页面（含模拟响应）：`src/components/AIPlannerChatPage.tsx`。
- [P5] 发现页（含 mock feed）：`src/components/DestinationExplorePage.tsx`。
- [P6] 地图POI服务实现：`src/services/amapService.ts`。

### China market context
- [S1] China sees domestic travel surge in 2024 (Gov.cn archive, 2025-01-22): https://english.www.gov.cn/archive/statistics/202501/22/content_WS6790867bc6d0868f4e8ef0f0.html
- [S2] China inbound tourism continues heating up (Gov.cn archive, 2025-05-19): https://english.www.gov.cn/archive/statistics/202505/19/content_WS682ae46ec6d0868f4e8f2aa6.html

### Research and technical literature
- [T1] Page MJ, et al. PRISMA 2020 statement. BMJ (2021): https://www.bmj.com/content/372/bmj.n71
- [T2] Lewis P, et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (2020): https://arxiv.org/abs/2005.11401
- [T3] Karpukhin V, et al. Dense Passage Retrieval (EMNLP 2020): https://aclanthology.org/2020.emnlp-main.550/
- [T4] Robertson S, Zaragoza H. BM25 and Beyond (2009): https://www.nowpublishers.com/article/Details/INR-019
- [T5] Nogueira R, Cho K. Passage Re-ranking with BERT (2019): https://arxiv.org/abs/1901.04085
- [T6] Xie J, et al. TravelPlanner (ICML 2024): https://arxiv.org/abs/2402.01622
- [T7] Zhou Y, et al. TripTailor (Findings ACL 2025): https://aclanthology.org/2025.findings-acl.503/
- [T8] Dai L, et al. TripCraft (ACL 2025): https://aclanthology.org/2025.acl-long.834/
- [T9] Han Y, et al. TP-RAG (EMNLP 2025): https://aclanthology.org/2025.emnlp-main.626/
- [T10] Elasticsearch kNN search docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html
- [T11] Elasticsearch hybrid search: https://www.elastic.co/elasticsearch/hybrid-search
- [T12] Elasticsearch semantic reranking docs: https://www.elastic.co/docs/solutions/search/ranking/semantic-reranking
- [T13] Google Places Place Details docs: https://developers.google.com/maps/documentation/places/web-service/details
- [T14] Otaki T, Baba Y. Interactive map-based itinerary recommendation (2025): https://doi.org/10.1016/j.eswa.2024.126294
- [T15] Scientific Reports (2025), social media and itinerary planning behavior: https://www.nature.com/articles/s41598-025-28555-9
- [T16] Bias and Fairness in Recommender Systems survey (2023): https://arxiv.org/abs/2306.00757

### Market and product evidence
- [M1] Tripadvisor AI-powered travel planning product (2023): https://tripadvisor.mediaroom.com/Tripadvisor-launches-AI-powered-travel-planning-product
- [M2] Google Search AI Mode Canvas travel planning (2026): https://blog.google/products-and-platforms/products/search/tips-prompts-ai-mode-canvas-travel-planning/
- [M3] Trip.com TripGenie (2023): https://www.trip.com/newsroom/introducing-tripgenie-groundbreaking-ai-travel-assistant/
- [M4] Trip.com Trip.Planner (2025): https://www.trip.com/newsroom/trip-com-launches-trip-planner-smart-itineraries-tailored-to-your-travel-style-with-real-time-recommendations/
- [M5] Booking.com AI Trip Planner expansion (2024): https://news.booking.com/bookingcom-enhances-travel-planning-with-new-ai-powered-features--for-easier-smarter-decisions/

### Legal, standards, and professional guidance
- [L1] GDPR data minimisation (EU Commission): https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/how-much-data-can-be-collected_en
- [L2] ICO: data protection by design/default: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-by-default/
- [L3] PIPL English text: https://en.spp.gov.cn/2021-12/29/c_948419.htm
- [L4] EU AI Act official status: https://commission.europa.eu/news/ai-act-enters-force-2024-08-01_en
- [L5] W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- [L6] ACM Code of Ethics: https://www.acm.org/diversity-inclusion/code-of-ethics
- [L7] BCS Code of Conduct: https://www.bcs.org/membership-and-registrations/become-a-member/bcs-code-of-conduct/
- [L8] OWASP Top 10: https://owasp.org/www-project-top-ten/
- [L9] NIST AI RMF 1.0: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10
- [L10] UN Tourism Global Code of Ethics: https://www.unwto.org/global-code-of-ethics-for-tourism
- [L11] Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- [L12] Gemini API docs: https://ai.google.dev/api
- [L13] Amap Web Service API docs: https://lbs.amap.com/api/webservice/guide/api/search
