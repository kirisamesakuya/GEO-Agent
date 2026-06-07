# Hermes GEO Skill 与 GEO-Agent Web 端接口对齐审阅文档

> 审阅日期：2026-06-06  
> Hermes GEO skill 路径：`C:\Users\feihong\AppData\Local\hermes\skills\geo`  
> 项目路径：`D:\GEO-Agent`
> 重要前提：正式安装 Hermes 时，本文涉及的 GEO skills 会随 Hermes 安装包内置，不需要用户额外手动安装 skill。

## 结论摘要

当前 Hermes GEO skill 与 GEO-Agent Web 端已经具备“可连调”的基础：`geo_quick_start`、`geo_audit`、`geo_schema`、`geo_llmstxt`、`geo_citability`、`geo_report_pdf`、`geo_compare`、`brand_extract` 都有 taskType 与 skillName 映射，并且项目通过 `server/lib/hermes-geo-input.ts` 把 Web 端旧字段归一到 `brandUrl`、`brandCity`、`productNames`、`brandDesc` 等标准字段。

但距离“满足目前 Web 端完整产品需求”还差一层产品化接口：若只跑现有入口，可以完成快速检测、专业审计、Schema、llms.txt、可引用性资产草稿；若要覆盖 Web 端的投放助手、内容库、排名监控、接单交付、平台端运营和报告商业交付，还需要补充 7 类 skill 或把现有 skill 拆成可被 Web 稳定调用的 JSON 契约。

由于 GEO skills 会随 Hermes 内置，**skill 缺失不是主要风险**；真正需要处理的是运行环境与调用契约。原 Hermes GEO skill 仍存在机器绑定与环境假设：部分说明写死 `~/.claude/skills/geo`、`~/hermes-agent/scripts/start-chrome-debug.ps1`、macOS Chrome 路径、`~/.geo-prospects` 数据目录、pandoc/Chrome 本机依赖、`localhost:9222` CDP 调试端口、直接注入 API Key 的 HTML 表单。这些不会导致所有 skill 失效，但会让新机器、Windows 非同路径、无 pandoc/Chrome、无 CDP 的环境出现不可预测失败。建议把 skill 改成“内置 skill 可发现 + 相对 skill_dir + Hermes 工作目录 + 环境探测 + 结构化输出”的通用形态。

## 1. Hermes GEO Skill 与项目接口是否对得上

### 1.1 当前 Web 端任务链路

项目当前标准链路如下：

```text
Web 页面
  -> POST /api/agent-tasks
  -> createAgentTask()
  -> normalizeGeoSkillInput(taskType, input, brandName)
  -> AgentTask.input 入库
  -> NousHermesExecutor.buildHermesRunPayload()
  -> POST HERMES_API_URL/v1/runs
  -> Hermes 依据 skillName 执行对应 SKILL.md
  -> poll /v1/runs/:id
  -> normalizeResult() 统一成 audit/data/metrics/findings/artifacts/actionPlan
```

相关项目文件：

- `server/lib/agent-skill.ts`：taskType 到 skillName 的默认映射。
- `server/lib/hermes-geo-input.ts`：字段归一化、旧字段兼容、官网 URL 约束。
- `server/agent/executors/hermes.ts`：Hermes `/v1/runs` 调用、状态映射、输出归一化。
- `server/routes/agent-tasks.ts`：Web 端 AgentTask 创建入口。
- `server/db/bootstrap.ts`：默认 skill route 配置。

### 1.2 已对齐的 skill

| Web taskType | Hermes skill | 当前入口 | 对齐状态 | 说明 |
|---|---|---|---|---|
| `geo_quick_start` | `geo-quick-start` | `GeoQuickStartView` | 基本对齐 | Web 输入已传 `brandName`、`brandUrl`、`brandCity`、`productNames`、`brandDesc`、`platforms`、`sourceMaterials`。但 Hermes skill 内仍保留本地 HTML 表单/CDP 模式，和 Web API 模式有重叠。 |
| `geo_audit` | `geo-audit` | `GeoAuditView`、深度快速检测 | 基本对齐 | Web 传 `brandUrl`、`pageUrls`、`competitors`、`platforms`、`modules`。skill 输出偏 Markdown 报告，项目要求 JSON 结构化输出，需要强化契约。 |
| `geo_schema` | `geo-schema` | `GeoAssetsView` | 基本对齐 | 输入只需 `brandUrl`/`brandName`。风险在 skill 文档写死脚本路径 `~/.claude/skills/geo/scripts/fetch_page.py`。 |
| `geo_llmstxt` | `geo-llmstxt` | `GeoAssetsView` | 基本对齐 | 适合生成资产草稿。需要明确返回 `llmsTxtContent`、`validation`、`implementationNotes`。 |
| `geo_citability` | `geo-citability` | `GeoAssetsView` | 基本对齐 | 适合产出改写建议。当前 Web 输入缺少具体页面正文/目标内容时，结果会偏泛化。 |
| `brand_extract` | `geo-brand-mentions` | onboarding/品牌线索 | 基本对齐 | 项目已把原先不存在的 `geo.brand.extract` 改为 `geo-brand-mentions`。需补 `profile`、`authoritySignals`、`sourceEvidence` 输出契约。 |
| `geo_report_pdf` | `geo-report-pdf` | 报告页/任务详情 | 部分对齐 | skill 假设当前目录存在 `GEO-AUDIT-REPORT.md`，且本机有 pandoc 与固定 Chrome。Web 端更适合服务端/前端已有 PDF 渲染链路。 |
| `geo_compare` | `geo-compare` | 报告历史 | 部分对齐 | skill 假设本地文件路径或 `~/.geo-prospects` 历史。Web 端需要传 baseline/current report JSON，而不是依赖本机文件发现。 |

### 1.3 未对齐但 Hermes 已有能力的 skill

| Hermes skill | 建议新增 taskType | Web 当前缺口 | 建议 |
|---|---|---|---|
| `geo-technical` | `geo_technical` | 无专用任务类型/入口 | 从 `geo_audit` modules 中拆出可单跑的技术审计，返回 technicalScore、crawlability、ssr、performance、headers。 |
| `geo-crawlers` | `geo_crawlers` | 无专用任务类型/入口 | 做 AI 爬虫访问检查，返回 robots、meta robots、X-Robots-Tag、AI bot allow/block 矩阵。 |
| `geo-content` | `geo_content` | 无专用任务类型/入口 | 接入内容库/文章生成前置检查，返回 E-E-A-T、citability、rewriteBrief。 |
| `geo-platform-optimizer` | `geo_platform_optimizer` | 无专用任务类型/入口 | 对 DeepSeek、豆包、Kimi、通义、Google AIO、ChatGPT、Perplexity 做平台化建议。 |
| `geo-report` | `geo_report` | Web 端报告已存在，但 skill 未接入 | 可作为结构化报告聚合器，输入 audit JSON 而非读取 Markdown 文件。 |
| `geo-proposal` | `geo_proposal` | 接单/报价/商务方案缺口 | 适合接单助手生成服务方案，但需本地化币种、套餐、交付项。 |
| `geo-prospect` | `geo_prospect` | 平台端/销售 CRM 缺口 | 当前 skill 自建 `~/.geo-prospects`，不应直接用于 Web，多数能力应迁入项目 DB。 |

## 2. Skill 是否满足当前 Web 端需求

### 2.1 已满足的 Web 需求

| Web 需求 | 当前是否满足 | 依据 |
|---|---:|---|
| 快速 GEO 检测 | 是 | `GeoQuickStartView` 可创建 `geo_quick_start` 或 `geo_audit`。 |
| 专业官网审计 | 是 | `GeoAuditView` 可提交 `geo_audit`，支持 modules、pageUrls、competitors。 |
| Schema 草稿生成 | 是 | `GeoAssetsView` 支持 `geo_schema`。 |
| llms.txt 草稿生成 | 是 | `GeoAssetsView` 支持 `geo_llmstxt`。 |
| 内容可引用性建议 | 是 | `GeoAssetsView` 支持 `geo_citability`。 |
| Hermes readiness 检查 | 是 | `HermesReadinessPanel` 与 `/api/hermes/onboarding-status` 已存在。 |
| Hermes Gateway 调用 | 是 | `NousHermesExecutor` 默认调用 `http://127.0.0.1:8642/v1/runs`。 |

### 2.2 尚不能完整满足的 Web 需求

| Web 需求 | 当前不足 | 需要补充 |
|---|---|---|
| 结构化报告稳定入库 | skill 多数输出 Markdown，自由文本多 | 每个 skill 增加固定 JSON 输出 schema，至少包含 `audit`、`metrics`、`findings`、`artifacts`、`actionPlan`。 |
| 单项资产可复用/可审核/可发布 | Schema、llms.txt、改写建议只是任务输出 | 增加 artifact 类型：`schema_jsonld`、`llms_txt`、`content_rewrite_patch`、`robots_patch`，并带风险等级、发布说明。 |
| 内容库联动 | `geo-content` 未独立接入，文章生成仍走 `geo.article.generate` direct_model | 新增 `geo_content` taskType，输入内容库条目或页面正文，输出写作 brief、改写建议、引用片段。 |
| AI 挖词/排名监控 | Hermes GEO skill 没有 `keyword_mining`、`index_sampling` 对应实现 | 新增 `geo-keyword-mining`、`geo-ai-ranking-sampling` 或把现有平台优化 skill 拆分为可采样任务。 |
| 平台端运营视角 | 现有 skill 偏单品牌/单站点 | 新增多品牌批量监控、异常解释、报告运营摘要 skill。 |
| 接单助手报价/任务包 | `geo-proposal`、`geo-prospect` 有业务思路但文件存储不适配 Web | 改造成接收 Web reportId/brandId/orderId 的无状态 skill，输出套餐、任务包、报价建议。 |
| 新机器一键运行 | skill 中有固定路径和外部二进制假设 | 增加环境探测、依赖说明、相对路径脚本调用、失败降级输出。 |

## 3. 需要补充什么 Skill

### 3.1 P0：先补接口契约，不急着扩能力

建议新增一个基础契约文档或 skill：`geo-web-output-contract`。

用途：所有 GEO skill 被 Web 调用时，必须按以下结构返回：

```json
{
  "audit": {
    "title": "",
    "summary": "",
    "totalScore": 0,
    "scores": {}
  },
  "data": {},
  "metrics": {},
  "findings": [
    {
      "id": "",
      "severity": "critical|high|medium|low",
      "category": "",
      "title": "",
      "evidence": "",
      "recommendation": ""
    }
  ],
  "artifacts": [
    {
      "id": "",
      "type": "markdown|json|schema_jsonld|llms_txt|robots_patch|content_rewrite_patch|pdf",
      "name": "",
      "content": "",
      "riskLevel": "low|medium|high",
      "requiresHumanApproval": true
    }
  ],
  "actionPlan": [
    {
      "priority": "P0|P1|P2",
      "owner": "brand|provider|platform",
      "task": "",
      "expectedImpact": ""
    }
  ]
}
```

### 3.2 P1：补齐 Web 已有页面最需要的专项 skill

| 建议 skill | 对应 taskType | 主要输入 | 主要输出 |
|---|---|---|---|
| `geo-technical-web` | `geo_technical` | `brandUrl`、`pageUrls`、`modules` | 技术得分、robots/sitemap/SSR/headers/performance 明细。 |
| `geo-crawlers-web` | `geo_crawlers` | `brandUrl` | AI bot 访问矩阵、robots 建议、风险说明。 |
| `geo-content-web` | `geo_content` | `brandUrl`、`pageUrls`、`contentItems`、`targetQuestions` | E-E-A-T、可引用段落、改写 brief、内容库候选主题。 |
| `geo-platform-ranking-sampling` | `index_sampling` 或 `geo_platform_optimizer` | `brandName`、`brandUrl`、`queries`、`platforms` | 平台问答采样结果、是否提及、竞品共现、引用 URL。 |
| `geo-keyword-mining-web` | `keyword_mining` | `brandName`、`industry`、`services`、`geoReportId` | 关键词/问题池、意图分组、优先级。 |

### 3.3 P2：补齐商业交付 skill

| 建议 skill | 对应 taskType | 说明 |
|---|---|---|
| `geo-report-web` | `geo_report` | 输入项目内 report JSON，输出 Web 可展示的报告 sections，不读取本机 Markdown 文件。 |
| `geo-proposal-web` | `geo_proposal` | 输入 audit/actionPlan/order context，输出报价套餐、交付周期、验收标准。 |
| `geo-task-pack-web` | `campaign_plan` | 把报告 actionPlan 转成服务商可接单任务包。 |
| `geo-publish-brief-web` | `hermes_publish` 前置 | 把内容库条目、目标平台、账号状态整理成 Hermes 发布执行 brief。 |

## 4. GitHub 上可参考并微调的项目

### 4.1 `Auriti-Labs/geo-optimizer-skill`

链接：[https://github.com/Auriti-Labs/geo-optimizer-skill](https://github.com/Auriti-Labs/geo-optimizer-skill)

可参考点：

- 它是开源 GEO audit engine，README 明确覆盖 crawl、understand、cite、monitor 四类能力。
- 能力模块与当前 Hermes skill 高度重合：robots.txt/AI bot、llms.txt、JSON-LD schema、meta tags、content、brand entity、AI discovery、citability。
- 它支持 CLI、JSON、HTML、SARIF、Junit、GitHub annotations 等输出，可参考其“机器可读 JSON 契约”和 CI 输出。
- README 中已有 `geo audit`、`geo diff`、`geo history`、`geo monitor`、`geo llms`、`geo schema` 等命令，适合映射到 Web 端的 `geo_audit`、`geo_compare`、`index_sampling`、`geo_llmstxt`、`geo_schema`。

建议微调方式：

- 不建议直接替换 Hermes skill；建议抽取其 JSON 输出模型、评分维度、访问模拟思路。
- 将其 `geo access`/`geo logs` 能力改造成 `geo_crawlers` 与平台端监控能力。
- 将其 `geo history`/`geo track` 思路改造成 Web 端报告历史趋势和品牌运营告警。

### 4.2 `AnswerDotAI/llms-txt`

链接：[https://github.com/AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt)

可参考点：

- 这是 `/llms.txt` 规范原始项目，适合用来校准 `geo-llmstxt` 的格式、生成规则和验证规则。
- 目前 Hermes `geo-llmstxt` 已有较完整规则，但 Web 端需要输出可直接审核/下载/复制的 artifact。

建议微调方式：

- 把 `geo-llmstxt` 输出拆成 `analysis`、`llmsTxtContent`、`llmsFullTxtContent`、`deploymentInstructions`。
- 增加“文件是否真实可访问”的检查，不要只判断内容格式。

### 4.3 `firecrawl/firecrawl`

链接：[https://github.com/firecrawl/firecrawl](https://github.com/firecrawl/firecrawl)

可参考点：

- Firecrawl 是网页抓取/搜索/结构化提取 API，可参考其抓取 pipeline、Markdown 化、批量 URL 处理、失败重试。
- 对 Hermes skill 来说，最有价值的是“将网页抓取作为独立基础层”，而不是每个 skill 自己写一套 `requests.get`。

建议微调方式：

- 新增 `geo-fetch-web` 或内部脚本，统一返回 `{ url, status, headers, html, text, markdown, links, structuredData }`。
- 所有技术审计、内容审计、Schema、llms.txt 都调用这个统一抓取层，减少新机器环境问题。

## 5. 原 GEO Skill 的问题与迁移性风险

### 5.1 固定路径问题

| 位置 | 风险 | 建议 |
|---|---|---|
| `geo-schema/SKILL.md` 写 `python3 ~/.claude/skills/geo/scripts/fetch_page.py <url> page` | Hermes 实际路径是 `AppData\Local\hermes\skills\geo`，新机器未必有 `~/.claude` | 改为“使用当前 skill 目录下的 `scripts/fetch_page.py`”，由 Hermes runtime 注入 skill_dir 或让脚本通过相对路径运行。 |
| `geo-report-pdf/SKILL.md` 提到 `~/.claude/skills/geo/templates/geo-report-template.html` | 当前目录没有对应 templates，且路径不是 Hermes 路径 | 改成读取 skill 内 templates；若模板缺失，返回错误 artifact，不要静默失败。 |
| `geo-prospect/scripts/crm_dashboard.py` 写 `Path.home() / ".geo-prospects"` | Web 项目数据在 Prisma DB，不能让 skill 自建另一个客户库 | 不建议直接接 Web；改造成无状态输入输出，由 Web 负责持久化。 |
| `geo-compare/SKILL.md` 输出到 `~/.geo-prospects/reports` | Web 报告历史在项目 DB | 改为接收 baseline/current report JSON，输出 delta JSON + markdown artifact。 |

### 5.2 固定机器/固定软件问题

| 位置 | 风险 | 建议 |
|---|---|---|
| `geo-quick-start` 要求 Chrome CDP `localhost:9222`，并提示 `~/hermes-agent/scripts/start-chrome-debug.ps1` | 新机器未启 CDP、路径不存在、非 Windows 或脚本不在 home 下会失败 | Web 调用模式不应依赖 CDP；真实平台采样应单独做 `geo-platform-ranking-sampling`，并在 readiness 中检查浏览器能力。 |
| `geo-report-pdf` 要求 pandoc 和 macOS `/Applications/Google Chrome.app/` | 当前项目是 Windows 工作区，路径不成立 | 优先使用项目已有 `jspdf/html2canvas` 或 Node/Playwright PDF；skill 仅返回 HTML/Markdown。 |
| `geo-quick-start/scripts/inject_key.py` 会把 API Key 注入 HTML 模板 | 直接把 key 写入临时 HTML 有泄漏风险 | Web 端不应使用该表单模式；如保留，改成后端代理调用或一次性短 token。 |
| 多个脚本依赖 `requests` | 新 Python 环境可能未装依赖 | 在 skill 中声明依赖检查；更好是用 Hermes bundled Python 或 Node fetch。 |

### 5.3 输出格式问题

大部分 skill 的 `Output Format` 是 Markdown 报告模板，而 Web 端需要机器可读结果。虽然 `NousHermesExecutor.normalizeResult()` 会兜底把原始输出塞进 `audit/data/metrics/findings`，但这只是兼容，不是稳定契约。

建议所有可被 Web 调用的 skill 在末尾补一段：

```text
When called by GEO-Agent Web, return one final JSON object only.
Do not wrap it in markdown fences.
Required fields: audit, data, metrics, findings, artifacts, actionPlan.
If a markdown report is needed, put it into artifacts[] as type=markdown.
```

### 5.4 外部事实/标准更新风险

GEO 相关平台规则变化很快。Google 官方说明中，生成式 AI 搜索仍以 Search ranking/quality systems、RAG、query fan-out、可抓取内容和技术基础为核心，且提醒第三方 AEO/GEO 建议需要谨慎评估。OpenAI 官方 crawler 文档也区分了 `OAI-SearchBot`、`GPTBot`、`ChatGPT-User` 的用途，并说明 robots.txt 管理方式。这类规则不应硬编码在 skill 里长期不更新。

建议：

- crawler user-agent 列表放到 `references/ai-crawlers.json`，带 `lastVerifiedAt`。
- `geo-crawlers` 每次报告输出“规则版本”和“验证日期”。
- 对 Google AIO、ChatGPT、Perplexity、DeepSeek、豆包等平台做分层：官方规则、公开观察、内部经验，不混在一个评分里。

参考资料：

- Google Search Central：[Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- OpenAI Platform：[Overview of OpenAI Crawlers](https://platform.openai.com/docs/bots)
- llms.txt specification：[AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt)

## 6. 新用户电脑安装适配判断

### 6.1 直接回答

在“GEO skills 随 Hermes 安装包内置”的前提下，**按当前状态真实开发，仍不能保证不同用户电脑新安装后都可稳定适配**。

原因不是 skill 没有装，而是当前链路还没有把“内置 skill 的发现方式、运行依赖、浏览器能力、输出格式、文件产物回传、安全凭据”做成可验证的安装后能力矩阵。也就是说，新用户电脑上 Hermes 可能已经有 `geo-audit`、`geo-schema`、`geo-llmstxt` 等 skill，但 Web 端仍可能遇到以下问题：

| 适配项 | 当前风险 | 是否因内置 skill 自动解决 |
|---|---|---:|
| skill 是否存在 | 安装包内置后风险较低 | 是 |
| skill 名称与 taskType 是否匹配 | 仍需 Hermes `/skills` manifest 与 Web route 校验 | 否 |
| skill 内脚本相对路径 | 文档/命令里仍有 `~/.claude`、macOS Chrome 等旧路径 | 否 |
| Python/requests/pandoc/Chrome 等依赖 | 不同用户机器安装状态不同 | 否 |
| CDP/浏览器自动化能力 | `geo-quick-start` 的真实平台检测依赖 `localhost:9222` | 否 |
| PDF 生成 | `geo-report-pdf` 假设 pandoc + 固定 Chrome 路径 | 否 |
| 输出格式 | 大多数 skill 默认 Markdown，Web 需要 JSON | 否 |
| 本地文件持久化 | `~/.geo-prospects` 与 Web DB 不一致 | 否 |
| API Key 安全 | `inject_key.py` 注入 HTML 有泄漏风险 | 否 |

### 6.2 新机器可用的最低验收标准

要做到“任何用户电脑安装 Hermes 后都能适配 Web”，至少需要满足以下验收标准：

1. **Hermes health 可用**：Web 能检测到 Hermes Desktop 或 Gateway，返回版本、设备绑定状态、API Server 状态。
2. **内置 skill manifest 可用**：`/api/hermes/skills` 能返回内置 skill 列表、版本、能力标签、依赖状态。
3. **Web taskType 全部可解析**：每个 Web 任务都能映射到 Hermes 内置 skill，不能出现 `geo.task.xxx` 兜底名。
4. **运行依赖可探测**：每个 skill 执行前返回 `ready | degraded | unavailable`，并说明缺少什么。
5. **路径不依赖用户目录结构**：skill 内部脚本只使用 Hermes 安装目录、skill 当前目录、临时工作目录，不使用 `~/.claude`、`~/hermes-agent`、固定 macOS 路径。
6. **输出为 Web 契约 JSON**：所有 Web 调用必须返回结构化 JSON；Markdown、PDF、Schema、llms.txt 只能作为 `artifacts[]`。
7. **产物可回传 Web**：文件类结果需要通过 Hermes Gateway 上传或以内联 artifact 返回，不能只写在用户本机目录。
8. **无 API Key 前端落盘**：不能把长期密钥写入 HTML 文件、临时表单或可被浏览器读取的静态文件。
9. **不可用能力可降级**：没有 pandoc、Chrome、CDP 时，任务不能无声失败；应返回可读错误和替代产物。

### 6.3 建议新增安装后适配接口

建议 Hermes Gateway 增加一个能力探测接口，Web 端启动和提交任务前都可以调用：

```http
GET /v1/geo/capabilities
```

建议返回：

```json
{
  "hermesVersion": "x.y.z",
  "geoSkillsVersion": "x.y.z",
  "skills": [
    {
      "name": "geo-audit",
      "version": "1.0.0",
      "status": "ready",
      "dependencies": {
        "python": "ready",
        "requests": "ready",
        "browser": "degraded",
        "pandoc": "unavailable"
      },
      "webContract": {
        "input": "geoSkillInput.v1",
        "output": "geoWebOutput.v1"
      }
    }
  ],
  "workspace": {
    "tempDirWritable": true,
    "artifactUploadSupported": true
  }
}
```

Web 端可以据此显示：

- `ready`：允许直接执行。
- `degraded`：允许执行，但提示某些产物不可用，例如 PDF、真实平台采样。
- `unavailable`：禁止提交，展示修复指引。

### 6.4 建议新增 Web 端安装适配流程

用户首次安装 Hermes 后，Web 端不应只判断“在线/离线”，而应分四步：

```text
1. 检测 Hermes 是否运行
2. 检测 API Server / Gateway 是否可用
3. 拉取内置 GEO skill manifest 与 capability matrix
4. 按当前任务类型判断 ready/degraded/unavailable
```

建议在 `HermesReadinessPanel` 的基础上扩展：

| UI 状态 | 触发条件 | 用户看到的含义 |
|---|---|---|
| 已就绪 | Hermes 在线、skill 内置、依赖满足 | 可直接执行 GEO 任务 |
| 部分可用 | 核心 audit 可用，但 PDF/CDP/浏览器能力缺失 | 可执行审计，部分产物稍后补齐 |
| 需配置 | API Server 未开启、未绑定、token 能力不可用 | 引导用户完成设置 |
| 不可执行 | skill manifest 缺失或关键脚本不可运行 | 阻止提交，提示重装/升级 Hermes |

### 6.5 对现有文档结论的修正

在“skills 随 Hermes 内置”前提下，结论应调整为：

- **不需要为普通用户设计手动 skill 安装流程**。
- **仍需要设计内置 skill 的版本校验、能力探测、依赖探测和输出契约校验**。
- **真实开发不能只依赖当前本机路径测试通过**，必须用“干净新用户环境”做验收。
- **最小可上线方案**可以先保证 `geo_quick_start`、`geo_audit`、`geo_schema`、`geo_llmstxt`、`geo_citability` 在无 pandoc、无 CDP 的机器上也能返回 JSON 和 Markdown/text artifacts。

## 7. 建议实施顺序

### P0：对齐接口契约

1. 在 Hermes GEO skill 增加统一 JSON 输出要求。
2. 增加 Hermes GEO capability manifest，明确内置 skill 版本、依赖状态、Web 输入/输出契约。
3. 在项目中新增 taskType：`geo_technical`、`geo_crawlers`、`geo_content`、`geo_platform_optimizer`。
4. 更新 `server/agent/types.ts`、`server/lib/agent-skill.ts`、`server/lib/agent-status.ts`、`server/routes/agent-tasks.ts`、`server/db/bootstrap.ts`。
5. 扩展 `normalizeGeoSkillInput()`，让这些 taskType 接收 `brandUrl`、`pageUrls`、`contentItems`、`queries`、`platforms`。

### P1：补 Web 产品能力

1. `GeoAuditView` 的 modules 可单独触发专项任务，而不是都塞进 `geo_audit`。
2. `GeoAssetsView` 增加 robots/AI crawlers、内容改写 patch、平台优化 brief。
3. 报告历史增加 `geo_compare` 的 baseline/current JSON 对比入口。
4. 内容库/文章生成页面接入 `geo_content` 和 `keyword_mining` 的结果确认流。

### P2：消除本机绑定

1. 改掉 `~/.claude`、`~/.geo-prospects`、macOS Chrome、CDP 9222 等固定假设。
2. skill 脚本统一用相对路径和 Hermes 工作目录。
3. 每个需要外部依赖的 skill 在开头做 dependency check，失败时返回结构化 error。
4. API Key 不再写入前端 HTML；改用 Hermes/后端配置读取。

## 8. 最终判断

1. **接口能否对上：**核心 GEO 能力已经能对上，但属于“基础对齐”，还不是“完整产品契约对齐”。在 skills 随 Hermes 内置的前提下，skill 缺失风险下降；最大风险变为输出格式自由、专项 skill 未登记 taskType、PDF/compare/prospect 仍依赖本地文件和外部二进制。
2. **是否满足 Web 端需求：**满足快速检测、专业审计、资产草稿这三类需求；不完全满足内容库联动、排名采样、AI 挖词、接单报价、平台端运营、稳定报告入库。
3. **是否需要补 skill：**需要。优先补 `geo_technical`、`geo_crawlers`、`geo_content`、`geo_platform_optimizer`、`geo-keyword-mining-web`、`geo-platform-ranking-sampling`、`geo-report-web`。
4. **原 skill 是否有问题：**有。问题主要不是“没有内置”，也不是算法，而是运行环境假设和 Web 集成契约不足。调整后可以做到任意新机器可用：内置 manifest、相对路径、环境探测、无状态输入、结构化输出、依赖显式检查、产物回传。
5. **按当前状态真实开发是否能适配所有新装用户电脑：**不能保证。只有在补齐 capability 探测、路径去固定化、依赖降级、JSON 输出契约、artifact 回传后，才能作为多用户新机器安装场景上线。
