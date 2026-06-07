# Hermes Web Skill Pack 业务前端验收报告

验收日期：2026-06-07  
项目目录：`D:\GEO-Agent`  
Hermes 技能目录：`C:\Users\feihong\AppData\Local\hermes\skills\geo\`  
验收地址：`http://127.0.0.1:3000`  

## 1. 本次操作

已将 `D:\GEO-Agent\hermes-skills\geo-agent-web\` 中的 Web 适配技能复制到 Hermes 技能目录。

复制结果：

- 复制 Web 适配技能：13 个。
- 目标目录缺失检查：0 个缺失。
- 公共说明目录：`C:\Users\feihong\AppData\Local\hermes\skills\geo\_geo-agent-web-shared`
- 已合并数据库 `skill_routes`，让缺口 taskType 指向 `*-web` skill。

复制后的新增技能目录：

- `account-verify-web`
- `geo-analysis-web`
- `geo-article-generation-web`
- `geo-article-rewrite-web`
- `geo-campaign-plan-web`
- `geo-keyword-mining-web`
- `geo-knowledge-extract-web`
- `geo-platform-ranking-sampling`
- `geo-proposal-web`
- `geo-prospect-web`
- `geo-report-web`
- `geo-website-preview-web`
- `hermes-publish-web`

## 2. 环境检查

Hermes Gateway 可访问：

```json
{
  "status": "ok",
  "platform": "hermes-agent"
}
```

Hermes Desktop status 可访问：

```json
{
  "version": "0.14.0",
  "gateway_running": true,
  "gateway_state": "running",
  "api_server": { "state": "connected" }
}
```

Web 后端 `/api/hermes/health` 返回：

```json
{
  "ok": true,
  "mode": "api_gateway",
  "apiGatewayOk": true,
  "executorDefault": "nous_hermes",
  "executorForGeoAudit": "nous_hermes"
}
```

字段归一化脚本通过：

```bash
npx tsx scripts/verify-geo-skill-input.ts
```

## 3. 截图索引

### 3.1 首页与主入口

![首页](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/01-home.png)

![本机 Hermes 入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/02-hermes-console.png)

![GEO 分析入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/03-geo-analysis-entry.png)

![排名监控入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/04-ranking-monitor-entry.png)

![文章生成入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/05-article-generation-entry.png)

![发布任务入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/06-campaign-plan-entry.png)

![发布账号入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/07-publish-accounts-entry.png)

### 3.2 GEO 首次体检提交验收

步骤 1：进入 GEO 分析首次体检页，页面字段正常展示。

![首次体检提交前](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/08-geo-quick-start-before-submit.png)

步骤 2：直接点击“提交 Hermes 检测”，页面没有创建任务，也没有明显状态反馈。

![首次体检直接提交后](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/09-geo-quick-start-after-submit.png)

步骤 3：点击“确认 AI 拆解方案”。

![确认 AI 拆解方案](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/10-geo-quick-start-confirm-plan.png)

步骤 4：再次点击“提交 Hermes 检测”，弹出“需要先配置本机 Hermes”。

![确认后提交被配置弹窗阻断](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/11-geo-quick-start-after-confirm-submit.png)

步骤 5：关闭弹窗后，接口检查显示 Hermes readiness 为 `partial` 且理论上应放行。

![关闭弹窗后页面状态](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/12-geo-quick-start-ready-after-close-modal.png)

步骤 6：第三次提交仍被“需要先配置本机 Hermes”弹窗阻断。

![第三次提交仍被阻断](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/13-geo-quick-start-third-submit.png)

结论：前端提交守卫存在误阻断。后端 readiness 返回 `partial`，但业务提交仍弹出配置引导。

### 3.3 GEO 资产生成验收

步骤 1：进入资产生成页，Schema、llms.txt、AI 爬虫、内容可引用、E-E-A-T、平台专项入口均可见。

![资产生成入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/14-geo-assets-entry.png)

步骤 2：点击“生成预览”，风险确认弹窗正常出现。

![资产生成风险确认](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/15-geo-assets-risk-confirm-modal.png)

步骤 3：点击“我已了解风险，继续执行”，仍被“需要先配置本机 Hermes”弹窗阻断。

![资产生成确认后被阻断](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/16-geo-assets-after-confirm-submit.png)

结论：风险确认链路存在，但 Hermes 提交流被同一个前端守卫阻断。

### 3.4 其他业务入口

![排名监控页面](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/17-ranking-monitor-page.png)

![文章生成页面](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/18-article-generation-page.png)

![发布任务页面](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/19-campaign-plan-page.png)

![品牌管理页面](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/20-brand-management-page.png)

![发布账号页面](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/21-publish-accounts-page.png)

![结果中心页面](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/22-result-center-page.png)

### 3.5 Hermes 技能清单

点击“本机 Hermes → 技能清单”后，页面只显示 12 个原核心 GEO 技能。

![Hermes 技能清单](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/23-hermes-skill-list.png)

结论：`*-web` 新技能已复制到 Hermes 文件夹，但 Web 能力清单没有展示它们。

## 4. 任务与路由验收

数据库 `skill_routes` 已合并以下 Web 适配路由：

| taskType | skillName | 状态 |
|---|---|---|
| `geo_analysis` | `geo-analysis-web` | 已写入路由 |
| `keyword_mining` | `geo-keyword-mining-web` | 已写入路由 |
| `knowledge_extract` | `geo-knowledge-extract-web` | 已写入路由 |
| `index_sampling` | `geo-platform-ranking-sampling` | 已写入路由 |
| `article_generation` | `geo-article-generation-web` | 已写入路由 |
| `article_rewrite` | `geo-article-rewrite-web` | 已写入路由 |
| `campaign_plan` | `geo-campaign-plan-web` | 已写入路由 |
| `website_preview` | `geo-website-preview-web` | 已写入路由 |
| `hermes_publish` | `hermes-publish-web` | 已写入路由 |
| `account_verify` | `account-verify-web` | 已写入路由 |
| `geo_report` | `geo-report-web` | 已写入路由，但 Web 端尚无 taskType |
| `geo_proposal` | `geo-proposal-web` | 已写入路由，但 Web 端尚无 taskType |
| `geo_prospect` | `geo-prospect-web` | 已写入路由，但 Web 端尚无 taskType |

补充验证：

- 使用 `keyword_mining -> geo-keyword-mining-web` 创建过一个 Hermes run。
- Hermes run 状态为 `completed`。
- 该 run 证明新复制的 `geo-keyword-mining-web/SKILL.md` 可以被 Hermes 执行到完成。

但该补充验证暴露两个问题：

1. 通过 PowerShell 管道触发 API 时，中文入参被写成 `????`，该问题来自测试调用编码，不作为前端问题。
2. Hermes 返回内容是“说明文字 + fenced JSON”，Web executor 将其保存成 `summary` 字符串，没有稳定解析为结构化 `suggestions[]`。

## 5. 修复后复测

验收过程中已修复两个 P0：

1. `src/lib/hermes-readiness-guard.ts` 缺少 `fetchOnboardingStatus` / 类型 import，导致前端提交守卫走 catch 并误弹“需要先配置本机 Hermes”。
2. `server/lib/geo-capabilities.ts` 未注册新 `*-web` skill，导致业务 gate 判定新 taskType 不可用。

同时补充了 `src/lib/hermes-skill-labels.ts` 的中文展示名。

### 5.1 修复后首页与 Hermes 控制台

![修复后首页](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/24-fixed-3001-home.png)

![修复后 Hermes 控制台](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/25-fixed-3001-hermes-console.png)

### 5.2 修复后技能清单

修复后，“本机 Hermes → 技能清单”可显示 25 个技能，包含新增的 `*-web` 技能。

![修复后技能清单显示 Web 技能](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/26-fixed-3001-hermes-skill-list-web-skills.png)

### 5.3 修复后 GEO 首次体检提交

步骤 1：确认拆解方案后准备提交。

![修复后首次体检提交前](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/27-fixed-geo-quick-start-before-submit.png)

步骤 2：点击“提交 Hermes 检测”后成功创建任务，并显示 Hermes 执行进度。

![修复后首次体检提交成功](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/28-fixed-geo-quick-start-after-submit.png)

任务记录：

- taskType: `geo_quick_start`
- executor: `nous_hermes`
- externalRunId: `run_6e8f0da28c0c487cb352e14c07b434dd`
- Hermes run 状态：`running`
- last_event: `tool.started`

### 5.4 修复后 GEO 资产生成提交

步骤 1：资产生成页正常展示。

![修复后资产生成入口](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/29-fixed-geo-assets-entry.png)

步骤 2：风险确认正常出现。

![修复后资产生成风险确认](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/30-fixed-geo-assets-risk-confirm.png)

步骤 3：确认风险后成功创建 Hermes 任务，并显示后台队列/进度。

![修复后资产生成提交成功](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/31-fixed-geo-assets-after-submit.png)

任务记录：

- taskType: `geo_schema`
- executor: `nous_hermes`
- externalRunId: `run_1088522e69274a7c9ac54894c0aaa509`
- Hermes run 状态：`running`
- last_event: `tool.completed`

## 6. 当前仍需注意的问题

### 已修复：前端提交守卫误阻断

现象：

- `/api/hermes/health` 返回 API Gateway 在线。
- `/api/hermes/onboarding-status` 返回：
  - `hermesReady: true`
  - `apiGatewayOk: true`
  - `readinessUiState: partial`
  - `setupReason: null`
- 但 GEO 首次体检和资产生成提交时仍弹出“需要先配置本机 Hermes”。

影响：

- 从业务前端无法提交 `geo_quick_start`、`geo_schema` 等核心 GEO 任务。

处理结果：

- 已补 `fetchOnboardingStatus`、`OnboardingStatus`、`ReadinessUiState` import。
- 已改为显式 `'status' in result` 分支，避免 TS 收窄问题。
- 复测通过，前端可创建 Hermes 任务。

### 已修复：能力表未注册新 `*-web` 技能

现象：

- Hermes 文件夹已存在 `geo-keyword-mining-web` 等目录。
- `skill_routes` 已写入新路由。
- 但 `/api/hermes/geo-capabilities` 和“本机 Hermes → 技能清单”仍只显示 12 个原核心技能。
- 对 `geo_analysis`、`keyword_mining`、`knowledge_extract`、`index_sampling`、`article_generation`、`campaign_plan` 等业务任务进行提交时，gate 会返回“未注册 taskType 对应的 GEO skill”。

影响：

- 新复制的业务闭环 skill 不能从标准业务 API 稳定提交。

处理结果：

- 已扩展 `server/lib/geo-capabilities.ts`，加入 13 个 `*-web` skill。
- 已补前端中文标签。
- 复测 `/api/hermes/geo-capabilities` 返回 25 个技能，技能清单页面已显示新技能。

### P1-01 `geo_report / geo_proposal / geo_prospect` 还没有完整 Web 入口

现象：

- skill 已复制。
- adapter map 已准备。
- 但当前 `AgentTaskType`、`VALID_TYPES`、前端入口尚未支持这三个 taskType。

影响：

- 售前报告聚合、报价方案、线索 CRM 闭环还不能从产品内提交。

建议：

- 增加 `AgentTaskType`：
  - `geo_report`
  - `geo_proposal`
  - `geo_prospect`
- 增加 API allowlist 和前端入口。
- 报告历史/快速检测完成后增加“生成报价方案”“转为线索”按钮。

### P1-02 Hermes 输出需要强制纯 JSON

现象：

- `geo-keyword-mining-web` 能完成，但返回的是说明文字包裹 JSON。
- Web executor 未能把 fenced JSON 稳定解析为结构化字段。

影响：

- 关键词建议可能无法进入 `suggestions[]` 确认入库面板。

建议：

- 修改 skill 文案：最终输出必须是单个 JSON object，不允许 Markdown 包裹。
- 或增强 `parseHermesRunOutput`，支持抽取 fenced JSON。

### P1-03 关键词库/知识库入口当前导航不直观

现象：

- 主侧边栏没有直接看到“关键词库”“知识库”入口。
- 品牌管理页当前只是品牌列表。

影响：

- `keyword_mining`、`knowledge_extract` 的业务前端验收无法从当前导航直接完成。

建议：

- 在品牌管理/内容交付/工作台增加明确入口。
- 或在验收模式提供固定 URL/导航参数。

### P1-04 TypeScript lint 仍有既存错误

运行：

```bash
npm run lint
```

当前仍失败，但剩余报错不来自本次新增的 Hermes Web skill 适配代码，主要包括：

- `server/mocks/skill-mock-registry.ts` mock task 类型断言。
- `server/routes/orders.ts` 重复 import。
- `src/components/article/ArticlePlatformPicker.tsx` props 类型。
- `src/components/CreateWebsiteView.tsx` WebsiteRequest 字段。
- `src/components/hermes/HermesSetupSection.tsx` SkillsPayload.note 类型。
- `src/lib/publisher-notifications.ts` ViewType 枚举不匹配。

## 7. 验收结论

本次完成：

- Web 适配 skill 已复制到 Hermes 技能目录。
- `skill_routes` 已合并到数据库。
- Hermes Gateway 与 Desktop 均在线。
- 至少一个新技能 `geo-keyword-mining-web` 可被 Hermes 执行完成。
- 业务前端关键页面已截图留档。

修复后，核心产品闭环已从业务前端跑通到 Hermes：

1. Hermes 技能文件已复制。
2. `skill_routes` 已合并。
3. 技能清单可显示新 `*-web` 技能。
4. GEO 首次体检可从前端创建 Hermes run。
5. GEO Schema 资产生成可通过风险确认后创建 Hermes run。

仍建议后续补：

1. `geo_report / geo_proposal / geo_prospect` 的完整前端入口和 taskType。
2. Hermes skill 最终输出强制纯 JSON，或 executor 增强 fenced JSON 抽取。
3. 关键词库/知识库入口导航显性化。
4. 清理项目既存 TypeScript lint 错误。
## 8. 最终复测补充（图片改为绝对路径）

本轮继续修复：

- Hermes executor 增强 fenced JSON / embedded JSON 抽取，兼容 Hermes 输出 Markdown 代码块的情况。
- `geo_report`、`geo_proposal`、`geo_prospect` 已加入前后端 `AgentTaskType`、skill map 和 API allowlist。
- 13 个 `SKILL.md` 已补充最终输出规则：最终响应必须是单个 JSON object，不允许 Markdown fence。
- 已再次同步更新后的 skill 到 `C:\Users\feihong\AppData\Local\hermes\skills\geo\`。
- 本文档所有截图已改为绝对路径，避免 Markdown 查看器解析相对路径失败。

最终技能清单复测：

![最终复测技能清单](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/32-final-retest-skill-list-absolute-report.png)

结果中心/任务记录复测：

![最终复测结果中心](D:/GEO-Agent/docs/hermes-skill-acceptance/screenshots/33-final-retest-result-center-running-tasks.png)

补充任务：

- taskType: `keyword_mining`
- skill: `geo-keyword-mining-web`
- taskId: `a62a7b8b-c016-4a12-ae9c-552d7058d4c8`
- executor: `nous_hermes`
- externalRunId: `run_95eb401727b04cd0bcafa1e27393e002`
- 创建结果：成功创建并提交 Hermes Gateway
- 当前 Hermes 状态：`running`
- last_event: `tool.completed`

说明：该任务 2 分钟内仍停留在 Hermes `running/tool.completed`，属于 Hermes run 未结束，Web 端已正确提交并持续轮询。前序 `geo_quick_start`、`geo_schema` 已验证可从业务前端创建真实 Hermes run。

最终结论：技能文件、Web 能力发现、业务前端提交和 Hermes Gateway 创建链路均已打通。剩余主要风险是 Hermes 个别 run 完成耗时与最终输出格式，需要在真实 Hermes skill 继续压测。
