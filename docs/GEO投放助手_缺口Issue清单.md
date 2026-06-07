# GEO 投放助手 · 缺口 Issue 清单

> 对照：`GEO投放助手_正式开发版_PRD_v1.1_最新设计风格.md`、`GEO投放助手_v1.1_接单端平台端缺口迭代计划.md`  
> 生成日期：2026-06-03  
> 用法：按 **P0 → P1 → P2** 排期；每条含建议改动文件，便于开 PR / 分工。

**图例**：`✅` 已有骨架 · `⚠️` 部分 · `❌` 未做 · `—` PRD 明确不做

---

## P0 — 影响真实闭环或验收

### P0-01 订单改派（任务订单） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.4、§6.2；PRD §9.3 |
| 现状 | 仅有 `assign`；`server/services/platform.service.ts` → `assignTaskOrder`；无改派前风险提示 |
| 目标 | `POST /api/platform/task-orders/:id/reassign`；记录原接单方、原因；写 `AuditLog` |
| 建议改动 | `prisma/schema.prisma`（可选 `ProviderOrderAssignment` 历史表）<br>`server/services/platform.service.ts`（`reassignTaskOrder`）<br>`server/routes/platform.ts`<br>`src/apps/platform/PlatformApp.tsx`（orders 视图：改派弹窗 + 当前进度摘要） |

---

### P0-02 线下结算状态（SettlementRecord） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §3.8、§5；状态：待平台确认 / 待线下结算 / 已结算 |
| 现状 | `provider.service.ts` 用已完成订单预算 `_sum` 模拟 `pendingSettlement` |
| 目标 | 验收通过后平台可推进结算状态；接单端「我的订单」展示结算列 |
| 建议改动 | `prisma/schema.prisma`（`SettlementRecord`：orderId, status, amount, note, operatorId）<br>`server/services/order.service.ts` 或新建 `settlement.service.ts`<br>`server/routes/platform.ts`、`server/routes/provider.ts`<br>`src/apps/provider/ProviderOrders.tsx`<br>`src/apps/platform/PlatformApp.tsx` |

---

### P0-03 交付附件与截图（任务订单） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §3.7；§5 `DeliveryAttachment` |
| 现状 | `OrderDelivery.attachments` 为 JSON 字符串；`ProviderOrders` 仅文本+链接 |
| 目标 | 接单方上传截图/附件 URL 或本地存储；商家/平台可查看；必填规则按 `acceptance` |
| 建议改动 | `prisma/schema.prisma`（`DeliveryAttachment` 或规范 attachments JSON schema）<br>`server/routes/provider.ts`（`deliver` 校验）<br>`server/routes/orders.ts`（商家侧列表）<br>`src/apps/provider/ProviderOrders.tsx`<br>`src/components/OrderDeliveryView.tsx`<br>可选：`server/routes/upload.ts` + `uploads/` 静态目录 |

---

### P0-04 平台 Agent 任务详情页 ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.2；PRD §9.2 |
| 现状 | `GET /api/platform/agent-tasks/:id` 已有；`PlatformApp.tsx` agents 视图为列表为主 |
| 目标 | 详情分栏：输入摘要、执行轨迹（logs）、输出、错误、重试/取消/人工标记、跳转 `businessRef` |
| 建议改动 | `server/services/agent-task.service.ts`（聚合 logs + skillRuns）<br>`src/apps/platform/PlatformApp.tsx` 或拆 `src/apps/platform/AgentTaskDetail.tsx`<br>复用 `src/components/AgentTasksView.tsx` 部分 UI |

---

### P0-05 平台 API 角色鉴权（非仅前端） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.6；PRD §3、§15.1 |
| 现状 | `server/lib/platform-auth.ts` + `src/hooks/usePlatformRole.ts`；路由多数未校验 `X-Platform-Role` |
| 目标 | 敏感路由：`budget-adjust`、`configs/:key`、`merchants/.../status`、`deposit approve` 等必须 `canPlatformAccess` |
| 建议改动 | `server/lib/platform-auth.ts`（`requirePlatformRole(req, permission)` 中间件）<br>`server/routes/platform.ts`（逐路由包裹）<br>文档同步请求头约定 |

---

### P0-06 Hermes Gateway 真机验收 ✅（脚本+文档；Gateway 需本机安装）

| 项 | 内容 |
|---|---|
| 文档 | `docs/Hermes-POC.md` §6；PRD §11.3–11.6 |
| 现状 | 默认 `DirectModelExecutor`；`NousHermesExecutor` 在 `server/agent/executors/hermes.ts` |
| 目标 | 勾选 POC：`hermes doctor`、`curl :8642/health`、`HERMES_API_URL` 下文章任务走 Hermes |
| 建议改动 | `.env.example`、`docs/Hermes-POC.md`<br>`server/agent/executors/index.ts`（`resolveExecutorKindForTask`）<br>`server/routes/agent-tasks.ts`（`/api/hermes/health`）<br>运维脚本（可选 `scripts/hermes-smoke.sh`） |

---

### P0-07 自动发布运营标记（失败分类） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.3；§8.3 |
| 现状 | `AgentTask.needsReview`、`POST .../manual-flag` |
| 目标 | 枚举：`need_reauth` / `need_manual_publish` / `retry_ok`；列表筛选 |
| 建议改动 | `prisma/schema.prisma`（`AgentTask.reviewCategory` 或扩 `LocalAutomationRun`）<br>`server/routes/platform.ts`<br>`src/apps/platform/PlatformApp.tsx`（hermes/agents 视图） |

---

## P1 — 运营效率与文档页面级对齐

### P1-01 平台接单申请专页 ✅（筛选）

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.4 |
| 现状 | 独立导航 `applications`；支持 `platform` / `providerName` 筛选 |
| 目标 | 独立导航「待确认申请」；批量确认；筛选任务/接单方 |
| 建议改动 | `src/apps/platform/PlatformApp.tsx`（新 view `applications_queue`）<br>`server/services/platform.service.ts`（分页） |

---

### P1-02 运营看板待办分级（P0/P1/P2） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.1 |
| 现状 | `server/services/platform.service.ts` → `getPlatformDashboard` 扁平 todos |
| 目标 | 每条待办带 `priority`；首屏 Agent/发布失败为 P0 |
| 建议改动 | `server/services/platform.service.ts`<br>`src/apps/platform/PlatformApp.tsx`（dashboard 区块样式） |

---

### P1-03 冻结流水专查 + 异常提醒 ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.7 |
| 现状 | `GET /api/platform/budget-ledgers`；funds 视图混合展示 |
| 目标 | Tab：全部 / freeze / release / 异常（冻结>余额等） |
| 建议改动 | `server/services/budget.service.ts`（查询参数）<br>`server/routes/platform.ts`<br>`src/apps/platform/PlatformApp.tsx`（funds 视图） |

---

### P1-04 网站需求列表与材料管理 ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.5；PRD §7.4 |
| 现状 | `WebsiteRequest` 模型有；平台 mainly `website-orders` |
| 目标 | `GET /api/platform/website-requests`；附件字段；从需求创建/关联订单 |
| 建议改动 | `prisma/schema.prisma`（`WebsiteRequest.attachments`）<br>`server/services/website.service.ts`<br>`server/routes/platform.ts`、`server/routes/website.ts`<br>`src/apps/platform/PlatformApp.tsx`<br>`src/components/CreateWebsiteView.tsx` |

---

### P1-05 入驻多步向导 + 申请版本历史 ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §3.2；PRD §8.1 |
| 现状 | `ProviderOnboarding.tsx` 单页；`ProviderApplication` 表已存在 |
| 目标 | 5 步表单；草稿自动保存；驳回后版本列表；撤回 submitted |
| 建议改动 | `src/apps/provider/ProviderOnboarding.tsx`（拆步骤组件）<br>`server/routes/provider.ts`（`PUT /applications/:id`、withdraw）<br>`server/services/provider.service.ts` |

---

### P1-06 接单端消息通知 ✅

| 项 | 内容 |
|---|---|
| 文档 | PRD §5.2 导航「消息通知」 |
| 现状 | 无模型、无导航项 |
| 目标 | `ProviderNotification`；工作台展示未读；类型：审核、返修、派单、系统 |
| 建议改动 | `prisma/schema.prisma`<br>`server/services/provider.service.ts`<br>`server/routes/provider.ts`<br>`src/apps/provider/ProviderApp.tsx`（新 view + `ProviderMessages.tsx`）<br>写入点：`order.service.ts`、`platform.service.ts`（审核/派单时） |

---

### P1-07 资源管理：报价规则与服务区域 ✅（报价规则）

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §3.3、§5 `ProviderPricingRule` |
| 现状 | `ProviderResources.tsx` + `ProviderAsset`；报价在 Provider 字段不完整 |
| 目标 | 按任务类型维护报价区间；服务区域、能力标签；账号「仅平台可见」 |
| 建议改动 | `prisma/schema.prisma`（`ProviderPricingRule`）<br>`server/routes/provider.ts`<br>`src/apps/provider/ProviderResources.tsx` |

---

### P1-08 任务大厅增强筛选与匹配提示 ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §3.4–3.5 |
| 现状 | `TaskHall.tsx` 仅 `platform` 筛选；`provider.service.ts` 有 `matchScore` |
| 目标 | 行业/城市/截止/验收筛选；匹配度 &lt; 阈值橙色提示 |
| 建议改动 | `server/routes/provider.ts`（`task-marketplace` query）<br>`server/services/provider.service.ts`<br>`src/apps/provider/TaskHall.tsx` |

---

### P1-09 交付草稿 + 返修响应 API ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §3.7、§6.1 `revision-response` |
| 现状 | `POST /api/provider/orders/:id/deliver`；返修只读展示 |
| 目标 | `delivery` status=draft；`POST .../revision-response` |
| 建议改动 | `server/routes/provider.ts`<br>`server/services/order.service.ts`<br>`src/apps/provider/ProviderOrders.tsx` |

---

### P1-10 商家详情钻取（订单 + Agent） ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.6 |
| 现状 | `GET /api/platform/merchants/:brandName` 返回摘要 |
| 目标 | 侧栏 Tab：近期订单、失败 Agent、流水摘要 |
| 建议改动 | `server/services/platform.service.ts`（`getMerchantDetail` 扩展）<br>`src/apps/platform/PlatformApp.tsx`（merchants 视图） |

---

### P1-11 系统配置分栏 + 全 key 版本历史 UI ✅

| 项 | 内容 |
|---|---|
| 文档 | 缺口计划 §4.8 |
| 现状 | `SystemConfigVersion` + 仅 `skill_routes` 版本按钮 |
| 目标 | 分组：平台/任务类型/预算/模型/自动化环境；任意 key「版本历史」 |
| 建议改动 | `server/db/bootstrap.ts`（默认 key 文档化）<br>`src/apps/platform/PlatformApp.tsx`（configs 视图重构） |

---

### P1-12 审计日志覆盖补齐 ✅

| 项 | 内容 |
|---|---|
| 文档 | PRD §14.3；缺口计划 §4.9 |
| 现状 | `server/services/audit.service.ts` 部分动作已写 |
| 目标 | 补：改派、结算、自动发布确认、配置变更、商家禁用、角色变更（含模拟登录） |
| 建议改动 | 各 service 调用 `appendAuditLog`<br>`src/apps/platform/PlatformApp.tsx`（时间范围筛选） |

---

### P1-13 发布端：账号校验任务 UI ✅

| 项 | 内容 |
|---|---|
| 文档 | PRD §7.9；`account_verify` 已在 `server/db/bootstrap.ts` skill_routes |
| 现状 | `AccountBindingView.tsx` 无触发 Agent 校验 |
| 目标 | 「校验绑定」→ 创建 `account_verify` AgentTask → 展示结果 |
| 建议改动 | `src/components/AccountBindingView.tsx`<br>`server/routes/brand.ts`<br>`server/agent/worker.ts`（executor 分支） |

---

### P1-14 Agent / 订单列表分页 ✅

| 项 | 内容 |
|---|---|
| 文档 | PRD §15.3 |
| 现状 | 各 `findMany` 无 `take/skip` |
| 目标 | `?page=&pageSize=` 统一；前端「加载更多」 |
| 建议改动 | `server/services/agent-task.service.ts`、`platform.service.ts`、`provider.service.ts`<br>`AgentTasksView.tsx`、`PlatformApp.tsx`、接单端列表 |

---

## P2 — 体验、多租户与非功能

### P2-01 登录与会话（三端）

| 建议改动 | 新建 `server/routes/auth.ts`、`User`/`Session` 模型；`App.tsx` / `ProviderApp` / `PlatformApp` 登录门 |

---

### P2-02 代理商 / 多品牌隔离

| 文档 | PRD §3 代理商 |
| 建议改动 | `Brand.organizationId`；发布端品牌切换；所有查询加 org 过滤 |

---

### P2-03 发布端团队权限

| 文档 | PRD §5.1 品牌账户 |
| 建议改动 | `src/components/Sidebar.tsx` 品牌组下「团队权限」view；`BrandMember` 模型 |

---

### P2-04 埋点事件（PRD §14.2）

| 建议改动 | `src/lib/analytics.ts`；在 `GenerateArticleView`、`DeliveryPlanView`、`OrderDeliveryView` 等 submit 点调用 |

---

### P2-05 Windows 本地自动化 POC

| 文档 | PRD §11.5 |
| 建议改动 | `server/agent/executors/local-powershell.ts`；`LocalAutomationRun` 写入环境/截图；`docs/Hermes-POC.md` 增 Windows 节 |

---

### P2-06 通用组件全站对齐设计规范

| 文档 | `docs/UI设计规范.md`；PRD §10 |
| 建议改动 | `GeoAnalysisView.tsx`、`ContentLibraryView.tsx` 等接入 `AgentInputCard` / `ResultWorkspace` |

---

### P2-07 自动化测试

| 建议改动 | `tests/api-smoke.test.ts` 扩展现有 `scripts/smoke-check.mjs`；CI workflow |

---

### P2-08 清理调试埋点 ✅

| 现状 | `Sidebar.tsx` 调试 ingest 已移除；`health-check.ts` 无 debug ingest |
| 建议改动 | 验收后删除或 `DEBUG_INGEST=0` 门控 |

---

## 已有能力速查（避免重复开发）

| 能力 | 关键文件 |
|------|----------|
| 发布端主流程 | `src/App.tsx`、`src/components/*View.tsx` |
| 预算冻结/释放 | `server/services/budget.service.ts` |
| 任务发布大厅 | `server/routes/orders.ts`、`server/routes/campaign.ts` |
| 接单 dashboard | `server/routes/provider.ts`、`ProviderDashboard.tsx` |
| 平台派单 | `assignTaskOrder` in `platform.service.ts` |
| 争议 | `orders.ts` disputes、`platform.ts` dispute-resolve |
| 自动发布确认 | `server/routes/content.ts` confirm-publish |
| Skill 路由配置 | `PlatformApp.tsx` configs、`server/lib/agent-skill.ts` |
| 网站订单双端 | `website.service.ts`、`ProviderWebsiteOrders.tsx` |
| 健康检查 | `server/lib/health-check.ts`、`scripts/smoke-check.mjs` |

---

## 建议排期（2 周示例）

| 周 | Issue |
|----|--------|
| W1 | P0-01、P0-02、P0-03、P0-05 |
| W2 | P0-04、P0-06、P0-07、P1-03 |
| W3+ | P1 按运营痛点排序；P2 与认证一并规划 |

---

## PRD 明确不做（勿开 Issue）

- 小程序 / H5 首版  
- 在线支付闭环  
- 自动建站生产发布  
- 复杂 ROI / 广告 API 深度集成  
- CRM、电子合同、电子发票、自动分账  

---

*维护：完成功能后将对应条目标 ✅ 并注明 PR/提交。*
