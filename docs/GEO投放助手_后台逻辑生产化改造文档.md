# GEO投放助手 后台逻辑生产化改造文档

## 1. 文档目的

当前项目已经具备商家端、接单端、平台端的产品雏形，但后台逻辑仍以 Demo 演示为主。

后续真实产品开发时，需要重点改造：

1. 用户身份体系。
2. 三端权限边界。
3. 多租户数据隔离。
4. 计费与结算。
5. 任务和 Agent 执行。
6. 数据库生产化。
7. 审计与风控。
8. 文件和第三方授权。

本文件用于指导研发和 AI 将 Demo 后台逻辑逐步升级为真实线上产品能力。

## 2. 当前后台主要问题

### 2.1 三端身份未真实隔离

当前三端更多是前端页面层面的分端，后台并没有完整的身份隔离。

需要改为：

```text
商家端：当前用户 -> organization -> brand
接单端：当前用户 -> provider
平台端：当前用户 -> platform role
```

所有接口必须基于登录态判断当前用户能访问什么数据。

### 2.2 后端过度信任前端参数

当前 Demo 中可能存在：

```text
providerId 来自 query/body
brandName 来自 query/body
role 来自 localStorage/header/body/query
```

真实产品中必须改为：

```text
providerId 从 session/token 解析
organizationId 从 session/token 解析
brandIds 从后端权限关系查询
platformRole 从用户权限表查询
```

前端传入的身份类参数只能作为筛选条件，不能作为权限依据。

### 2.3 缺少统一认证中间件

需要新增：

```text
server/middleware/auth.ts
server/middleware/require-publisher.ts
server/middleware/require-provider.ts
server/middleware/require-platform.ts
server/middleware/request-context.ts
```

后端每个请求应形成统一上下文：

```ts
type RequestContext = {
  userId: string;
  userType: 'publisher' | 'provider' | 'platform';
  organizationId?: string;
  brandIds?: string[];
  providerId?: string;
  platformRole?: string;
};
```

## 3. 用户与权限模型改造

### 3.1 新增真实 User 模型

建议补充：

```prisma
model User {
  id           String   @id @default(uuid())
  phone        String?  @unique
  email        String?  @unique
  passwordHash String?
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 3.2 商家用户关系

已有 `Organization`、`Brand`、`OrganizationMember` 可以继续使用，但应接入真实 `User`。

建议：

```prisma
model OrganizationMember {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  role           String
  createdAt      DateTime @default(now())

  @@unique([organizationId, userId])
}
```

商家端权限规则：

1. 用户只能访问自己所属 organization。
2. 用户只能访问被授权的 brand。
3. 品牌预算、订单、内容、报告都必须按 brandId 或 organizationId 过滤。
4. 平台端除外。

### 3.3 接单方用户关系

建议新增：

```prisma
model ProviderUser {
  id         String   @id @default(uuid())
  providerId String
  userId     String
  role       String   @default("owner")
  createdAt  DateTime @default(now())

  @@unique([providerId, userId])
}
```

接单端权限规则：

1. 接单方用户只能访问自己的 provider。
2. 未审核通过的 provider 不能领取任务。
3. 接单方不能通过修改 providerId 查看其他服务商数据。
4. 所有 `/api/provider/*` 接口必须从登录态获取 providerId。

### 3.4 平台用户角色

建议新增：

```prisma
model PlatformUserRole {
  id        String   @id @default(uuid())
  userId    String
  role      String
  createdAt DateTime @default(now())

  @@unique([userId, role])
}
```

平台端权限规则：

1. 平台端用户必须登录。
2. 平台角色来自后端，不来自前端。
3. 高风险操作必须校验具体 permission。
4. 重要操作写入审计日志。

## 4. 三端 API 改造

### 4.1 API 分组

建议统一为：

```text
/api/publisher/*
/api/provider/*
/api/platform/*
/api/public/*
```

当前已有路由可以逐步迁移，不需要一次性全部重命名，但新接口建议按这个规范设计。

### 4.2 商家端 API

商家端接口必须带租户隔离。

示例：

```text
GET /api/publisher/brands
GET /api/publisher/brands/:brandId
GET /api/publisher/orders
GET /api/publisher/content-projects
GET /api/publisher/budget
POST /api/publisher/agent-tasks
```

后端逻辑：

```text
currentUser -> organizationId -> allowedBrandIds -> query scope
```

### 4.3 接单端 API

接单端应增加：

```text
GET /api/provider/me
```

替换当前前端自行选择 provider 的方式。

示例：

```text
GET /api/provider/me
GET /api/provider/dashboard
GET /api/provider/orders
GET /api/provider/task-marketplace
POST /api/provider/task-marketplace/:id/claim
GET /api/provider/earnings
POST /api/provider/withdrawals
```

后端逻辑：

```text
currentUser -> providerId -> query scope
```

### 4.4 平台端 API

平台端所有接口必须经过：

```text
requirePlatformAuth
requirePlatformPermission
```

示例：

```text
GET /api/platform/dashboard
GET /api/platform/providers
POST /api/platform/providers/:id/review
GET /api/platform/orders
POST /api/platform/orders/:id/assign
GET /api/platform/settlements
POST /api/platform/configs
GET /api/platform/audit-logs
```

后端逻辑：

```text
currentUser -> platformRole -> permissions -> action allowed
```

## 5. 计费与资金逻辑改造

### 5.1 当前 Demo 问题

当前余额、AI 点数、充值、冻结、释放、提现、结算多为演示逻辑。

真实产品中必须接入公司统一计费体系。

### 5.2 商家侧资金逻辑

需要明确：

1. 充值订单由统一支付系统创建。
2. 余额扣减由统一计费系统执行。
3. 创建任务时冻结预算。
4. 任务验收后释放给服务商结算池。
5. 退款、驳回、争议需要统一账务流水。
6. AI 额度消耗需要可追踪。

建议后台抽象：

```text
BillingService
WalletService
LedgerService
PaymentOrderService
```

### 5.3 接单方结算逻辑

需要明确：

1. 订单完成后生成待结算记录。
2. 平台审核后进入可提现余额。
3. 提现申请进入财务审核。
4. 打款成功后更新状态。
5. 异常提现进入风控。

建议后台抽象：

```text
SettlementService
WithdrawalService
ProviderWalletService
```

## 6. 任务与 Agent 后台逻辑改造

### 6.1 当前 Demo 问题

当前 Agent 任务更偏演示，真实产品需要处理：

1. 队列。
2. 重试。
3. 超时。
4. 幂等。
5. 失败恢复。
6. 人工确认。
7. 任务日志。
8. 权限边界。

### 6.2 建议改造方向

新增或明确：

```text
AgentTask
AgentTaskLog
AgentTaskAttempt
AgentTaskReview
AgentTaskArtifact
```

任务创建必须校验：

1. 当前用户是否有权限创建。
2. 当前品牌是否属于该用户。
3. 当前余额/额度是否足够。
4. 当前任务类型是否开放。
5. 是否需要人工确认。

任务执行建议：

```text
API 创建任务 -> 写入 DB -> 推入队列 -> Worker 执行 -> 写日志 -> 回写结果 -> 通知用户
```

不要只依赖服务进程内 `setInterval` 作为生产任务调度。

## 7. 订单后台逻辑改造

### 7.1 商家发单

真实规则：

1. 商家必须登录。
2. 商家必须属于某个组织。
3. 发单必须绑定 brandId。
4. 发单前校验余额/预算。
5. 发单后生成订单和资金冻结流水。
6. 平台可审核、派单或开放任务大厅。

### 7.2 接单方接单

真实规则：

1. 接单方必须审核通过。
2. 只展示符合资质的任务。
3. 领取任务需要校验服务范围、能力、订单状态。
4. 接单后写入 assignment 记录。
5. 不允许多个接单方越权修改同一订单。

### 7.3 验收与争议

真实规则：

1. 接单方提交交付。
2. 商家验收。
3. 商家可要求返修。
4. 商家可发起争议。
5. 平台介入处理。
6. 平台处理结果影响结算和退款。

需要保证每一步有：

```text
状态变更
操作者
时间
原因
附件
审计日志
```

## 8. 审计与风控改造

### 8.1 审计日志

重要操作必须写入 `AuditLog` 或统一审计系统。

需要覆盖：

1. 登录。
2. 角色变更。
3. 品牌创建/删除。
4. 发单。
5. 接单。
6. 交付。
7. 验收。
8. 退款。
9. 充值。
10. 提现。
11. 平台审核。
12. 系统配置修改。
13. Agent 高风险动作。

### 8.2 风控规则

需要逐步增加：

1. 异常提现。
2. 高频发单。
3. 高频失败任务。
4. 敏感行业内容。
5. 敏感词命中。
6. 服务商交付异常。
7. 商家投诉。
8. 第三方账号授权失效。
9. Agent 自动发布前人工确认。

## 9. 数据库生产化改造

数据库建议直接切 PostgreSQL。

需要完成：

1. Prisma datasource 改为 PostgreSQL。
2. 建立 migrations。
3. 生产不使用 `db push`。
4. 生产不自动 seed demo 数据。
5. 金额字段后续从 Float 改 Decimal。
6. JSON 字符串字段后续逐步改 Json/JSONB。
7. 高频查询字段补索引。
8. 数据按 organizationId、brandId、providerId 增加查询边界。

## 10. 文件与素材后台逻辑改造

当前本地上传只能作为 Demo。

真实产品需要：

1. 对象存储。
2. 文件访问鉴权。
3. 文件大小限制。
4. 文件类型限制。
5. 病毒/风险扫描。
6. 私有文件签名 URL。
7. 删除和生命周期管理。
8. 与 brand/order/delivery 绑定。

## 11. 第三方账号授权改造

发布账号、平台授权、Hermes 本机状态当前可以继续作为 Demo 体验。

真实产品中需要区分：

1. OAuth 授权。
2. 本机浏览器授权。
3. 账号状态检测。
4. 权限过期。
5. 重新授权。
6. 授权日志。
7. 自动发布前确认。
8. 平台风控失败处理。

敏感 token 不得明文存储。

## 12. 后续改造优先级

### P0：真实上线前必须改

1. 用户登录和 session。
2. 三端身份隔离。
3. 商家 organization/brand 数据隔离。
4. 接单端 providerId 后端解析。
5. 平台端真实角色权限。
6. PostgreSQL + migrations。
7. 生产禁用 demo seed。
8. CORS / Cookie / 域名配置。
9. 资金相关接口禁止使用 Demo 逻辑。
10. 高风险操作审计日志。

### P1：正式商业化必须改

1. 统一计费系统。
2. 真实充值支付。
3. 真实结算提现。
4. 任务队列。
5. 对象存储。
6. 消息通知中心。
7. 第三方账号授权。
8. 风控规则。
9. 报表统计。
10. 平台配置审批和版本回滚。

### P2：规模化运营再做

1. 多组织复杂权限。
2. 高级 RBAC。
3. 数据仓库。
4. 财务对账后台。
5. 服务商评分体系。
6. SLA 监控。
7. Agent 执行质量评估。
8. 多环境灰度发布。

## 13. 给研发和 AI 的改造原则

1. 保留 Demo 中表达清楚的产品流程。
2. 替换 Demo 中不安全的身份和权限逻辑。
3. 不要让前端参数决定数据归属。
4. 不要让 localStorage 决定平台权限。
5. 所有资金逻辑必须接正式计费系统。
6. 所有三端数据必须按用户身份隔离。
7. 所有重要状态变更必须可审计。
8. 新增代码要标注 Demo-only 和 production todo。
9. 优先完成后台边界，再继续补复杂功能。
10. 前端可继续迭代，但后台必须逐步收紧权限和数据范围。
