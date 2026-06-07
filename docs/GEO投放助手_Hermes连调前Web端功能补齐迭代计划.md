# GEO 投放助手：Hermes 连调前 Web 端功能补齐迭代计划

版本：v1.3 Hermes 连调前补齐方案  
日期：2026-06-05  
依据：Hermes 下载站 `https://hermes.agentsyun.com/`、内置 GEO 技能培训资料、当前发布端/AgentTask/报告/发布账号代码检查  
开发口径：本阶段先完善 Web 端功能、页面位置、接口契约和数据承载能力；接口可先走 mock / direct executor / fixture output；不要求真实 Hermes run 成功，不进行最终连调  

---

## 1. 检查结论

Hermes 产品和内置 GEO 技能包已经具备独立能力，不需要 GEO 投放助手重新发明技能。当前 Web 端最需要补的是“承载与编排层”：让发布端用户能下载/绑定 Hermes、本机状态可见、按 GEO 技能提交快速检测和专业审计、查看结构化报告与证据链，并把报告结果转成下一步任务包。

当前项目已有基础：

| 能力 | 当前状态 | 连调前缺口 |
|---|---|---|
| Hermes 健康检查 | 已有 `/api/hermes/health` 和前端状态徽标 | 缺下载、绑定、技能版本、心跳解释 |
| AgentTask | 已有任务、日志、重试、取消 | taskType 未覆盖完整 GEO 技能地图 |
| Skill 记录 | 已有 `AgentSkillRun` | 缺 skill input/output contract 和 artifact 关联 |
| 本地自动化 | 已有 `LocalAutomationRun` | 缺多证据、截图、文件、风险确认 |
| GEO 分析报告 | 已有报告历史、PDF、水印、分享页 | 字段太摘要，承载不了完整审计交付物 |
| 发布账号 | 已有登录、检测、复检、解绑 | 缺 Hermes 下载绑定与技能就绪信息 |
| 排名监控 | 已有问题/关键词采样雏形 | 未与 quick-start、audit、compare 共用证据链 |

本阶段要完成的产品目标：

1. Web 端能清楚告诉用户如何下载 Hermes，并绑定当前 GEO 投放助手账号。
2. 发布端能发起 `geo-quick-start`、`geo-audit`、`geo-schema`、`geo-llmstxt` 等任务，但执行结果可先用 mock fixture。
3. 报告详情能展示分项评分、finding、artifact、行动计划和后续任务包入口。
4. 运行日志能展示 skill run、artifact、风险确认状态，为后续真实 Hermes 连调预留位置。
5. 接口契约提前定好，后续只替换 executor 和 Hermes 网关适配，不改前端业务流程。

---

## 2. 缺口总览

| 缺口 | 当前问题 | 补齐方向 | 优先级 |
|---|---|---|---|
| Hermes 下载与绑定入口 | 只有健康检查，没有用户可理解的下载/绑定流程 | 发布账号页增加 Hermes 执行器区块 | P0 |
| 技能版本状态 | 不知道本机是否安装 GEO 技能包 | 增加 skills manifest 展示与 mock 接口 | P0 |
| taskType 覆盖不足 | 只有泛化 `geo_analysis`、`index_sampling` 等 | 扩展 GEO 专项 taskType 文档与配置 | P0 |
| 快速检测入口 | 售前 quick-start 没有单独入口 | GEO 分析页新增“快速检测”页签 | P0 |
| 专业审计入口 | audit 与专项技能没有编排入口 | GEO 分析页新增“专业审计”页签 | P0 |
| 资产生成入口 | Schema、llms.txt、citability 结果无处展示 | 新增“资产生成”区块或并入审计结果 | P0 |
| 报告证据链 | 报告仅有摘要字段 | 扩展报告详情 artifact、finding、行动计划 | P0 |
| 执行前确认 | 中高风险动作缺确认层 | Agent 任务和报告动作增加风险确认设计 | P0 |
| 运行日志细节 | Agent 页偏任务列表 | 增加 skill run、artifact、确认记录位置 | P1 |
| 平台监管入口 | 平台可看 Agent，但未按 GEO skill 审计 | 平台端只补必要监管入口说明 | P1 |

---

## 3. 发布端页面功能详情

### 3.1 侧边栏与入口调整

#### 页面目标

发布端优先复用现有导航，不大改 IA。入口安排如下：

1. `GEO 分析`：承载快速检测、专业审计、报告历史。
2. `发布账号`：承载 Hermes 下载、绑定、本机执行器状态、技能版本。
3. `运行日志`：承载 AgentTask、SkillRun、Artifact、风险确认记录。
4. `订单交付`：承载从报告生成的后续任务包交付，不在本阶段扩展接单端。

#### 线框位置

```text
┌──────────────────────────────┐
│ GEO 投放助手                 │
├──────────────────────────────┤
│ [+] 快速发起任务             │
├──────────────────────────────┤
│ 工作台                       │
│ 品牌管理                     │
│ GEO 分析        ◄─ P0 新增页签│
│   - 快速检测                 │
│   - 专业审计                 │
│   - 报告历史                 │
│ 排名监控                     │
│ 内容库                       │
│ 发起订单                     │
│ 订单交付                     │
│ 运行日志        ◄─ P1 展示增强│
├──────────────────────────────┤
│ 账户资金                     │
│ 发布账号        ◄─ P0 Hermes │
│ 账户余额                     │
└──────────────────────────────┘
```

#### 实现口径

1. 不新增一级导航，避免发布端变重。
2. `GEO 分析`内部增加 tab。
3. `发布账号`顶部增加 Hermes 执行器状态区。
4. `运行日志`详情页增加连调前预留信息区。

---

### 3.2 发布账号页：Hermes 下载与本机执行器绑定

#### 页面目标

让用户知道 Hermes 是否已安装、是否已绑定当前账号、GEO 技能包是否就绪，以及当前支持平台范围。这里不是最终连调，只提供 Web 端状态和接口契约。

#### 线框位置

```text
┌────────────────────────────────────────────────────────────┐
│ 发布账号管理                                               │
│ 管理本机已登录的平台账号，供 Hermes 自动发布使用           │
├────────────────────────────────────────────────────────────┤
│ Hermes 本机执行器                                          │
│ ┌────────────┬────────────┬────────────┬──────────────┐   │
│ │ 下载状态   │ 绑定状态   │ 心跳状态   │ GEO 技能版本 │   │
│ │ Windows 可用│ 未绑定/已绑定│ 在线/离线 │ v2026.06.04 │   │
│ └────────────┴────────────┴────────────┴──────────────┘   │
│ [下载 Hermes] [生成绑定码] [检测本机执行器] [查看技能清单] │
│ macOS / Linux 即将推出，不在本阶段承诺可下载               │
├────────────────────────────────────────────────────────────┤
│ 发布账号列表                                               │
│ 平台 | 账号名 | 登录状态 | 最近检测 | 操作                 │
└────────────────────────────────────────────────────────────┘
```

#### 功能点

| 功能 | 说明 |
|---|---|
| 下载 Hermes | 跳转 `https://hermes.agentsyun.com/`，文案标注当前 Windows 下载可用 |
| 生成绑定码 | 创建一次性绑定 token，用于 Hermes 客户端绑定 GEO 账号 |
| 检测执行器 | 调用 `/api/hermes/health`，展示在线、离线、版本未知 |
| 查看技能清单 | 调用 `/api/hermes/skills`，展示内置 GEO 技能是否可用 |
| 发布账号复检 | 保留现有账号检测流程，后续使用真实 Hermes |

#### 空态 / 错误态

| 状态 | 展示 |
|---|---|
| 未安装 | 显示下载按钮和安装说明 |
| 已安装未绑定 | 显示绑定码和绑定步骤 |
| 离线 | 显示“请打开 Hermes 客户端后重试” |
| 技能缺失 | 显示缺失技能列表和“等待客户端同步” |
| macOS/Linux 用户 | 显示“即将推出”，不展示下载承诺 |

---

### 3.3 GEO 分析页：快速检测

#### 页面目标

对接 `geo-quick-start`，用于售前或低门槛检测。用户只需输入品牌名，建议补充城市、服务、官网和目标平台。

#### 线框位置

```text
┌────────────────────────────────────────────────────────────┐
│ GEO 分析                                                   │
├────────────────────────────────────────────────────────────┤
│ [快速检测] [专业审计] [资产生成] [报告历史]                │
├──────────────────────────────────────┬─────────────────────┤
│ 快速检测表单                         │  预计产物           │
│ ┌──────────────────────────────────┐ │  - 15 条 AI 问题   │
│ │ 品牌名称 *                        │ │  - 平台提及矩阵    │
│ │ 城市 / 国家                       │ │  - 初步风险等级    │
│ │ 产品 / 服务                       │ │  - 建议进入审计?   │
│ │ 官网 URL                          │ │                     │
│ │ 目标平台 [DeepSeek][豆包][Kimi]   │ │  Agent 状态         │
│ └──────────────────────────────────┘ │  queued/running/... │
│ [开始快速检测]                       │                     │
└──────────────────────────────────────┴─────────────────────┘
```

#### 功能点

| 功能 | 说明 |
|---|---|
| 最小输入 | 品牌名称必填；无官网也可检测 |
| 问题生成 | mock 阶段返回 15 条 AI 搜索问题 |
| 平台矩阵 | 展示品牌是否提及、竞品是否提及、排名/位置 |
| 下一步动作 | 可进入专业审计、生成客户报告、生成任务包 |

#### 接口

通过 `POST /api/agent-tasks` 创建任务：

```json
{
  "type": "geo_quick_start",
  "title": "云杉口腔 · GEO 快速检测",
  "brandName": "云杉口腔",
  "input": {
    "skill": "geo-quick-start",
    "brandName": "云杉口腔",
    "city": "南京",
    "services": ["种植牙", "隐形矫正"],
    "websiteUrl": "https://example.com",
    "platforms": ["DeepSeek", "豆包", "Kimi"]
  }
}
```

---

### 3.4 GEO 分析页：专业审计

#### 页面目标

对接 `geo-audit` 及专项技能，形成付费审计入口。当前阶段只定义 Web 表单、任务编排和 mock 输出，不要求真实 Hermes 执行。

#### 线框位置

```text
┌────────────────────────────────────────────────────────────┐
│ GEO 分析 > 专业审计                                        │
├──────────────────────────────────────┬─────────────────────┤
│ 审计配置                             │ 审计模块            │
│ 品牌：云杉口腔                       │ [x] 总审计          │
│ 官网 URL *                            │ [x] 技术基础        │
│ 重点页面 URLs                         │ [x] AI 爬虫访问     │
│ 竞品 URLs                             │ [x] Schema          │
│ 目标市场：中国 / 海外 / 双市场        │ [x] llms.txt        │
│ 目标平台                              │ [x] 内容可引用性    │
│                                      │ [ ] 外部品牌权威    │
│ [提交专业审计]                       │                     │
└──────────────────────────────────────┴─────────────────────┘
```

#### 功能点

| 功能 | 说明 |
|---|---|
| 审计模块选择 | 默认选择总审计、技术、爬虫、Schema、llms.txt、内容可引用性 |
| 重点页面 | 支持用户填写 1-5 个页面 URL |
| 竞品 | 支持 0-5 个竞品 URL 或名称 |
| 输出 | 总分、分项分、findings、行动计划、artifacts |
| 后续动作 | 下载报告、生成任务包、进入资产生成 |

#### taskType 与技能映射

| taskType | skill |
|---|---|
| `geo_audit` | `geo-audit` |
| `geo_technical` | `geo-technical` |
| `geo_crawlers` | `geo-crawlers` |
| `geo_schema` | `geo-schema` |
| `geo_llmstxt` | `geo-llmstxt` |
| `geo_content` | `geo-content` |
| `geo_citability` | `geo-citability` |
| `geo_platform_optimizer` | `geo-platform-optimizer` |

---

### 3.5 GEO 分析页：资产生成

#### 页面目标

展示可执行资产：Schema JSON-LD、llms.txt、内容可引用性改写、平台专项动作。这里的“生成”默认先保存为草稿，发布或嵌入网站前必须人工确认。

#### 线框位置

```text
┌────────────────────────────────────────────────────────────┐
│ GEO 分析 > 资产生成                                        │
├──────────────────────────┬─────────────────────────────────┤
│ 左侧资产类型             │ 右侧资产详情                    │
│ > Schema JSON-LD         │ ┌─────────────────────────────┐ │
│ > llms.txt               │ │ 代码/文本预览                │ │
│ > 内容改写建议           │ │                             │ │
│ > 平台专项动作           │ └─────────────────────────────┘ │
│                          │ [复制] [下载] [加入任务包]      │
│                          │ [需要人工确认后执行]            │
└──────────────────────────┴─────────────────────────────────┘
```

#### 功能点

| 功能 | 说明 |
|---|---|
| Schema 预览 | 展示 Organization、LocalBusiness、Product、SoftwareApplication 等 JSON-LD |
| llms.txt 预览 | 展示 `llms.txt` 和可选 `llms-full.txt` |
| 内容改写 | 展示低分段落、原因、改写建议 |
| 平台动作 | 展示 DeepSeek、豆包、Kimi、ChatGPT 等专项优化动作 |
| 加入任务包 | 把资产生成后续动作转为 `create_order` 任务包草稿 |

#### 风险确认

| 动作 | 风险等级 | 处理 |
|---|---|---|
| 复制代码 | 低 | 直接允许 |
| 下载文件 | 低 | 直接允许 |
| 加入任务包 | 中 | 记录来源报告 |
| 自动发布/写入网站 | 高 | 本阶段只预留，不执行 |

---

### 3.6 报告历史与报告详情：证据链升级

#### 页面目标

将报告从“摘要文本”升级为客户可交付工作台：展示分项评分、findings、artifact、截图、行动计划和下一步任务包。

#### 线框位置

```text
┌────────────────────────────────────────────────────────────┐
│ GEO 分析 > 报告历史                                        │
├───────────────┬──────────────────────────────┬─────────────┤
│ 报告列表      │ 报告正文                     │ 证据与动作  │
│ - 快速检测    │ ┌───────┬───────┬───────┐   │ Artifacts   │
│ - 专业审计    │ │总分   │提及率 │缺口数 │   │ - MD 报告   │
│ - 月度复盘    │ └───────┴───────┴───────┘   │ - PDF       │
│               │ 分项评分                     │ - 截图      │
│               │ Findings 列表                │ - JSON      │
│               │ 30 天行动计划                │             │
│               │ 平台专项建议                 │ 下一步      │
│               │                              │ [生成任务包]│
│               │                              │ [设为基线]  │
└───────────────┴──────────────────────────────┴─────────────┘
```

#### 功能点

| 功能 | 说明 |
|---|---|
| 分项评分 | AI Citability、Brand Authority、Content E-E-A-T、Technical GEO、Schema、Platform Optimization |
| Findings | 问题等级、问题描述、影响、建议、责任团队 |
| Artifacts | Markdown、PDF、截图、JSON、Schema、llms.txt |
| 行动计划 | 7 天 quick wins、30 天行动计划、月度复盘建议 |
| 下轮任务 | 从 finding 或行动计划生成任务包 |
| Baseline | 将某次审计设为月度对比基线 |

---

### 3.7 运行日志页：Skill Run 与风险确认

#### 页面目标

运行日志页不仅看 AgentTask，还要能看本次调用了哪个 GEO skill、产生了哪些 artifact、是否需要人工确认。

#### 线框位置

```text
┌────────────────────────────────────────────────────────────┐
│ 运行日志                                                   │
├───────────────┬────────────────────────────────────────────┤
│ AgentTask 列表│ 任务详情                                   │
│ type/status   │ 标题 / 状态 / 进度 / executor              │
│               │ ┌────────────────────────────────────────┐ │
│               │ │ Skill Run                              │ │
│               │ │ skillName | status | duration | output │ │
│               │ └────────────────────────────────────────┘ │
│               │ ┌────────────────────────────────────────┐ │
│               │ │ Artifacts                              │ │
│               │ │ MD / PDF / Screenshot / JSON           │ │
│               │ └────────────────────────────────────────┘ │
│               │ ┌────────────────────────────────────────┐ │
│               │ │ 风险确认                               │ │
│               │ │ riskLevel | confirmedBy | confirmedAt  │ │
│               │ └────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────┘
```

#### 功能点

| 功能 | 说明 |
|---|---|
| Skill Run | 展示 `AgentSkillRun`，包括 skillName、executor、耗时、输出摘要 |
| Artifacts | 展示任务关联的报告、截图、JSON、代码 |
| 风险确认 | 展示是否需要用户确认、确认状态和确认内容 |
| 失败归因 | 保留 `need_reauth`、`need_manual_publish`、`retry_ok` 等分类 |

---

## 4. 接口契约补充

本阶段只要求接口契约稳定，真实 Hermes run 可后置。接口可返回 mock / fixture 数据，但字段必须为后续连调预留。

### 4.1 Hermes 状态与绑定

| 接口 | 方法 | 说明 | 本阶段实现口径 |
|---|---|---|---|
| `/api/hermes/health` | GET | Hermes 网关/客户端健康状态 | 已有，补充字段契约 |
| `/api/hermes/skills` | GET | 本机已安装技能清单 | 可先返回 fixture |
| `/api/hermes/bind-token` | POST | 生成一次性绑定码 | 可先返回 mock token |

`GET /api/hermes/health` 建议返回：

```json
{
  "ok": false,
  "url": "http://127.0.0.1:8642",
  "clientVersion": null,
  "bound": false,
  "boundDevice": null,
  "executorDefault": "direct_model",
  "executorForGeoAudit": "direct_model",
  "detail": "Hermes 未连接"
}
```

`GET /api/hermes/skills` 建议返回：

```json
{
  "installed": false,
  "version": "2026.06.04",
  "skills": [
    { "name": "geo-quick-start", "status": "available", "riskLevel": "low" },
    { "name": "geo-audit", "status": "available", "riskLevel": "low" },
    { "name": "geo-schema", "status": "available", "riskLevel": "medium" },
    { "name": "geo-llmstxt", "status": "available", "riskLevel": "medium" },
    { "name": "geo-citability", "status": "available", "riskLevel": "medium" },
    { "name": "geo-report-pdf", "status": "available", "riskLevel": "low" }
  ]
}
```

### 4.2 AgentTask 提交

沿用 `POST /api/agent-tasks`，新增 taskType：

| taskType | skill | 用途 |
|---|---|---|
| `geo_quick_start` | `geo-quick-start` | 快速检测 |
| `geo_audit` | `geo-audit` | 专业审计 |
| `geo_schema` | `geo-schema` | Schema 生成/校验 |
| `geo_llmstxt` | `geo-llmstxt` | llms.txt 生成/分析 |
| `geo_citability` | `geo-citability` | 内容可引用性 |
| `geo_report_pdf` | `geo-report-pdf` | PDF 报告 |
| `geo_compare` | `geo-compare` | 月度对比 |

请求体要求：

```json
{
  "type": "geo_audit",
  "title": "云杉口腔 · GEO 专业审计",
  "brandName": "云杉口腔",
  "input": {
    "skill": "geo-audit",
    "websiteUrl": "https://example.com",
    "targetMarket": "china",
    "platforms": ["DeepSeek", "豆包", "Kimi"],
    "competitors": ["北辰口腔", "瑞美齿科"],
    "outputContract": {
      "format": "json",
      "artifacts": ["markdown", "pdf", "screenshots", "json"]
    }
  }
}
```

### 4.3 GEO 审计与 artifact

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/geo-audits/:id` | GET | 获取一次审计的结构化结果 |
| `/api/geo-audits/:id/artifacts` | GET | 获取报告、截图、JSON、Schema、llms.txt 等文件 |
| `/api/geo-audits/:id/confirm-action` | POST | 确认中高风险动作 |

`GET /api/geo-audits/:id` 建议返回：

```json
{
  "audit": {
    "id": "audit-id",
    "brandName": "云杉口腔",
    "taskId": "agent-task-id",
    "status": "succeeded",
    "totalScore": 62,
    "scores": {
      "aiCitability": 55,
      "brandAuthority": 48,
      "contentEeat": 64,
      "technicalGeo": 70,
      "schema": 40,
      "platformOptimization": 58
    },
    "findings": [],
    "actionPlan": [],
    "createdAt": "2026-06-05T00:00:00.000Z"
  }
}
```

---

## 5. 数据对象补充

### 5.1 建议新增或扩展对象

| 对象 | 说明 | 阶段 |
|---|---|---|
| `GeoAuditRun` | 一次 quick-start / audit / compare 执行 | P0 |
| `GeoAuditScore` | 总分与分项评分 | P0 |
| `GeoAuditFinding` | 问题、等级、建议、责任团队 | P0 |
| `GeoAuditArtifact` | Markdown、PDF、截图、JSON、代码文件 | P0 |
| `GeoActionConfirmation` | 风险动作确认记录 | P0 |
| `HermesDeviceBinding` | 本机 Hermes 绑定状态 | P1 |
| `HermesSkillManifest` | 本机 GEO 技能版本与状态 | P1 |

短期兼容方案：

1. 可先在 `GeoReport` 增加 `rawJson`、`artifactsJson`、`scoresJson`、`findingsJson`。
2. 可先复用 `AgentSkillRun` 记录 skillName、status、inputSummary、outputSummary。
3. 可先复用 `LocalAutomationRun.evidenceUrl`，但正式版要支持多 artifact。

### 5.2 风险等级

| riskLevel | 含义 | 示例 |
|---|---|---|
| `low` | 只读或生成报告 | quick-start、audit、report-pdf |
| `medium` | 生成可发布资产，需要人工检查 | schema、llms.txt、citability |
| `high` | 操作第三方平台或提交发布 | hermes_publish、自动填表 |

---

## 6. 平台端必要监管入口

本阶段不展开平台端重构，只要求平台能监管发布端新增任务。

```text
┌────────────────────────────────────────────┐
│ 平台端 > Agent 与自动化                    │
├────────────────────────────────────────────┤
│ Agent 任务 | Skill 运行 | Artifacts | 确认记录│
├────────────────────────────────────────────┤
│ 筛选：taskType / skillName / brand / status │
│ 列表：任务标题、品牌、skill、状态、风险等级  │
│ 操作：重试、标记人工处理、查看报告 artifact │
└────────────────────────────────────────────┘
```

平台端必须能看到：

1. `geo_quick_start`、`geo_audit`、`geo_schema` 等任务。
2. skillName、executor、状态、耗时。
3. artifact 列表。
4. 失败原因和人工处理分类。
5. 用户确认过的中高风险动作。

---

## 7. 迭代拆分

### 7.1 P0：发布端连调前最小闭环

| 编号 | 功能 | 说明 |
|---|---|---|
| P0-01 | Hermes 执行器状态区 | 发布账号页顶部展示下载、绑定、心跳、技能版本 |
| P0-02 | 快速检测页签 | GEO 分析页新增 quick-start 表单和结果 |
| P0-03 | 专业审计页签 | GEO 分析页新增 audit 表单和模块选择 |
| P0-04 | 资产生成区 | 展示 Schema、llms.txt、citability、平台动作 |
| P0-05 | 报告详情升级 | 分项评分、findings、artifacts、行动计划 |
| P0-06 | taskType 文档扩展 | 新增 GEO 专项 taskType 与 skill 映射 |
| P0-07 | artifact 契约 | 定义文件类型、预览、下载、权限 |
| P0-08 | 风险确认契约 | 定义 medium/high 动作确认和审计 |

### 7.2 P1：监管与复盘

| 编号 | 功能 | 说明 |
|---|---|---|
| P1-01 | 运行日志详情增强 | SkillRun、artifact、确认记录 |
| P1-02 | 平台端监管入口 | 平台可筛选 GEO skill 任务 |
| P1-03 | baseline 机制 | 报告可设为基线 |
| P1-04 | 月度 compare | 预留 `geo_compare` 页面和接口 |

### 7.3 P2：真实连调后增强

| 编号 | 功能 | 说明 |
|---|---|---|
| P2-01 | 真实 Hermes executor | 将 direct/mock 替换为 gateway |
| P2-02 | 客户端技能同步 | 从 Hermes 读取真实 skills manifest |
| P2-03 | 真实 artifact 回传 | 接收 Hermes 输出文件 |
| P2-04 | 自动发布动作 | 高风险确认后执行第三方发布 |

---

## 8. 验收标准

### 8.1 文档验收

1. 每个 P0 功能点都有页面入口、用户动作、接口、数据对象、空态、错误态。
2. 每个涉及前端的功能点都有 ASCII 线框图标识位置。
3. 明确说明本阶段不进行真实 Hermes 连调。
4. 明确说明接口可以先走 mock / direct executor / fixture output。
5. 明确说明 Windows 当前可下载，macOS / Linux 不承诺。

### 8.2 产品验收

1. 用户能在发布账号页看到 Hermes 下载与绑定入口。
2. 用户能在 GEO 分析页选择快速检测、专业审计、资产生成、报告历史。
3. 用户能从快速检测或专业审计任务进入报告详情。
4. 报告详情能展示 artifact、finding、分项评分、行动计划。
5. 用户能从报告生成下一步任务包。
6. 中高风险动作不会默认自动执行，必须有确认状态。

### 8.3 接口验收

1. `/api/hermes/health` 字段能支撑执行器状态展示。
2. `/api/hermes/skills` 字段能支撑技能版本和技能清单展示。
3. `POST /api/agent-tasks` 能表达新增 GEO 专项 taskType。
4. `/api/geo-audits/:id` 能返回结构化审计结果。
5. `/api/geo-audits/:id/artifacts` 能返回 artifact 列表。
6. `/api/geo-audits/:id/confirm-action` 能记录确认意图。

---

## 9. 风险与评审问题

| 风险 | 说明 | 建议 |
|---|---|---|
| 当前 executor 仍走 direct | 现有代码不真正调用 Hermes | 本阶段只定义接口，真实连调前再修 executor |
| 报告模型膨胀 | 如果所有结果都塞入 `GeoReport` 会难维护 | P0 可 JSON 兼容，正式版拆审计表 |
| artifact 权限 | 截图和报告可能含敏感信息 | 默认只允许所属品牌和平台运营查看 |
| 技能输出不稳定 | Hermes 初期输出可能变动 | 用 outputContract 固定最小 JSON |
| 页面入口过多 | 发布端可能变复杂 | 优先复用 `GEO 分析` 和 `发布账号` |
| macOS/Linux 误导 | 下载站当前 Windows 可用 | 页面明确“即将推出” |

待评审问题：

1. `Hermes 执行器` 是否未来独立成一级导航，还是长期放在 `发布账号` 页面顶部。
2. `geo-proposal` 和 `geo-prospect` 是否进入发布端，还是留给平台/销售端。
3. `geo-compare` 月度复盘是否和 `排名监控` 合并。
4. artifact 首期使用本地文件、数据库 JSON，还是直接设计对象存储接口。

---

## 10. 一句话结论

本阶段不是做 Hermes 连调，而是先把 Web 端“能承载 Hermes 和 GEO 技能包”的产品骨架补齐：下载绑定、快速检测、专业审计、资产生成、报告证据链、运行日志和风险确认。等这些接口和页面稳定后，再把 executor 从 mock/direct 切到真实 Hermes Gateway。
