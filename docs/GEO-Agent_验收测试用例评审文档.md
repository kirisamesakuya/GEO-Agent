# GEO-Agent 验收测试用例评审文档

文档版本：v1.0  
提交日期：2026-06-08  
适用项目：GEO 投放助手 / GEO-Agent  
项目路径：以实际测试环境、预发布环境或部署环境为准  
测试对象：Web 端、Server API、AgentTask 调度、Hermes Skill 调用、Direct Model 生成、结果中心与业务交付物展示  
文档性质：提交测试评审用例文档

---

## 1. 文档目的

本文档用于支撑 GEO-Agent 当前版本进入系统测试、联调验收和产品验收评审，明确：

1. 当前项目应验收的功能边界、质量目标与准入准出标准。
2. Web 端、后端、Hermes Gateway、Skill 路由、入参归一化、输出契约的测试用例。
3. 重点验证 Skill 是否能够准确生成用户想要的内容，包括“选对技能、传对参数、生成正确内容、结构化可解析、可进入业务流转”。
4. 明确 P0/P1/P2 缺陷判定标准，便于测试、产品、研发、联调团队统一口径。

---

## 2. 项目概述

GEO-Agent 是面向品牌方、平台运营方、接单方的 GEO 投放与内容交付系统。当前项目已具备：

| 模块 | 当前能力 |
|---|---|
| 品牌 / 资料 | 品牌档案、品牌线索、官网/社媒素材、知识库 |
| GEO 分析 | 快速体检、深度检测、报告历史、报告分享、PDF 交付 |
| GEO 资产 | Schema、llms.txt、AI 爬虫、可引用性、内容优化等资产生成入口 |
| 内容生成 | GEO 文章生成、参考重写、质量检查、内容结果确认 |
| 投放 / 发布 | 投放方案、发布计划、发布账号管理、Hermes 自动发布 |
| Agent 任务 | 任务创建、执行器选择、状态轮询、日志、结果中心 |
| Hermes 对接 | 健康检查、技能清单、任务路由、Gateway run 创建、输出契约校验 |
| 平台端 / 接单端 | 平台运营后台、接单工作台、订单与交付管理 |

---

## 3. 验收范围

### 3.1 本次纳入验收

| 一级范围 | 二级范围 | 验收重点 |
|---|---|---|
| Web 基础流程 | 首页、侧边栏、功能入口、品牌上下文 | 页面可达、状态清晰、入口可用 |
| GEO 快速体检 | `geo_quick_start` | 表单采集、确认方案、提交 Hermes、结果展示 |
| GEO 深度检测 | `geo_audit` | 官网约束、模块选择、页面 URL、竞品、平台参数 |
| GEO 资产生成 | `geo_schema` / `geo_llmstxt` / `geo_citability` / `geo_technical` / `geo_crawlers` / `geo_content` / `geo_platform_optimizer` | 风险确认、准确调用技能、生成对应资产 |
| 品牌资料提取 | `brand_extract` | 官网、社媒、品牌描述合并为标准入参 |
| 内容生产 | `article_generation` / `article_rewrite` | 根据用户要求生成文章，结构化质量检查 |
| 关键词 / 知识 / 排名 | `keyword_mining` / `knowledge_extract` / `index_sampling` | 输出结构可入库、可分组、可确认 |
| 投放与发布 | `campaign_plan` / `hermes_publish` / `account_verify` | 发布方案、账号校验、发布证据 |
| Agent 任务中心 | 任务状态、日志、结果中心、详情页 | pending/running/succeeded/partial/failed 流转 |
| Hermes 对接 | 健康检查、技能路由、run 创建、poll、cancel、输出解析 | 真实联调和 Mock 验证均可执行 |

### 3.2 本次不纳入验收

| 范围 | 说明 |
|---|---|
| 第三方真实平台发布成功率 SLA | 本次仅验收发布链路、发布证据与失败兜底，不承诺各平台账号风控通过率 |
| 大规模并发压测 | 本文提供基础并发用例，正式压测需另出压测方案 |
| 生产环境付费结算闭环 | 当前仅覆盖账户、订单、提现等功能可用性，不验收财务对账准确性 |
| 真实搜索引擎排名提升效果 | 本次验收产品功能和报告质量，不验收长期 SEO/GEO 效果 |

---

## 4. 关键术语

| 术语 | 定义 |
|---|---|
| taskType | GEO-Agent 内部任务类型，如 `geo_quick_start` |
| skillName | Hermes 或内部模型执行的技能名称，如 `geo-quick-start` |
| executor | 任务执行器，当前包括 `nous_hermes` 和 `direct_model` |
| geoSkillInput.v1 | GEO 技能标准入参，统一使用 `brandName`、`brandUrl`、`brandCity` 等字段 |
| geoWebOutput.v1 | GEO 技能统一输出契约，要求包含 `audit`、`data`、`metrics`、`findings`、`artifacts`、`actionPlan` |
| artifacts | 技能生成的交付物，如 markdown、json、schema_jsonld、llms_txt、pdf |
| partial | 任务完成但输出契约不完整或需要人工复核 |

---

## 5. 验收环境与设备覆盖

本项目后续会持续迭代 Hermes Desktop、Gateway、Skill 包和客户端形态，因此验收环境不应绑定单一开发机、固定操作系统、固定安装路径或固定本地端口。测试应以“用户实际安装后是否可用、可恢复、可证明效果”为准，覆盖不同设备、不同 Hermes 状态和不同发布版本。

### 5.1 环境覆盖矩阵

| 维度 | 覆盖要求 | 验收重点 |
|---|---|---|
| 操作系统 | Windows 当前稳定版；后续 Mac 版本上线后纳入 macOS Intel / Apple Silicon | 安装、启动、权限、后台运行、升级、卸载重装 |
| 设备类型 | 主流办公笔记本、台式机、低配设备、高分屏设备 | Hermes 启动稳定性、Web 交互流畅性、长任务不中断 |
| 浏览器 | Chrome、Edge；Mac 上补充 Safari 兼容性验证 | 页面可用、登录态、文件上传、结果展示、发布确认 |
| Hermes 形态 | 未安装、已安装未启动、已启动但 Gateway 未开启、Gateway 在线、版本过旧、版本升级后 | 健康检查、配置引导、任务阻断、恢复与重试 |
| Skill 包状态 | 未安装、部分缺失、版本不匹配、完整安装、升级后 | 技能清单、路由可用性、缺失提示、输出契约兼容 |
| 网络状态 | 正常网络、弱网、断网后恢复、AI 平台不可达 | 任务状态、错误提示、重试、效果复测延迟 |
| 数据环境 | 本地开发库、测试库、预发布库、生产灰度库 | 数据隔离、任务可追踪、发布证据和复测记录不丢失 |
| 发布账号状态 | 未绑定、已绑定、登录失效、权限不足、平台风控失败 | 账号校验、发布阻断、用户提示、证据链完整 |

### 5.2 Hermes 相关环境原则

| 原则 | 说明 |
|---|---|
| 不绑定固定路径 | 测试不得假设 Hermes 或项目一定安装在某个本机目录 |
| 不绑定固定端口 | 默认 Gateway / Desktop Status 地址仅作为开发参考；正式验收需支持配置化或自动发现后的行为验证 |
| 不绑定单一版本 | Hermes Desktop、Gateway、Skill 包升级后需做兼容性回归 |
| 不静默降级 | Hermes 不可用时，GEO Hermes 类任务不得伪装成功或静默切到 Mock |
| 状态可解释 | 用户必须能看懂当前是未安装、未启动、未开启 API、技能缺失、等待审批还是执行失败 |
| 结果可追踪 | 不同设备、不同系统上创建的任务都应能在结果中心追踪状态、日志、输出和证据 |

### 5.3 推荐测试组合

| 组合 ID | 系统 / 设备 | Hermes 状态 | 预期 |
|---|---|---|---|
| ENV-001 | Windows 主流办公设备 | Hermes 完整安装且 Gateway 在线 | 全量核心链路可执行 |
| ENV-002 | Windows 低配设备 | Hermes 在线，长任务执行 | 任务可持续追踪，UI 不明显卡死 |
| ENV-003 | Windows | 未安装 Hermes | 明确安装引导，Hermes 任务不误提交 |
| ENV-004 | Windows | 已安装但未启动 | 明确启动引导，恢复后可继续提交 |
| ENV-005 | Windows | 已启动但 API / Gateway 不可用 | 明确提示开启本机连接能力 |
| ENV-006 | Windows | Skill 包缺失或版本不匹配 | 技能清单提示缺失，提交被阻断或进入可解释失败 |
| ENV-007 | macOS Apple Silicon | Hermes Mac 版本上线后完整安装 | 安装、授权、Gateway、Skill 执行、发布复测链路通过 |
| ENV-008 | macOS Intel | Hermes Mac 版本上线后完整安装 | 同 ENV-007，补充兼容性验证 |
| ENV-009 | 任一系统 | Hermes 升级后 | 历史任务可读，新任务可执行，Skill 路由不丢失 |
| ENV-010 | 任一系统 | 网络中断后恢复 | 任务状态可恢复，失败任务可重试，效果复测不丢计划 |

### 5.4 项目内研发自测命令

以下命令仅作为当前项目代码层面的研发自测参考，不代表完整设备验收，也不能替代 Hermes 多系统、多版本、多安装状态测试：

```bash
npx tsx scripts/verify-geo-skill-input.ts
npx tsx scripts/verify-skill-mocks.ts
```

验证结果：

| 命令 | 结果 |
|---|---|
| `npx tsx scripts/verify-geo-skill-input.ts` | 通过，覆盖 `geo_quick_start`、`geo_audit`、`geo_schema`、`brand_extract`、`geo_technical`、`geo_crawlers`、`geo_content`、`geo_platform_optimizer`、`geo_compare` 入参归一化 |
| `npx tsx scripts/verify-skill-mocks.ts` | 通过，22 项 Skill Mock 均可生成非空输出 |

---

## 6. 准入标准

测试开始前需满足：

| 编号 | 准入项 | 标准 |
|---|---|---|
| QA-IN-001 | 代码可启动 | `npm run dev` 或分离服务可正常启动 |
| QA-IN-002 | 构建可通过 | `npm run build` 不出现阻断错误 |
| QA-IN-003 | 数据库可用 | Prisma Client 可连接，核心 demo 数据可初始化 |
| QA-IN-004 | Skill 入参验证通过 | `npx tsx scripts/verify-geo-skill-input.ts` 通过 |
| QA-IN-005 | Skill Mock 验证通过 | `npx tsx scripts/verify-skill-mocks.ts` 通过 |
| QA-IN-006 | Hermes 健康检查可区分状态 | 在线、desktop_only、offline 状态均有明确提示 |
| QA-IN-007 | Skill 路由明确 | taskType 到 skillName 映射可在代码或 DB `skill_routes` 中追踪 |

---

## 7. 准出标准

| 缺陷级别 | 准出要求 |
|---|---|
| P0 | 0 个未关闭 |
| P1 | 核心链路 0 个未关闭；非核心 P1 需有明确规避方案和上线审批 |
| P2 | 可遗留，但需录入缺陷系统并排期 |
| P3 | 可作为体验优化进入后续迭代 |

核心链路准出要求：

1. 用户提交任一已开放 Skill 任务时，系统必须能准确路由到预期 skillName。
2. Hermes / Direct Model 返回内容后，必须能保存到 AgentTask output。
3. GEO Hermes 类任务必须执行 `geoWebOutput.v1` 校验；缺字段时进入 `partial` 并提示人工复核。
4. 文章、关键词、知识抽取、投放方案等内容类任务必须能按用户意图生成业务可读交付物。
5. AI 撰写文章发布完成后，必须能建立发布前 baseline、发布证据、发布后 AI 平台复测计划和效果判断；这是用户为效果付费的核心验收链路。
6. 不允许出现“任务成功但用户看不到结果”“调用错技能”“官网 URL 被替换成其他域名”“文章已发布但无法证明是否被其他 AI 产品检索/提及”等 P0 问题。

---

## 8. 测试策略

| 层级 | 测试方式 | 目标 |
|---|---|---|
| 静态配置 | 检查 `AgentTaskType`、`TASK_SKILL_MAP`、`skill_routes` | 防止 taskType 与 skillName 错配 |
| 单元脚本 | 执行入参归一化、Mock 输出验证脚本 | 防止字段别名、输出为空、结构缺失 |
| API 测试 | 调用 agent task、Hermes health、skills、results API | 验证后端状态流转 |
| UI 测试 | 浏览器手工 / 自动化检查页面流程 | 验证用户路径可达、提示明确 |
| 真实联调 | 打开 Hermes Gateway 提交真实 run | 验证本机 Agent 与技能执行 |
| 内容评审 | 对 Skill 生成内容进行准确性、完整性、可执行性评分 | 验证“用户想要的内容”是否被生成 |
| 异常测试 | Hermes 离线、输出非 JSON、技能缺失、审批等待 | 验证兜底和错误提示 |

---

## 9. Skill 路由验收矩阵

| 用例 ID | taskType | 期望 skillName | executor | 前端入口 | 优先级 |
|---|---|---|---|---|---|
| SKR-001 | `geo_quick_start` | `geo-quick-start` | `nous_hermes` | GEO 分析 · 首次体检 | P0 |
| SKR-002 | `geo_audit` | `geo-audit` | `nous_hermes` | GEO 分析 · 深度检测 | P0 |
| SKR-003 | `geo_schema` | `geo-schema` | `nous_hermes` | GEO 资产生成 | P0 |
| SKR-004 | `geo_llmstxt` | `geo-llmstxt` | `nous_hermes` | GEO 资产生成 | P0 |
| SKR-005 | `geo_citability` | `geo-citability` | `nous_hermes` | GEO 资产生成 | P0 |
| SKR-006 | `geo_technical` | `geo-technical` | `nous_hermes` | API / 后续资产入口 | P1 |
| SKR-007 | `geo_crawlers` | `geo-crawlers` | `nous_hermes` | API / 后续资产入口 | P1 |
| SKR-008 | `geo_content` | `geo-content` | `nous_hermes` | 内容优化 / 后续资产入口 | P1 |
| SKR-009 | `geo_platform_optimizer` | `geo-platform-optimizer` | `nous_hermes` | 平台专项优化 | P1 |
| SKR-010 | `brand_extract` | `geo-brand-mentions` | `nous_hermes` | 品牌起步 / 资料提取 | P0 |
| SKR-011 | `geo_report_pdf` | `geo-report-pdf` | `nous_hermes` | 报告页 | P1 |
| SKR-012 | `geo_compare` | `geo-compare` | `nous_hermes` | 报告历史 | P1 |
| SKR-013 | `geo_report` | `geo-report-web` | `nous_hermes` | 报告汇总 | P1 |
| SKR-014 | `geo_proposal` | `geo-proposal-web` | `nous_hermes` | 商务方案 | P1 |
| SKR-015 | `geo_prospect` | `geo-prospect-web` | `nous_hermes` | 线索拓展 | P1 |
| SKR-016 | `article_generation` | `geo.article.generate` 或 DB 覆盖路由 | `direct_model` / `nous_hermes` | 生成 GEO 文章 | P0 |
| SKR-017 | `article_rewrite` | `geo.article.rewrite` 或 DB 覆盖路由 | `direct_model` / `nous_hermes` | 参考重写 | P0 |
| SKR-018 | `keyword_mining` | `geo.keyword.mine` 或 `geo-keyword-mining-web` | `direct_model` / `nous_hermes` | 关键词库 | P1 |
| SKR-019 | `knowledge_extract` | `geo.knowledge.extract` 或 `geo-knowledge-extract-web` | `direct_model` / `nous_hermes` | 知识库 | P1 |
| SKR-020 | `index_sampling` | `geo.index.sample` 或 `geo-platform-ranking-sampling` | `direct_model` / `nous_hermes` | 排名监控 | P1 |
| SKR-021 | `campaign_plan` | `geo.campaign.plan` 或 `geo-campaign-plan-web` | `direct_model` / `nous_hermes` | 发布任务 | P0 |
| SKR-022 | `website_preview` | `geo.website.preview` 或 `geo-website-preview-web` | `direct_model` / `nous_hermes` | 创建网站 | P1 |
| SKR-023 | `hermes_publish` | `hermes.publish.auto` 或 `hermes-publish-web` | `nous_hermes` | 文章结果 · 确认发布 | P0 |
| SKR-024 | `account_verify` | `geo.account.verify` 或 `account-verify-web` | `nous_hermes` | 发布账号管理 | P0 |

验收方法：

1. 检查 `server/lib/agent-skill.ts` 的 `TASK_SKILL_MAP`。
2. 检查数据库 `SystemConfig.skill_routes` 是否有启用覆盖。
3. 创建任务后检查 AgentTask 的 `type`、`executor`、`externalRunId`、Hermes metadata.skill。
4. UI 技能清单应展示已注册且可用的技能。

---

## 10. Skill 入参归一化专项用例

| 用例 ID | 场景 | 输入 | 预期输出 | 优先级 |
|---|---|---|---|---|
| SIN-001 | 官网旧字段兼容 | `website` / `websiteUrl` / `url` | 统一输出 `brandUrl`，不保留旧字段 | P0 |
| SIN-002 | 城市旧字段兼容 | `city` / `targetMarket` | 统一输出 `brandCity` | P0 |
| SIN-003 | 产品服务旧字段兼容 | `services` / `keywords` | 统一输出 `productNames` | P0 |
| SIN-004 | 品牌描述旧字段兼容 | `description` | 统一输出 `brandDesc` | P0 |
| SIN-005 | 社媒链接合并 | `socialLink` | 合并到 `sourceMaterials[]`，不保留 `socialLink` | P0 |
| SIN-006 | 默认平台 | 未传 `platforms` | 默认 `["DeepSeek","豆包","Kimi"]` | P1 |
| SIN-007 | URL-only 技能瘦身 | `geo_schema` / `geo_llmstxt` / `geo_citability` | 仅输出品牌、官网、素材、确认等必要字段 | P1 |
| SIN-008 | `geo_audit` 页面 URL 限制 | `pageUrls` 超过 50 个 | 最多保留 50 个 | P1 |
| SIN-009 | `geo_content` 内容项保留 | `contentItems[]` | 保留 `id/title/body/url` | P1 |
| SIN-010 | `geo_compare` 报告对象保留 | `baselineReport/currentReport` | 完整透传报告对象 | P1 |

执行命令：

```bash
npx tsx scripts/verify-geo-skill-input.ts
```

通过标准：

1. 脚本退出码为 0。
2. 输出中所有场景均显示 OK。
3. 标准化 payload 不包含 `website`、`websiteUrl`、`city`、`services`、`description`、`targetMarket`、`socialLink` 等旧字段。

---

## 11. Skill 输出契约专项用例

### 11.1 GEO 类输出契约

GEO Hermes 类任务必须符合 `geoWebOutput.v1`：

```json
{
  "audit": {},
  "data": {},
  "metrics": {},
  "findings": [],
  "artifacts": [],
  "actionPlan": []
}
```

| 用例 ID | 场景 | 输入 / 模拟输出 | 预期 | 优先级 |
|---|---|---|---|---|
| SOUT-001 | 完整 JSON 输出 | Hermes 返回标准 JSON | `contractValid=true`，任务 `succeeded` | P0 |
| SOUT-002 | fenced JSON 输出 | Hermes 返回 ```json 包裹内容 | 正确提取 JSON，并保留 `rawText` | P0 |
| SOUT-003 | 说明文字 + JSON | Hermes 返回说明文字和内嵌 JSON | 正确提取 JSON | P0 |
| SOUT-004 | 非 JSON 文本 | Hermes 仅返回纯文本 | 输出 `summary/rawText`，GEO 类任务进入 `partial` | P0 |
| SOUT-005 | 缺少 `findings` | 返回 audit/data/metrics 但无 findings | `contractValid=false`，提示缺失字段 | P0 |
| SOUT-006 | artifacts 来自 runData | output 无 artifacts，runData 有 artifacts | 合并 artifacts 后校验 | P1 |
| SOUT-007 | 空对象输出 | `{}` | 任务进入 `partial`，结果中心提示人工复核 | P0 |

### 11.2 业务类输出契约

| 用例 ID | taskType | 必须输出 | 预期展示 | 优先级 |
|---|---|---|---|---|
| BOUT-001 | `article_generation` | `articles[]`、`qualityChecks` | 文章 Markdown 可读，隐藏原始 JSON | P0 |
| BOUT-002 | `article_rewrite` | `articles[]`、`qualityChecks` | 重写结果符合平台、字数、语气要求 | P0 |
| BOUT-003 | `keyword_mining` | `suggestions[]` | 按 brand/industry/geo/competitor/longtail 分组 | P1 |
| BOUT-004 | `knowledge_extract` | `entries[]` | 知识条目可入库 | P1 |
| BOUT-005 | `index_sampling` | `results[]` | 排名采样结果可展示 | P1 |
| BOUT-006 | `campaign_plan` | `packages[]` | 预算、渠道、执行项完整 | P0 |
| BOUT-007 | `website_preview` | `previewHtml`、`modules` | 网页预览可打开 | P1 |
| BOUT-008 | `hermes_publish` | `publishLink`、`publishedAt`、`platform` | 发布证据可追溯 | P0 |
| BOUT-009 | `account_verify` | `verified`、`platform`、`accountName` | 账号状态更新 | P0 |

执行命令：

```bash
npx tsx scripts/verify-skill-mocks.ts
```

通过标准：

1. 22 项 Skill Mock 均可生成非空对象。
2. 输出字段至少包含该 taskType 的核心业务字段。
3. GEO 类输出至少包含 `audit/data/metrics/findings/artifacts/actionPlan` 中的关键字段，正式联调必须满足完整契约。

---

## 12. Skill 质量与 GEO 效果专项验收

本章是核心验收。GEO-Agent 的 Skill 质量不能只看“是否生成了一篇文章”或“是否返回了 JSON”，还必须验证生成内容能否服务最终业务效果：AI 撰写的文章发布完整后，其他 AI 产品在目标问题下能够检索、引用或提及品牌，并且系统能形成可审计的发布前后证据链。用户为效果付费，效果验收必须成为 P0。

### 12.1 Skill 质量评价维度

每个内容生成类或分析生成类 Skill 按 100 分评价：

| 维度 | 权重 | 合格标准 |
|---|---:|---|
| 意图匹配 | 15 | 能识别用户真正要做的是审计、生成资产、写文章、挖词、发布或账号校验 |
| 参数准确 | 15 | 使用用户指定品牌、官网、城市、产品、平台，不替换、不臆造 |
| 内容完整 | 15 | 输出覆盖用户要求的数量、模块、字数、平台、交付格式 |
| GEO 可检索性 | 20 | 内容包含可被 AI 产品检索、摘引、复述的品牌事实、短答案、FAQ、权威来源与发布链接 |
| 效果闭环 | 15 | 生成内容能关联发布前排名缺口、发布记录、复测计划和发布后 AI 提及率判断 |
| 专业质量 | 10 | 结论有依据，建议可执行，符合 GEO / 内容投放业务语境 |
| 结构可解析 | 10 | 输出满足 JSON / artifacts / business fields 契约 |
| 安全与边界 | 5 | 风险资产需提示确认，不伪造官网审计，不虚构发布成功或 AI 检索结果 |

准出阈值：

| 任务类型 | 单用例最低分 | 平均分 |
|---|---:|---:|
| P0 核心 Skill | >= 85 | >= 90 |
| P1 Skill | >= 80 | >= 85 |
| P2 Skill | >= 75 | >= 80 |

### 12.2 Skill 效果质量红线

以下任一问题出现即判定为 P0，不允许准出：

1. 文章生成成功但未保留发布前 baseline，无法证明发布前 AI 平台是否提及品牌。
2. 文章发布成功但未写入发布链接、发布时间、发布平台、发布账号或发布证据。
3. 发布后未创建 T+7/T+14/T+30 或产品约定周期的 AI 平台复测计划。
4. 复测结果没有记录目标问题、目标平台、命中数、样本数、品牌提及率、判断结论。
5. 系统把“文章已发布”直接等同于“GEO 有效果”，没有真实采样证据。
6. Skill 输出虚构“已被 DeepSeek/豆包/Kimi 检索到”但没有回答快照、引用片段或采样记录。
7. 内容生成时没有围绕目标 AI 问题补缺，导致文章与排名监控缺口无关。

### 12.3 文章发布后 AI 可检索性核心验收

验收目标：AI 撰写文章发布完整后，目标 AI 产品在用户指定问题下能够检索、引用或提及品牌，并能在系统中形成可审计证据链。

| 用例 ID | 场景 | 前置条件 | 操作 | 预期 | 优先级 |
|---|---|---|---|---|---|
| GEO-EFF-001 | 发布前 baseline 建立 | 排名监控已有目标问题采样，品牌提及率低于目标 | 从排名监控选择结果，点击生成补缺文章 | 内容项写入 `effectBaseline`，包含目标问题、目标 AI 平台、发布前品牌提及率、竞品提及、回答快照 | P0 |
| GEO-EFF-002 | 文章围绕排名缺口生成 | baseline 问题为“南京种植牙哪家靠谱” | 生成文章 | 文章标题、摘要、FAQ、短答案段必须围绕该问题补缺；不得生成泛泛品牌软文 | P0 |
| GEO-EFF-003 | 文章具备 AI 可摘引结构 | 用户要求发布到小红书/知乎/公众号 | 检查生成文章 | 包含 80 字以内可摘引结论句、FAQ、品牌事实、服务范围、适用人群、来源/官网链接 | P0 |
| GEO-EFF-004 | 发布证据写入 | 文章审核后执行发布 | 完成发布 | `effectVerification.publishUrl/publishedAt/publishRecordId` 写入；发布记录可追踪平台、账号、链接 | P0 |
| GEO-EFF-005 | 自动创建复测计划 | 发布完成 | 检查复测计划 | 自动创建 T+7/T+14/T+30 复测计划，目标问题和 AI 平台继承 baseline | P0 |
| GEO-EFF-006 | T+7 观察期复测 | 到达 T+7 或手动触发复测 | 执行排名采样 | 记录 hitCount、sampleCount、brandMentionRate；若高于 baseline，判断 `observing` | P0 |
| GEO-EFF-007 | T+30 效果判定 | 到达 T+30 且采样完成 | 执行复测 | 品牌提及率较 baseline 提升 > 10 个百分点时判断 `effective`；无提升判断 `no_change` | P0 |
| GEO-EFF-008 | 多平台效果拆分 | baseline 包含 DeepSeek、豆包、Kimi | 复测 | 每个平台均保留 query、回答快照、是否提及品牌、引用片段或摘要 | P0 |
| GEO-EFF-009 | 未被检索到的兜底 | T+30 无明显提升 | 查看结果 | 系统不得伪造效果，需输出 `no_change` 和下一步优化建议 | P0 |
| GEO-EFF-010 | 效果报告汇总 | 多篇文章已有复测 | 查看报告 / 效果面板 | 展示发布前后提及率变化、有效/观察/无变化状态、证据链接 | P1 |

通过标准：

1. 每篇由排名缺口触发的 AI 文章，都能追溯到发布前 baseline。
2. 每篇已发布文章，都能追溯到发布记录和发布 URL。
3. 每篇进入效果验证的文章，都有复测计划和至少一个复测 checkpoint。
4. 系统能区分 `pending`、`observing`、`effective`、`no_change`，不得只展示“已发布”。
5. 效果结论必须基于采样数据，不得由 Skill 自行宣称。

### 12.4 AI 产品检索采样口径

| 采样项 | 标准 |
|---|---|
| 目标平台 | 默认覆盖用户选择的平台；常用为 DeepSeek、豆包、Kimi、腾讯元宝等 |
| 目标问题 | 来自排名监控缺口、用户指定问题或文章生成任务的 `targetQuestions` |
| 样本数 | 单篇文章每个平台至少 3 个问题；核心客户建议每个平台 5-10 个问题 |
| 命中判定 | AI 回答中明确出现品牌名、品牌别名、官网域名、发布文章标题或可验证引用链接 |
| 引用判定 | AI 回答中出现发布文章链接、文章标题、官网链接、结构化 FAQ 摘要或明显引用片段 |
| 竞品记录 | 回答中出现竞品时需记录竞品名和上下文 |
| 快照证据 | 保留平台、问题、完整回答摘要、命中状态、引用片段、采样时间 |
| 观察周期 | 发布后 T+7、T+14 为观察期，T+30 作为首个效果判定点 |
| 有效判定 | T+30 品牌提及率较 baseline 提升超过 10 个百分点，或达到合同/套餐约定阈值 |
| 无效判定 | T+30 无提升，且无引用证据，判定 `no_change` 并生成优化建议 |

### 12.5 效果付费验收口径

用户为效果付费时，验收不能只看文章数量和发布链接，应按以下口径交付：

| 交付项 | 必须包含 | 优先级 |
|---|---|---|
| 发布前诊断 | 目标问题、目标 AI 平台、发布前提及率、竞品提及、回答快照 | P0 |
| 内容交付 | 文章标题、正文、关键词、AI 可摘引段、FAQ、发布平台适配 | P0 |
| 发布证明 | 发布链接、平台、账号、发布时间、发布记录 ID | P0 |
| 检索复测 | T+7/T+14/T+30 复测计划与结果 | P0 |
| 效果判断 | `observing/effective/no_change`，并说明判断依据 | P0 |
| 优化建议 | 未命中时给出下一轮内容、外链、官网结构、Schema、llms.txt 优化动作 | P1 |

### 12.6 内容准确性通用用例

| 用例 ID | 场景 | 用户输入 | 预期 | 优先级 |
|---|---|---|---|---|
| ACC-001 | 品牌名必须一致 | 品牌：云杉齿科 | 输出不得变成其他品牌 | P0 |
| ACC-002 | 官网 URL 不得替换 | 官网：`https://www.example-dental.com` | 技术审计、Schema、llms.txt 必须基于该 URL；无法访问时说明失败，不得搜索替代域名 | P0 |
| ACC-003 | 城市与行业必须保留 | 南京 / 口腔医疗 | 报告和文章应围绕南京口腔医疗语境 | P0 |
| ACC-004 | 平台选择必须生效 | 平台：DeepSeek、豆包、Kimi | 输出需分别呈现平台维度或说明平台策略 | P1 |
| ACC-005 | 产品服务必须覆盖 | 种植牙、隐形矫正、儿童齿科 | 内容和建议至少覆盖用户指定服务，不遗漏核心服务 | P0 |
| ACC-006 | 数量要求必须满足 | 生成 3 篇文章 | 输出 `articles.length=3` | P0 |
| ACC-007 | 字数要求必须接近 | 每篇 1200 字 | 单篇字数允许误差 ±20%，明显不足为失败 | P1 |
| ACC-008 | 语气要求必须匹配 | 语气：自然、低营销 | 内容不得出现强硬广告腔、大量夸张承诺 | P1 |
| ACC-009 | 结构要求必须匹配 | 要 FAQ / 行动建议 / 资产代码 | 输出必须有对应结构或 artifact | P0 |
| ACC-010 | 敏感边界 | 医疗、金融等行业 | 不输出保证疗效、虚假排名、违规承诺 | P0 |
| ACC-011 | 可检索目标必须写入 | 目标问题：南京种植牙哪家靠谱 | 文章必须包含可被 AI 摘引的短答案和品牌事实 | P0 |
| ACC-012 | 效果证据不得虚构 | 发布后未复测 | 不得显示“已被 AI 收录/推荐”，只能显示“待复测/观察中” | P0 |

### 12.7 GEO 快速体检准确性用例

| 用例 ID | 输入 | 操作 | 预期输出 | 优先级 |
|---|---|---|---|---|
| QSA-001 | 品牌名 + 官网 + 城市 + 服务 | 提交 `geo_quick_start` | 生成快速 GEO 体检摘要、总分、主要问题、行动建议 | P0 |
| QSA-002 | 仅品牌名，无官网 | 提交快速体检 | 可做品牌可见度初评，但不得伪造官网技术检测结果 | P0 |
| QSA-003 | 官网不可访问 | 提交快速体检 | 报告明确 URL 不可访问，并给出修复建议 | P0 |
| QSA-004 | 指定平台 | 选择 DeepSeek、豆包 | 报告包含平台维度分析，不出现未选平台作为主结论 | P1 |
| QSA-005 | 确认方案后提交 | 点击确认方案再提交 | 创建 AgentTask，状态进入 queued/running，结果中心可见 | P0 |

### 12.8 GEO 深度审计准确性用例

| 用例 ID | 输入 | 操作 | 预期输出 | 优先级 |
|---|---|---|---|---|
| GAD-001 | 官网 + pageUrls + modules | 提交 `geo_audit` | 输出模块化审计报告，覆盖 technical/schema/llmstxt/content | P0 |
| GAD-002 | 竞品列表 | 提交深度审计 | 输出包含竞品对比，不把竞品当作本品牌 | P1 |
| GAD-003 | pageUrls 超限 | 输入 60 个 URL | 仅提交前 50 个或 UI 阻断提示 | P1 |
| GAD-004 | 空 modules | 提交默认审计 | 使用默认模块并在报告中说明范围 | P1 |
| GAD-005 | 输出缺少 actionPlan | 模拟 Hermes 不完整输出 | 任务进入 partial，提示缺少 actionPlan | P0 |

### 12.9 GEO 资产生成准确性用例

| 用例 ID | Skill | 用户目标 | 预期输出 | 优先级 |
|---|---|---|---|---|
| AST-001 | `geo_schema` | 生成官网 Schema | artifacts 包含 `schema_jsonld`，内容为合法 JSON-LD，品牌名和 URL 正确 | P0 |
| AST-002 | `geo_llmstxt` | 生成 llms.txt | artifacts 包含 `llms_txt`，正文包含品牌、官网、核心服务、AI 可读摘要 | P0 |
| AST-003 | `geo_citability` | 分析内容可引用性 | 输出可引用性评分、缺口、改写建议 | P1 |
| AST-004 | `geo_technical` | 检查技术基础 | 输出 SSR、robots、sitemap、结构化数据等检查项 | P1 |
| AST-005 | `geo_crawlers` | 检查 AI 爬虫访问 | 输出爬虫可访问结论、阻断风险、robots 建议 | P1 |
| AST-006 | `geo_content` | 给现有内容做 GEO 改写 | 输出内容优化 Brief 或改写补丁，不改变用户品牌事实 | P1 |
| AST-007 | `geo_platform_optimizer` | 针对 DeepSeek/豆包优化 | 输出平台专项 query、内容结构和引用建议 | P1 |
| AST-008 | 风险确认 | 生成会影响官网的资产 | UI 必须出现风险确认；未确认不得提交 | P0 |

### 12.10 文章生成准确性用例

| 用例 ID | 用户输入 | 预期输出 | 优先级 |
|---|---|---|---|
| ART-001 | 小红书，种草，自然语气，3 篇，1200 字 | 生成 3 篇小红书风格文章，标题、正文、关键词、质量检查完整 | P0 |
| ART-002 | 知乎，专业长文，1500 字 | 输出问答/长文结构，论据充分，营销感较弱 | P0 |
| ART-003 | 参考重写 | 保留参考结构但不得逐字复制，输出原创表达 | P0 |
| ART-004 | 指定关键词 | 文章自然包含关键词，不堆砌 | P1 |
| ART-005 | 医疗行业禁忌 | 不承诺疗效、不虚构资质、不夸大效果 | P0 |
| ART-006 | 数量为 0 或非法 | UI 或 API 阻断，提示数量范围 | P1 |
| ART-007 | 从排名缺口生成补缺文章 | 文章 `generationMeta/effectBaseline` 关联该缺口，正文围绕缺口问题生成 | P0 |
| ART-008 | 文章可被 AI 引用 | 至少包含 1 段 80 字以内结论、3 个 FAQ、品牌官网/服务事实、非广告化表述 | P0 |
| ART-009 | 发布后进入效果验证 | 发布完成后生成 `effectVerification`，并展示 T+7/T+14/T+30 复测状态 | P0 |

### 12.11 关键词与知识抽取准确性用例

| 用例 ID | taskType | 输入 | 预期输出 | 优先级 |
|---|---|---|---|---|
| KNO-001 | `keyword_mining` | 品牌 + 行业 | 输出 suggestions，并可归类到品牌词、行业词、地域词、竞品词、长尾词 | P1 |
| KNO-002 | `keyword_mining` | 输出在 artifacts JSON 中 | 系统能从 artifacts 解析 suggestions | P1 |
| KNO-003 | `knowledge_extract` | 品牌资料 / 行业 | 输出 entries，可进入知识库 | P1 |
| KNO-004 | `index_sampling` | 关键词 + 平台 | 输出 results，包含平台、query、是否提及、排名或证据 | P1 |

### 12.12 投放与发布准确性用例

| 用例 ID | taskType | 输入 | 预期输出 | 优先级 |
|---|---|---|---|---|
| PUB-001 | `campaign_plan` | 目标 + 预算 8000-20000 | 输出 packages，预算不越界，包含渠道、周期、交付物 | P0 |
| PUB-002 | `hermes_publish` | 平台 + 内容 ID + 用户确认 | 返回 publishEvidence，包含链接、时间、平台、账号 | P0 |
| PUB-003 | `hermes_publish` | 未用户确认 | 不得自动发布，进入待确认或阻断 | P0 |
| PUB-004 | `account_verify` | 平台 + 账号 | 返回 verified/session/accountName，账号状态更新 | P0 |
| PUB-005 | 账号失效 | 发布前校验失败 | 发布阻断并提示重新登录或绑定 | P0 |
| PUB-006 | 发布后效果验证 | 已有关联 baseline 的文章发布成功 | 自动写入发布链接并创建复测计划，不允许只停留在“发布完成” | P0 |

---

## 13. Web UI 功能用例

| 用例 ID | 模块 | 步骤 | 预期 | 优先级 |
|---|---|---|---|---|
| UI-001 | 首页 | 打开 Web 首页 | 页面加载成功，核心入口可见 | P0 |
| UI-002 | 侧边栏 | 切换 GEO 分析、内容、发布、结果中心 | 路由切换正常，无白屏 | P0 |
| UI-003 | 品牌上下文 | 切换品牌 | 页面展示和提交 payload 使用当前品牌 | P0 |
| UI-004 | Hermes 控制台 | 打开本机 Hermes 页面 | 展示健康状态、技能清单、配置引导 | P0 |
| UI-005 | 技能清单 | 点击技能清单 | 展示已注册技能，缺失技能有提示 | P1 |
| UI-006 | 快速体检 | 填写表单并确认方案 | 确认态、提交态、进度态清晰 | P0 |
| UI-007 | 资产生成 | 点击生成预览 | 出现风险确认弹窗 | P0 |
| UI-008 | 结果中心 | 查看运行中任务 | 展示状态、进度、日志、详情入口 | P0 |
| UI-009 | 结果详情 | 打开成功任务 | 展示业务交付物，原始 JSON 不干扰主要阅读 | P0 |
| UI-010 | 失败任务 | 打开失败任务 | 展示用户可理解的错误信息和重试入口 | P0 |
| UI-011 | 移动端 | 375px 宽度访问核心页面 | 不出现文字重叠、按钮不可点、横向严重溢出 | P2 |

---

## 14. API 与任务状态用例

| 用例 ID | 场景 | 操作 | 预期 | 优先级 |
|---|---|---|---|---|
| API-001 | 创建任务 | POST `/api/agent-tasks` | 返回 taskId，状态 `pending/queued` | P0 |
| API-002 | Hermes run 创建 | executor 为 `nous_hermes` | 返回 externalRunId，metadata 包含 skill 和 input | P0 |
| API-003 | 轮询 running | Hermes 返回 running/tool.started | AgentTask 进度更新为 45% 左右 | P1 |
| API-004 | 轮询 tool.completed | Hermes 返回 tool.completed | 进度更新为 70% 左右 | P1 |
| API-005 | 轮询 completed | Hermes 返回 completed + output | AgentTask `succeeded` 或 `partial` | P0 |
| API-006 | 轮询 failed | Hermes 返回 failed/error | AgentTask `failed`，保存 errorMessage | P0 |
| API-007 | 取消任务 | 调用 cancel | Hermes stop best-effort，任务进入 canceled 或保留明确日志 | P1 |
| API-008 | 缺 externalRunId | poll Hermes 任务但无 runId | 任务 failed，提示 Hermes run 未创建 | P0 |
| API-009 | Hermes 离线 | 关闭 8642 后提交 | 阻断或 failed，提示打开 Hermes，不静默降级 | P0 |
| API-010 | 审批等待 | Hermes 返回 waiting_for_approval | UI 展示等待审批或自动批准后的 running | P1 |

---

## 15. 异常与安全用例

| 用例 ID | 场景 | 操作 | 预期 | 优先级 |
|---|---|---|---|---|
| EXC-001 | Hermes 未安装 | 打开 Hermes 控制台 | 显示安装/启动引导 | P0 |
| EXC-002 | Hermes Desktop 开启但 API Server 未开 | 健康检查 | 状态为 desktop_only，提示开启 8642 | P0 |
| EXC-003 | skill 缺失 | 删除或禁用目标 skill | 提交被阻断或任务失败，错误为 skill_missing | P0 |
| EXC-004 | 输出解析失败 | Hermes 返回非 JSON | GEO 类任务 partial，提示人工复核 | P0 |
| EXC-005 | 用户未确认高风险资产 | 直接提交 Schema / llms.txt | 不创建任务 | P0 |
| EXC-006 | URL 注入 | 输入非 http(s) URL | 前端或后端阻断 | P1 |
| EXC-007 | 大文本输入 | 粘贴超长参考文 | 不白屏；超限需提示或截断策略明确 | P1 |
| EXC-008 | 重复提交 | 快速连续点击提交 | 不创建重复任务，或有明确幂等/禁用状态 | P1 |
| EXC-009 | 权限越权 | 普通用户访问平台后台 API | 返回 401/403 | P0 |
| EXC-010 | 发布未授权账号 | 使用未绑定账号发布 | 阻断并提示绑定/登录 | P0 |

---

## 16. 回归用例

| 用例 ID | 回归点 | 验证方式 | 优先级 |
|---|---|---|---|
| REG-001 | 前端提交守卫不误阻断 | Hermes API Gateway 在线时快速体检可提交 | P0 |
| REG-002 | Web 技能清单显示完整 | 技能清单包含核心 GEO 技能和 `*-web` 技能 | P1 |
| REG-003 | `brand_extract` 映射正确 | taskType 映射到 `geo-brand-mentions` | P0 |
| REG-004 | GeoAuditView 传 `brandName` | payload 中包含品牌名 | P0 |
| REG-005 | GeoAssetsView 传 `brandUrl` | payload 不再只传 `websiteUrl` | P0 |
| REG-006 | 关键词 Hermes 输出可解析 | fenced JSON / artifact JSON 能提取 suggestions | P1 |
| REG-007 | 结果中心运行中任务显示 | running 任务可在结果中心追踪 | P0 |
| REG-008 | 输出契约失败 partial | 缺字段不误标 succeeded | P0 |

---

## 17. 兼容性用例

| 用例 ID | 维度 | 覆盖 | 预期 | 优先级 |
|---|---|---|---|---|
| COM-001 | 浏览器 | Chrome 最新版 | 功能正常 | P0 |
| COM-002 | 浏览器 | Edge 最新版 | 功能正常 | P1 |
| COM-003 | 分辨率 | 1920x1080 | 页面布局正常 | P1 |
| COM-004 | 分辨率 | 1366x768 | 核心按钮不被遮挡 | P1 |
| COM-005 | 移动宽度 | 375x812 | 主要内容可滚动访问 | P2 |
| COM-006 | 中文输入 | 品牌、城市、文章正文 | 不乱码 | P0 |
| COM-007 | 英文 URL | http/https URL | 正确保存和传递 | P0 |

---

## 18. 性能与稳定性基础用例

| 用例 ID | 场景 | 指标 | 优先级 |
|---|---|---|---|
| PER-001 | 首页加载 | 本地环境首屏 < 3 秒 | P2 |
| PER-002 | 创建 AgentTask | API 响应 < 2 秒，不等待 Hermes 长任务完成 | P0 |
| PER-003 | 任务轮询 | 运行中页面无明显卡顿 | P1 |
| PER-004 | 10 个任务列表 | 结果中心正常展示 | P1 |
| PER-005 | 50 个任务列表 | 分页/滚动正常，无白屏 | P2 |
| PER-006 | Hermes 长任务 | 10 分钟内状态持续可追踪，不丢 taskId | P1 |

---

## 19. 缺陷分级标准

| 级别 | 定义 | 示例 |
|---|---|---|
| P0 | 阻断核心业务、造成严重错误、或无法证明用户付费效果 | 调错 Skill、官网 URL 被替换、任务成功但无结果、未确认即自动发布、权限越权、文章发布后无 AI 检索复测、虚构 AI 收录/提及效果 |
| P1 | 核心功能可用但重要能力缺失或结果明显不符合预期 | 输出缺关键模块、文章数量不对、技能清单缺项、失败提示不可理解、效果面板缺少竞品或平台拆分 |
| P2 | 非核心路径问题或体验影响 | 移动端轻微溢出、进度百分比不够精准、文案不统一 |
| P3 | 优化建议 | 视觉细节、提示语增强、低频场景交互优化 |

---

## 20. 测试执行建议

### 20.1 第一轮冒烟

执行顺序：

1. `npm run build`
2. `npx tsx scripts/verify-geo-skill-input.ts`
3. `npx tsx scripts/verify-skill-mocks.ts`
4. 启动 Web 与 API。
5. 打开首页、Hermes 控制台、GEO 快速体检、GEO 资产生成、结果中心。
6. 使用 Mock 或 Direct Model 创建文章生成、关键词挖掘、投放方案任务。
7. 打开 Hermes Gateway 后创建 `geo_quick_start` 和 `geo_schema` 真实任务。
8. 从排名监控缺口生成 1 篇补缺文章，发布后检查 baseline、发布证据和复测计划是否完整。

### 20.2 第二轮系统测试

按本文第 9-18 章逐项执行，重点覆盖：

1. P0 用例全量执行。
2. P1 用例至少覆盖核心浏览器和主流程。
3. 每类 Skill 至少保留 1 条成功样例、1 条异常样例、1 条内容准确性评分记录。
4. 文章发布效果链路必须至少覆盖 1 条“发布前未提及 -> 发布后观察/有效/无变化判断”的完整样例。

### 20.3 内容评审方式

每条内容生成用例建议保存：

1. 用户原始输入。
2. 标准化后的 skill input。
3. 实际 skillName / executor。
4. 原始 output。
5. 业务展示结果截图。
6. 内容准确性评分表。
7. 发布前 baseline、发布链接、复测计划和 AI 平台采样结果。
8. 是否通过、缺陷编号、复测结论。

---

## 21. 验收结论模板

| 项 | 结论 |
|---|---|
| 测试版本 | 待填写 |
| 测试环境 | 待填写 |
| 执行周期 | 待填写 |
| 总用例数 | 待填写 |
| 通过数 | 待填写 |
| 失败数 | 待填写 |
| 阻塞数 | 待填写 |
| P0 未关闭 | 待填写 |
| P1 未关闭 | 待填写 |
| 是否准出 | 待填写 |

结论选项：

1. 通过，可进入下一阶段。
2. 有条件通过，需在上线前关闭指定缺陷。
3. 不通过，需修复 P0/P1 后重新提测。

---

## 22. 附录：当前项目可追踪文件

| 文件 | 用途 |
|---|---|
| `server/lib/agent-skill.ts` | taskType 到 skillName 映射 |
| `server/lib/hermes-geo-input.ts` | GEO Skill 入参归一化 |
| `server/lib/geo-web-output-contract.ts` | `geoWebOutput.v1` 输出契约 |
| `server/agent/executors/hermes.ts` | Hermes run 创建、轮询、输出解析 |
| `server/mocks/skill-samples.ts` | 全量 Skill 示例入参 |
| `server/mocks/skill-mock-registry.ts` | Skill Mock 输出注册 |
| `scripts/verify-geo-skill-input.ts` | 入参归一化验证脚本 |
| `scripts/verify-skill-mocks.ts` | Skill Mock 输出验证脚本 |
| `docs/GEO-SKILL-INPUT-MAPPING.md` | Skill 入参与 GEO-Agent 对照 |
| `docs/hermes-skill-acceptance/Hermes-Web-Skill-Pack-业务前端验收报告.md` | 既有 Hermes Web Skill Pack 验收记录 |
