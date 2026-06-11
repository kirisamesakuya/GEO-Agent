# geo-audit

GEO 全站/全景审计（中国环境）：五平台可见性、页面技术、内容可引用、技术资产建议。

融合国内全景诊断与 on-page 结构审计思路；输出必须兼容 GEO-Agent 报告历史。

## When to Use

- GEO-Agent taskType `geo_audit`（深度分析）
- 模块通过 `modules[]` 控制，默认全模块

## Inputs

- `brandUrl` (required)
- `brandName`, `brandCity`, `productNames`, `brandDesc`, `industry`, `competitors`
- `platforms` — 五平台默认
- `pageUrls` — 补充页面 ≤50
- `modules` — `audit`, `technical`, `crawlers`, `schema`, `llmstxt`, `content`
- `region`, `language`, `geoMarket` — CN 默认

## Workflow

Before execution, read the pack reference `product-grade-delivery-standard.md` (source: `../../shared/`; installed pack: `../_shared/`). This Skill is successful only when it creates a customer-understandable baseline and an executable plan, not when it merely returns scores.

### 1. 全景基线（audit）

- 五平台 AI 答案可见性矩阵（无证据则 partial）
- 竞品差距与机会地图 P0/P1
- `data.opportunityMap[]`, `data.sourceLedger[]`（见 yao-evidence-ledger）

### 2. 官网技术（technical）

- 抓取/索引/HTTPS/移动端；AI 可抽取性
- 对齐 technical-seo 检查项

### 3. AI 爬虫（crawlers）

- GPTBot、Bytespider、Google-Extended 等 robots 矩阵
- `artifacts` type `robots_patch` 如有需要

### 4. Schema / llms.txt（schema, llmstxt）

- JSON-LD 草稿、`llms_txt` 草稿 artifact

### 5. 内容（content）

- CORE-EEAT 快扫 + 可引用段落缺口
- `metrics.coreEeatQuickScore`

### 6. 汇总

- `audit.totalScore` 0–100（分项加权，注明 estimated 项）
- `findings` 按 category: visibility | technical | content | schema | crawlers
- `actionPlan` P0/P1/P2
- `artifacts`: `GEO-AUDIT.md` + 可选 `html` 摘要

### 7. 客户决策层

- 生成一页管理层摘要：一句话结论、三项关键发现、三项优先动作、证据覆盖率。
- 输出品牌与主要竞品的 Prompt × 平台可见性矩阵；失败采样不得记为未命中。
- 每项发现必须含 `evidenceLevel`、证据引用、业务影响、Owner、工作量、验收口径。
- 输出 30/60/90 天路线图，并给出发布前 T0 基线与 T+7/14/30 复测计划。
- 数据不足时降低置信度，不得用模型估算值包装为实测结论。

## Done When

- 12 个诊断域均有结果或明确标记 `not_evaluated`。
- 客户报告、证据台账、机会地图、行动路线和效果验证计划齐全。
- 证据覆盖率 >= 80% 才可 `qualityGate.verdict=SHIP`；关键事实冲突或虚假引用必须 `BLOCK`。

## modules 单选时

若 `modules` 仅一项且非 `audit`，聚焦该模块但仍返回完整 geoWebOutput.v1 六字段。

## Final Response Rule

Single JSON object only.
