# GEO Skill 入参与 GEO-Agent 严格对照

> 本机技能路径：`C:\Users\win11\AppData\Local\hermes\skills\geo\`  
> 路由配置：[server/lib/agent-skill.ts](../server/lib/agent-skill.ts)  
> 归一化实现：[server/lib/hermes-geo-input.ts](../server/lib/hermes-geo-input.ts)

---

## 1. Skill 全量索引

| # | skill name | 类型 | GEO-Agent taskType | 已接入 |
|---|------------|------|-------------------|--------|
| 1 | `geo-quick-start` | 执行 | `geo_quick_start` | 是 |
| 2 | `geo-audit` | 执行 | `geo_audit` | 是 |
| 3 | `geo-schema` | 执行 | `geo_schema` | 是 |
| 4 | `geo-llmstxt` | 执行 | `geo_llmstxt` | 是 |
| 5 | `geo-citability` | 执行 | `geo_citability` | 是 |
| 6 | `geo-brand-mentions` | 执行 | `brand_extract` | 是（原误映射 `geo.brand.extract`） |
| 7 | `geo-technical` | 执行 | — | 否 |
| 8 | `geo-content` | 执行 | — | 否 |
| 9 | `geo-crawlers` | 执行 | — | 否 |
| 10 | `geo-platform-optimizer` | 执行 | — | 否 |
| 11 | `geo-report` | 汇总 | — | 否 |
| 12 | `geo-report-pdf` | 汇总 | `geo_report_pdf` | 部分 |
| 13 | `geo-compare` | 汇总 | `geo_compare` | 部分 |
| 14 | `geo-proposal` | 商务 | — | 否 |
| 15 | `geo-prospect` | 商务 | — | 否 |
| 16 | `geo-agent-integration` | 文档 | N/A | N/A |

---

## 2. Hermes 传参机制

```
前端 → POST /api/agent-tasks { input }
     → normalizeGeoSkillInput(taskType, input)   // 别名 + 标准字段
     → AgentTask.input (DB)
     → NousHermesExecutor.buildHermesRunPayload()
     → POST /v1/runs { input: "自然语言+JSON", metadata: { skill, input } }
     → Hermes 加载对应 SKILL.md 执行
```

**输出契约（GEO-Agent 统一要求）**

```json
{
  "audit": { "totalScore": 0, "scores": {}, "summary": "" },
  "data": {},
  "metrics": {},
  "findings": [],
  "actionPlan": [],
  "artifacts": []
}
```

---

## 3. 跨技能标准字段（GeoSkillInputBase）

以 `geo-quick-start` 表单（`templates/geo-form.html`）为基准：

| 标准字段 | 类型 | 说明 |
|---------|------|------|
| `brandName` | string | 品牌名称 |
| `brandUrl` | string | **唯一官网字段** |
| `brandCity` | string | 所在城市 |
| `productNames` | string \| string[] | 产品/服务 |
| `brandDesc` | string | 品牌介绍 |
| `platforms` | string[] | 默认 `["DeepSeek","豆包","Kimi"]` |
| `industry` | string | 行业 |
| `competitors` | string[] | 竞品 |
| `sourceMaterials` | array | 扩展材料（含社媒链接） |
| `pageUrls` | string[] | geo-audit 补充爬取页 |
| `modules` | string[] | geo-audit 子模块 |

### 别名兼容（读取时自动映射）

| 旧字段（GEO-Agent 历史） | 标准字段 |
|------------------------|---------|
| `city` / `targetMarket` | `brandCity` |
| `services` / `keywords` | `productNames` |
| `description` | `brandDesc` |
| `website` / `websiteUrl` | `brandUrl` |

写入 Hermes 时**只输出标准字段**，不再重复写 `website` / `websiteUrl`。

---

## 4. 各 Skill 入参 / 输出

### 4.1 `geo-quick-start`

**标准入参**

| 字段 | 必填 | 说明 |
|------|------|------|
| `brandName` | 是 | |
| `brandUrl` | 否 | 网站地址 |
| `brandCity` | 否 | |
| `productNames` | 否 | 多行或数组 |
| `brandDesc` | 否 | |
| `platforms` | 否 | DeepSeek/豆包/千问/Kimi |

**GEO-Agent 入口**：`GeoQuickStartView`、`onboarding confirm-brand`

**示例 payload**

```json
{
  "brandName": "汇智智能",
  "brandUrl": "https://www.example.com",
  "brandCity": "南京",
  "productNames": ["AI 培训", "GEO 咨询"],
  "brandDesc": "企业 AI 应用服务商",
  "platforms": ["DeepSeek", "豆包", "Kimi"]
}
```

---

### 4.2 `geo-audit`

| 字段 | 必填 | 说明 |
|------|------|------|
| `brandUrl` | 是 | 首页 URL |
| `brandName` | 推荐 | |
| `pageUrls` | 否 | 补充页面（≤50） |
| `competitors` | 否 | |
| `platforms` | 否 | |
| `modules` | 否 | 子模块开关 |
| `brandCity` | 否 | 原 `targetMarket` |

**GEO-Agent 入口**：`GeoAuditView`

**示例 payload**

```json
{
  "brandName": "汇智智能",
  "brandUrl": "https://www.example.com",
  "brandCity": "中国",
  "pageUrls": ["https://www.example.com/about"],
  "competitors": ["竞品A"],
  "platforms": ["DeepSeek", "豆包", "Kimi"],
  "modules": ["audit", "technical", "schema", "llmstxt", "content"]
}
```

---

### 4.3 单域技能（`geo-schema` / `geo-llmstxt` / `geo-citability` / `geo-technical` / `geo-crawlers` / `geo-content` / `geo-platform-optimizer`）

| 字段 | 必填 | 说明 |
|------|------|------|
| `brandUrl` | 是 | 目标站点 |
| `brandName` | 推荐 | |
| `industry` | 否 | |

**GEO-Agent 入口**：`GeoAssetsView`（schema / llmstxt / citability）

**示例 payload**

```json
{
  "brandName": "汇智智能",
  "brandUrl": "https://www.example.com"
}
```

---

### 4.4 `geo-brand-mentions`（对应 `brand_extract`）

| 字段 | 必填 | 说明 |
|------|------|------|
| `brandName` | 是 | 须与官网 JSON-LD 核对 |
| `brandUrl` | 是 | |
| `industry` | 否 | |
| `competitors` | 否 | |
| `productNames` | 否 | |
| `platforms` | 否 | 中国区 AI 平台 |

**GEO-Agent 入口**：`BrandClueStartFlow` → `brand_extract` 任务

**示例 payload**

```json
{
  "brandName": "汇智智能",
  "brandUrl": "https://www.example.com",
  "brandDesc": "业务描述",
  "inputType": "website_url",
  "sourceMaterials": [],
  "outputContract": { "format": "json", "requiredFields": ["profile"] }
}
```

---

### 4.5 汇总 / 商务技能

| skill | 主要入参 | taskType |
|-------|---------|----------|
| `geo-report` | 前置审计报告路径或评分数组 | — |
| `geo-report-pdf` | `GEO-AUDIT-REPORT.md` 路径 | `geo_report_pdf` |
| `geo-compare` | `domain` 或 baseline/current 审计文件 | `geo_compare` |
| `geo-proposal` | audit 文件或 domain | — |
| `geo-prospect` | CRM 命令（domain、status） | — |

---

## 5. taskType → skillName → 前端入口

| taskType | skillName | 前端入口 | 备注 |
|----------|-----------|---------|------|
| `geo_quick_start` | `geo-quick-start` | GeoQuickStartView, onboarding | |
| `geo_audit` | `geo-audit` | GeoAuditView, GeoQuickStartView(deep) | |
| `geo_schema` | `geo-schema` | GeoAssetsView | |
| `geo_llmstxt` | `geo-llmstxt` | GeoAssetsView | |
| `geo_citability` | `geo-citability` | GeoAssetsView | |
| `brand_extract` | `geo-brand-mentions` | BrandClueStartFlow, /api/extract-brand | |
| `geo_report_pdf` | `geo-report-pdf` | 报告页 | |
| `geo_compare` | `geo-compare` | 报告历史 | |

---

## 6. 差距清单

### P0（已在本迭代修复）

- [x] 字段名三套并行 → `normalizeGeoSkillInput` 统一为标准名
- [x] `brand_extract` → `geo.brand.extract` 不存在 → 改为 `geo-brand-mentions`
- [x] GeoAuditView 未传 `brandName` 到 payload
- [x] GeoAssetsView 仅传 `websiteUrl` → 改为 `brandUrl`

### P1（后续）

- [ ] 新增 taskType：`geo_technical`、`geo_content`、`geo_crawlers`、`geo_platform_optimizer`、`geo_brand_mentions`
- [ ] `geo-report` / `geo-proposal` / `geo-prospect` 产品入口

### P2

- [ ] 旧字段 `website`/`city`/`services` 在 API 响应中标记 deprecated

---

## 7. 迁移说明

1. **读取**：`normalizeGeoSkillInput` 接受旧别名，内部映射为标准字段。
2. **写入**：新任务 `AgentTask.input` 仅含标准字段；`website`/`websiteUrl`/`city`/`services`/`description` 不再写入。
3. **前端**：新表单统一使用 `brandUrl`、`brandCity`、`productNames`、`brandDesc`。
4. **Hermes prompt**：`buildHermesRunPayload` 使用归一化后的 payload，约束文案引用 `brandUrl`。

---

*文档版本：2026-06-06 · 与 `hermes-geo-input.ts` 实现同步*
