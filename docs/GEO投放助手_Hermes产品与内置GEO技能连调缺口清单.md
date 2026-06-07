# GEO 投放助手 · Hermes 产品与内置 GEO 技能连调缺口清单

生成日期：2026-06-05  
对照对象：

1. Hermes 下载站：`https://hermes.agentsyun.com/`
2. 附件：`/Users/feihong/Downloads/Hermes-GEO技能培训资料.html`
3. 当前项目：`/Users/feihong/Documents/geo-投放助手`

---

## 1. 新判断

上一版判断里最大的缺口是“GEO Skills 还没有沉淀”。现在根据附件内容，这个判断需要修正：

> Hermes 产品已经有独立下载站，GEO 技能包也已经覆盖完整咨询与交付链路。当前 GEO 投放助手最缺的不是“再发明技能”，而是把这些技能接入产品任务、报告、证据链、权限、安全确认和运营兜底。

Hermes 下载站当前呈现的产品能力包括：

1. Windows 下载入口。
2. Agent 运行环境。
3. Skills 按任务加载。
4. Docker 沙箱。
5. 长任务、文件系统、工具执行、多模型支持、自托管。

附件中的 GEO 技能包已经覆盖：

1. `geo-quick-start`
2. `geo-audit`
3. `geo-citability`
4. `geo-content`
5. `geo-technical`
6. `geo-crawlers`
7. `geo-llmstxt`
8. `geo-schema`
9. `geo-brand-mentions`
10. `geo-platform-optimizer`
11. `geo-report`
12. `geo-report-pdf`
13. `geo-proposal`
14. `geo-prospect`
15. `geo-compare`

所以连调前，GEO 投放助手这边要补的是“产品化编排层”。

---

## 2. 当前项目已具备的基础

| 能力 | 当前情况 |
|---|---|
| AgentTask 任务表 | 已有 `AgentTask`、`AgentTaskLog` |
| Skill 调用记录 | 已有 `AgentSkillRun` |
| 本地自动化记录 | 已有 `LocalAutomationRun` |
| Hermes 健康检查 | 有 `/api/hermes/health` |
| 技能路由配置 | 有 `SystemConfig.skill_routes` 和 `server/lib/agent-skill.ts` |
| GEO 分析报告 | 有 `GeoReport`、报告历史、PDF、水印、分享页 |
| 账号登录态校验 | 有 `account_verify` 流程 |
| 内容生成和发布记录 | 有 `ContentBatch`、`ContentItem`、`PublishPlan`、`PublishRecord` |
| 接单交付证据 | 接单端支持链接、截图/附件上传 |

这些基础能支撑连调，但还没有真正对齐 Hermes 下载产品和内置 GEO 技能包。

---

## 3. P0 连调阻塞项

### P0-01 当前代码没有真正启用 Hermes Executor

**现状**

`server/agent/executors/index.ts` 当前实现如下逻辑：

1. `getExecutor(kind)` 忽略 `kind`，永远返回 `DirectModelExecutor`。
2. `resolveExecutorKind()` 永远返回 `direct_model`。
3. `resolveExecutorKindForTask()` 也只是返回 `direct_model`。

这意味着即使系统配置里写了 `hermes_gateway`，当前后端也不会真正调用 `NousHermesExecutor`。

**影响**

这是最终连调的第一阻塞项。项目页面上可能显示 Hermes 健康状态，但任务执行仍走 mock/direct model。

**需要补**

1. 恢复 `getExecutor('nous_hermes') => new NousHermesExecutor()`。
2. `resolveExecutorKind()` 读取环境变量 `HERMES_EXECUTOR` 或系统配置 `hermes_executor_default`。
3. `resolveExecutorKindForTask(taskType)` 读取 `skill_routes` 中的 executor。
4. `/api/hermes/health` 返回真实默认执行器和各任务执行器。
5. 增加 smoke test：`geo-quick-start` 或 `geo-audit` 能真实创建 Hermes run。

---

### P0-02 任务类型没有覆盖附件中的 GEO 技能地图

**现状**

当前 `AgentTaskType` 只有：

1. `article_generation`
2. `geo_analysis`
3. `campaign_plan`
4. `website_preview`
5. `brand_extract`
6. `hermes_publish`
7. `account_verify`
8. `keyword_mining`
9. `index_sampling`
10. `article_rewrite`

附件中的技能却是完整 GEO 咨询交付链路：

`geo-quick-start`、`geo-audit`、`geo-technical`、`geo-crawlers`、`geo-llmstxt`、`geo-schema`、`geo-content`、`geo-citability`、`geo-brand-mentions`、`geo-platform-optimizer`、`geo-report`、`geo-proposal`、`geo-prospect`、`geo-compare` 等。

**影响**

GEO 投放助手现在无法把附件里的技能作为一等任务来调度、展示、重试、入报告。

**需要补**

新增任务类型建议：

| 新 taskType | 对应 Hermes skill | 产品入口 |
|---|---|---|
| `geo_quick_start` | `geo-quick-start` | 售前快速检测 |
| `geo_audit` | `geo-audit` | 专业审计 |
| `geo_technical` | `geo-technical` | 技术基础审计 |
| `geo_crawlers` | `geo-crawlers` | AI 爬虫访问检查 |
| `geo_llmstxt` | `geo-llmstxt` | llms.txt 生成/检测 |
| `geo_schema` | `geo-schema` | Schema 生成/校验 |
| `geo_content` | `geo-content` | 内容 E-E-A-T 分析 |
| `geo_citability` | `geo-citability` | 可引用性评分与改写 |
| `geo_brand_mentions` | `geo-brand-mentions` | 外部权威扫描 |
| `geo_platform_optimizer` | `geo-platform-optimizer` | 平台专项优化 |
| `geo_client_report` | `geo-report` | 客户报告汇总 |
| `geo_report_pdf` | `geo-report-pdf` | PDF 正式交付 |
| `geo_proposal` | `geo-proposal` | 售前报价方案 |
| `geo_prospect` | `geo-prospect` | 线索/客户管线 |
| `geo_compare` | `geo-compare` | 月度复盘 |

---

### P0-03 缺少 Hermes 技能调用协议适配

**现状**

`server/agent/executors/hermes.ts` 当前只把任务 input 拼成自然语言 prompt，提交 `/v1/runs`。它没有明确告诉 Hermes：

1. 要调用哪个 skill。
2. skill 的参数是什么。
3. 输出应该遵守什么 JSON schema。
4. 输出文件在哪里。
5. 附件、截图、PDF、报告文件如何回传。

**影响**

即使能连上 Hermes，也会变成“发一段 prompt 给 Agent 猜”，而不是稳定产品接口。

**需要补**

定义统一请求体：

```json
{
  "skill": "geo-audit",
  "taskId": "agent-task-id",
  "input": {
    "brandName": "云杉口腔",
    "websiteUrl": "https://example.com",
    "market": "中国",
    "platforms": ["DeepSeek", "豆包", "Kimi"],
    "competitors": ["竞品 A", "竞品 B"]
  },
  "outputContract": {
    "format": "json",
    "artifacts": ["markdown", "pdf", "screenshots", "json"]
  },
  "callback": null
}
```

同时定义 Hermes 输出标准：

```json
{
  "status": "succeeded",
  "summary": "本次 GEO 审计发现 12 个问题",
  "metrics": {},
  "sections": {},
  "artifacts": [
    { "type": "markdown", "name": "GEO-AUDIT-REPORT.md", "url": "..." },
    { "type": "pdf", "name": "GEO-REPORT.pdf", "url": "..." },
    { "type": "screenshot", "name": "quick-start.png", "url": "..." }
  ],
  "rawFiles": []
}
```

---

### P0-04 缺少技能输入表单与产品入口

**现状**

当前已有 GEO 分析页、排名监控、内容库、发起订单，但没有对附件中技能的输入采集表单。

附件明确了每个技能的输入要求，例如：

1. `geo-quick-start` 最小只需品牌名，可选城市、产品/服务、官网、平台。
2. `geo-audit` 需要官网 URL、品牌名、业务类型、重点页面、竞品、目标平台。
3. `geo-schema` 需要页面 URL 或 HTML、法定名称、Logo、地址、电话、sameAs。
4. `geo-compare` 需要两份审计报告或历史 baseline。

**影响**

用户无法在 GEO 投放助手里按技能要求提交任务，只能走现有宽泛的 GEO 分析。

**需要补**

建议新增三个产品入口：

| 页面 | 覆盖技能 | 目的 |
|---|---|---|
| GEO 快速检测 | `geo-quick-start` | 售前/低门槛检测 |
| GEO 专业审计 | `geo-audit` + 专项技能 | 付费审计主入口 |
| GEO 资产生成 | `geo-schema`、`geo-llmstxt`、`geo-content`、`geo-citability` | 交付执行入口 |

---

### P0-05 当前报告模型承载不了附件里的交付物

**现状**

`GeoReport` 主要字段是：

1. `mentionRate`
2. `rank`
3. `gapsFound`
4. `brandMentionSummary`
5. `competitorAnalysis`
6. `contentGap`
7. `optimizationSuggestions`

附件里的标准审计交付包括：

1. GEO 总分。
2. AI Citability、Brand Authority、Content E-E-A-T、Technical GEO、Schema、Platform Optimization 分项评分。
3. AI crawler access 表。
4. Schema 缺口与 JSON-LD 代码。
5. llms.txt 状态或生成稿。
6. 内容低分段落与改写建议。
7. 平台专项行动表。
8. 30 天行动计划。
9. PDF 报告、报价方案、月度 delta report。

**影响**

Hermes 技能跑完后，结果无法完整落库，也无法在产品里结构化展示。

**需要补**

新增或扩展数据模型：

| 模型 | 作用 |
|---|---|
| `GeoAuditRun` | 一次完整审计 |
| `GeoAuditScore` | 总分与分项评分 |
| `GeoAuditFinding` | 问题、等级、建议、责任团队 |
| `GeoCrawlerCheck` | AI 爬虫访问结果 |
| `GeoSchemaArtifact` | JSON-LD 代码与校验状态 |
| `GeoLlmsTxtArtifact` | llms.txt / llms-full.txt 生成稿 |
| `GeoContentFinding` | 内容段落评分与改写建议 |
| `GeoPlatformAction` | 各 AI 平台专项动作 |
| `GeoReportArtifact` | Markdown、PDF、截图、原始 JSON |
| `GeoCompareReport` | 月度对比结果 |

短期也可以先在 `GeoReport` 增加 `rawJson` / `artifactsJson`，但正式开发建议拆表。

---

### P0-06 缺少 artifact 文件接收、存储和预览

**现状**

项目支持接单端附件上传，也有报告 PDF 前端导出；但 Hermes 技能输出的 Markdown、PDF、截图、JSON、llms.txt、schema 代码等，还没有统一 artifact 存储模型。

**需要补**

1. `POST /api/agent-tasks/:id/artifacts` 或由 Hermes run 结果同步 artifacts。
2. 本地/对象存储适配。
3. Artifact 权限控制。
4. Markdown/PDF/图片/JSON/代码预览组件。
5. 报告页从 artifact 渲染，而不是只渲染固定字段。

---

### P0-07 缺少执行前确认和风险等级

**现状**

已有 `needsReview`、`reviewCategory`，但主要是执行失败/运营标记。没有按技能风险等级做执行前确认。

附件中的技能有不同风险：

| 技能 | 风险 |
|---|---|
| `geo-quick-start` | 低，读取/生成报告 |
| `geo-technical` | 低，读取网站 |
| `geo-crawlers` | 中，可能生成 robots 建议 |
| `geo-llmstxt` | 中，生成可发布文件 |
| `geo-schema` | 中，生成可嵌入代码 |
| `geo-content` / `geo-citability` | 中，改写内容 |
| `hermes_publish` | 高，可能操作第三方平台发布 |

**需要补**

1. `SkillRiskPolicy` 配置。
2. 执行前预览：将访问什么网站、生成什么文件、是否会发布。
3. 用户确认：中高风险动作需确认。
4. 审计日志：记录确认人、确认时间、确认内容。
5. 客户侧状态：待确认 / 执行中 / 已完成 / 需人工处理。

---

## 4. P1 重要功能缺口

### P1-01 缺少 Hermes 下载与绑定入口

Hermes 下载站已经有了，但 GEO 投放助手内部还需要：

1. 「下载 Hermes」按钮，指向 `https://hermes.agentsyun.com/`。
2. Windows 支持说明；macOS/Linux 当前不应承诺可下载。
3. 绑定当前 GEO 账号的一次性 token。
4. 本机 Hermes 心跳和版本展示。
5. GEO 技能包版本展示。

建议页面：`发布账号 / 本机执行器` 或独立 `Hermes 执行器`。

---

### P1-02 缺少技能版本和兼容性检查

附件写的是 `C:\Users\win11\AppData\Local\hermes\skills\geo`，说明技能安装在 Hermes 本机环境中。GEO 投放助手需要知道：

1. 本机是否安装 GEO 技能包。
2. 技能包版本。
3. 支持哪些 skill。
4. 是否与当前平台 `skill_routes` 兼容。
5. 是否需要升级。

建议新增：

1. `/api/hermes/skills`
2. `/api/hermes/skills/sync`
3. `HermesSkillManifest` 前端展示。

---

### P1-03 缺少售前 prospect / proposal 闭环

附件中 `geo-prospect` 和 `geo-proposal` 很适合销售使用，但当前项目主要围绕品牌资料、GEO 分析和订单，没有完整售前 CRM-lite。

需要补：

1. 线索列表。
2. 快速检测记录。
3. 审计报告关联。
4. 三档报价方案生成。
5. 销售状态：new / audited / proposed / won / lost。
6. MRR 或合同金额字段。

---

### P1-04 缺少月度复盘 baseline 机制

附件中 `geo-compare` 是续费关键，但当前报告历史只是列表，没有强 baseline/current 对比。

需要补：

1. 把某次审计设为 baseline。
2. 每月复测创建 current audit。
3. 分数变化、平台变化、问题完成度、new issues。
4. 月报页面和 PDF。
5. 从月报生成下月任务包。

---

### P1-05 现有“排名监控”与 GEO 技能报告需要打通

当前已有 `IndexQueryPlan`、`IndexResult`，能做关键词/平台采样，但它和附件里的 `geo-quick-start` 提及矩阵、`geo-platform-optimizer` 平台专项评分、`geo-compare` 月度对比还未统一。

建议统一为：

1. 问题集：用户真实会问 AI 的问题。
2. 采样结果：平台、回答、品牌是否出现、竞品是否出现、引用来源。
3. 报告引用：快速检测、专业审计、月报都复用同一批采样结果。

---

## 5. P2 可后置功能

### P2-01 接单端不必急着承载全部 GEO 技能

附件技能主要是顾问/交付团队能力。第一阶段可以先由品牌方/平台运营在发布端触发，不必让接单端直接调用所有技能。

接单端短期只需：

1. 接收由 GEO 审计生成的任务包。
2. 按任务提交链接、截图、说明。
3. 被报告证据链引用。

### P2-02 完整计费可以晚于连调

当前已有算力和投放资金分池。连调阶段先记录技能消耗，不必立刻做复杂计费。

需要先补：

1. 每次 skill run 的 token/时长/模型/沙箱耗时记录。
2. 是否计费。
3. 失败是否退回。

---

## 6. 推荐连调顺序

### 第一步：打通最小 Hermes run

1. 修复 executor 选择逻辑。
2. 配置 `geo_quick_start -> geo-quick-start -> hermes_gateway`。
3. 从 GEO 投放助手提交品牌名、城市、服务、官网。
4. Hermes 返回结构化 JSON + Markdown artifact。
5. 平台保存 `AgentTask`、`AgentSkillRun`、`GeoReportArtifact`。

### 第二步：打通专业审计

1. 配置 `geo_audit`。
2. 输入官网、竞品、目标平台。
3. 返回总分、分项评分、findings、30 天行动计划。
4. 报告页结构化展示。

### 第三步：打通资产生成

1. `geo-schema` 返回 JSON-LD。
2. `geo-llmstxt` 返回 llms.txt。
3. `geo-citability` 返回低分段落和改写建议。
4. 用户确认后进入“待执行/待发布”。

### 第四步：打通客户交付

1. `geo-report` 汇总。
2. `geo-report-pdf` 输出 PDF。
3. 分享页展示。
4. 从报告生成下轮任务包。

### 第五步：打通月度复盘

1. 设置 baseline。
2. 运行 current audit。
3. `geo-compare` 输出月度 delta report。
4. 自动生成续费/下月动作建议。

---

## 7. 最小功能清单

如果只看“最后能连调并对客户交付”，当前项目至少还差这些：

1. 修复 Hermes executor 真实调用。
2. 扩展 AgentTaskType 覆盖附件 GEO 技能。
3. 定义 Hermes skill 调用输入/输出协议。
4. 新增快速检测、专业审计、资产生成三个产品入口。
5. 新增 artifact 存储与预览。
6. 扩展 GEO 报告模型，承载分项评分、findings、爬虫检查、Schema、llms.txt、行动计划。
7. 新增执行前风险确认。
8. 新增 Hermes 下载、绑定、心跳、技能版本检查。
9. 打通 quick-start -> audit -> report -> pdf -> compare 的客户交付链路。
10. 将排名监控、报告历史、任务包生成统一到同一套 GEO 采样与证据链。

---

## 8. 一句话结论

现在 Hermes 产品和 GEO 技能包已经能作为外部执行与专家能力层使用。GEO 投放助手下一步最关键的是补“连接器 + 产品入口 + 结构化报告 + artifact 证据链 + 安全确认”。其中第一优先级是修复真实 Hermes Executor，因为当前代码虽然有 Hermes 适配文件，但实际任务仍然只会走 DirectModelExecutor。
