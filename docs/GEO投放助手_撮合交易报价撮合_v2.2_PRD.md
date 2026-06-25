# GEO 投放助手 · 撮合交易报价撮合 PRD v2.2

> 30% 服务费 · 从接单方分成扣除 · 基于现有 GEO-Agent 三端骨架 · AI 协同研发评审版  
> **v2.2 替代 [v2.1](./GEO投放助手_撮合交易报价撮合_v2.1_PRD.md)**，为研发评审与迭代排期真源。

---

## 文档元信息

| 字段 | 内容 |
|---|---|
| 文档版本 | v2.2（仓库定稿版，含评审修补） |
| 撰写日期 | 2026-06-25 |
| 定稿日期 | 2026-06-25 |
| 文档状态 | **研发评审版 / Iteration Planning** |
| 产品形态 | Web 发布端 + Web 接单端 + Web 平台端 |
| 代码基线 | **线上版本为准**；本 GitHub 仓库为历史/开发快照 |
| 需求真源 | 本 PRD；若线上代码与本文冲突，以本文为准，MR 中记录差异 |
| 决策人 | 产品、研发负责人、财务、平台运营 |
| 目标评审结果 | 明确 P0 范围、确认数据模型、确认接口与状态机、拆出 3 个 Sprint |

### 关联文档

- [正式开发版 PRD v1.1](./GEO投放助手_正式开发版_PRD_v1.1_最新设计风格.md)
- [平台端功能补齐迭代方案](./GEO投放助手_平台端功能补齐迭代方案.md)
- [Hermes Agent 交付工作台差距分析](./GEO投放助手_Hermes-Agent交付工作台对比差距分析.md)
- [后台逻辑生产化改造](./GEO投放助手_后台逻辑生产化改造文档.md)
- [v2.1 PRD（已替代）](./GEO投放助手_撮合交易报价撮合_v2.1_PRD.md)

### 版本修订记录

| 版本 | 说明 |
|---|---|
| v2.0 | 初版：报价撮合、30% 服务费、隐藏预算 |
| v2.1 | 金额用分、发布方不展示 P/F、快照、事务、绕路封禁 |
| v2.2 | 一页摘要、PR/FAQ、Epic、验收矩阵、技术契约、AI 执行包、灰度回滚 |
| v2.2 定稿 | 补价目带 schema、公式双路径、完整绕路清单、E6、埋点、附录 B/C |

### 术语

| 术语 | 说明 |
|---|---|
| G / 成交支付价 | 发布方确认后支付/冻结的总价（非另付平台费） |
| P0 / 期望到手价 | 接单方报价输入，验收后到账承诺值 |
| F / 平台服务费 | 从 G 中划分给平台，默认 G×30% |
| 建议报价区间 | 价目带参考，不是客户预算 |
| 隐藏预算上限 | 仅发布方/服务端可见，用于过滤报价 |

---

# 0. 一页决策摘要（研发评审先看这一页）

## 0.1 本轮要拍板的 6 个决定

| 决策 | 推荐结论 | 影响 |
|---|---|---|
| 收费模式 | 平台服务费 30%，从接单方分成扣除 | 全站金额口径、文案、对账 |
| 报价输入 | 接单方填「期望到手价 P0」 | 系统反算成交支付价 G |
| 发布方展示 | 发布方只看 G，不看 F 和 P | 降跳单与争议 |
| P0 范围 | 单篇报价撮合纵切，不做完整媒体资源库 | 控制周期 |
| 金额存储 | 新链路字段全部 Int 分 | 避免 Float 误差 |
| 冻结时机 | 仅确认报价后冻结 G，发单不冻结 | 避免未成交占款 |

## 0.2 本轮产品目标

```text
GEO 投放方案 → 拆单 → 接单方报价 → 发布方选报价 → 冻结 G → 履约 → 验收 → 按快照结算
```

## 0.3 P0 交付边界

1. 发布方从方案拆出 N 条 `provider_quote` 任务。
2. 接单方大厅无客户预算，有建议区间。
3. 接单方填 P0，系统算 G、F。
4. 发布方比价页只看 G，选一条确认。
5. 事务确认、冻结 G、写快照、拒其他报价。
6. 验收后按快照结算。

**P0 不做：** 完整 `ProviderMediaResource`、自动分账、批量选价、GEO 排名承诺。

## 0.4 成功指标

| 指标 | 定义 |
|---|---|
| 报价率 | 有报价任务数 / 大厅 quote 任务数 |
| 选价率 | 确认报价数 / 提交报价数 |
| 冻结成功率 | 冻结成功 / acceptQuote 次数 |
| 结算一致率 | G=P+F 的已结算订单占比 |
| AC 通过率 | 通过 AC 数 / AC 总数 |

## 0.5 评审议程（60 分钟）

| 时间 | 主题 |
|---:|---|
| 0-10 | 业务规则：30%、G/F/P、发布方展示 |
| 10-25 | 状态机、`awaiting_freeze`、事务、幂等 |
| 25-40 | 数据模型、API、`TaskOrderQuote` |
| 40-50 | 前端：比价页、报价页、收益页 |
| 50-60 | Sprint 拆分、待决事项 |

---

# 1. 文档定位（相对 v2.1）

v2.1 业务规则正确，但偏需求清单。v2.2 采用 **PRD + Design Doc + Test Plan + Agent Brief** 四合一，便于研发会拆任务与 AI 协同开发。

---

# 2. Working Backwards PR/FAQ

## 2.1 发布稿（内部用）

**标题：** GEO 投放助手上线报价撮合，品牌方不懂媒体价也能发起可成交任务

品牌方将需求拆为单篇媒体任务，服务商按资源报价，品牌方确认成交价。平台负责冻结、验收、结算。发布方不填单篇价，只设隐藏上限；接单方填期望到手价，系统反算成交支付价。

## 2.2 客户 FAQ

| 问题 | 答 |
|---|---|
| 为何不直接填预算？ | 品牌方不懂媒体真实价；隐藏上限不对媒体公开 |
| 为何填期望到手价？ | 接单方关心实际到账；系统反算 G 并透明展示 F |
| 发布方是否另付 30%？ | 否，只付 G；服务费从接单方分成扣 |
| 是否保证 GEO 排名？ | 否，只保证撮合、交付、验收、结算 |

## 2.3 内部 FAQ

| 问题 | 答 |
|---|---|
| P0 为何不做资源库？ | 用 `PlatformMediaPriceBand` 冷启动价目带 |
| 为何发布方不看 P/F？ | 降跳单与服务费争议 |
| 为何用分？ | 反算/冻结/结算/提现不能有 0.01 误差 |

---

# 3. 背景与非目标

## 3.1 当前问题

| 问题 | 结果 |
|---|---|
| 固定预算发单 | 价格失真、发单门槛高 |
| 大厅展示预算 | 围绕预算而非能力报价 |
| 发布即冻结 | 未成交占款 |
| Application 仅留言 | 无法比价 |
| 8% 实时计算 | 无法 30% 快照审计 |

## 3.2 机会

帮品牌把「提升 GEO/AI 搜索可见度」变成可报价、可比较、可冻结、可验收、可结算的媒体发布任务。

## 3.3 非目标

不承诺排名；不做全量达人市场；不做自动分账；不做完整资源库；不做批量/自动选价；不改造全库历史 Float 资金字段。

---

# 4. 用户与 Epic

## 4.1 核心用户故事

| ID | 作为 | 我想要 | 以便 |
|---|---|---|---|
| US-01 | 发布方 | GEO 生成投放建议 | 不用自己定价 |
| US-02 | 发布方 | 隐藏预算上限 | 控成本不暴露 |
| US-03 | 发布方 | 对比报价 | 选合适 G |
| US-04 | 接单方 | 填 P0 | 清楚到手金额 |
| US-05 | 接单方 | 看建议区间 | 合理报价 |
| US-06 | 财务 | 成交快照 | 不受费率变更影响 |

## 4.2 Epic 列表

| Epic | 名称 |
|---|---|
| E1 | 投放方案拆单 |
| E2 | 接单方报价 |
| E3 | 发布方选价冻结 |
| E4 | 金额快照与结算 |
| E5 | 绕路封禁与并发 |
| E6 | 价目带与建议区间 |

---

# 5. 业务规则（Hard Rules）

| ID | 规则 | 验证 |
|---|---|---|
| BR-01 | 新单默认 `pricingMode=provider_quote` | DB |
| BR-02 | quote 单禁止 claim/accept/assign/confirmApplication | API 400 |
| BR-03 | 拆单发布不冻结 | 余额不变 |
| BR-04 | 仅 acceptQuote 后冻结 G | 流水 |
| BR-05 | 隐藏预算不对接单方公开 | 接口脱敏 |
| BR-06 | 发布方不展示 P/F | UI |
| BR-07 | 接单方报价页/收益页展示 P0/F/G | UI |
| BR-08 | 服务费从接单方分成扣 | 文案+结算 |
| BR-09 | 成交写金额与费率快照 | DB |
| BR-10 | 超区间须 `overRangeReason` | 表单 |
| BR-11 | 过期报价不可 accept | API |
| BR-12 | 发单合规提示（广告标识） | UI |

---

# 6. 金额与费率规范

## 6.1 费率

```text
PLATFORM_FEE_RATE = 30%
serviceFeeRateBps = 3000
feeChargeSide = provider
```

## 6.2 存储

- 新字段：**Int 分**
- API：`*Cents` 入参/库；可选 `*Yuan` 展示字符串
- 禁止：quote 链路 Float 运算
- 旧 `Float` 字段：仅兼容展示

## 6.3 公式（双路径，禁止混用）

### 路径 A：报价提交与 accept 快照（主路径）

接单方输入 P0（分）：

```text
G = ceil(P0 × 10000 / 7000)    // 等价 ceil(P0/0.70)，用 BPS 整数算
F = G - P0
P = P0
```

**硬规则：** 报价、accept、结算快照**一律走路径 A**；`P` 以快照 `providerIncomeCents` 为准，**禁止**结算时用路径 B 覆盖。

### 路径 B：仅从 G 拆账校验（对账/异常检查）

```text
F = round(G × 0.30)
P = G - F
```

仅用于无 P0 快照时的财务校验；**不得**用于改写已成交 quote 单的结算金额。

## 6.4 示例

| P0 | G | F |
|---:|---:|---:|
| ¥700.00 | ¥1,000.00 | ¥300.00 |
| ¥1,000.00 | ¥1,428.58 | ¥428.58 |
| ¥2,100.00 | ¥3,000.00 | ¥900.00 |

## 6.5 成交快照（accept 一次写入）

`selectedQuoteId`、`acceptedAt`、`serviceFeeRateBps`、`feeChargeSide`、`publisherPayAmountCents`、`platformServiceFeeCents`、`providerIncomeCents` → 同步至 `SettlementRecord`。

---

# 7. 功能需求（Epic 详述）

## 7.1 E1 投放方案拆单

| ID | 需求 | P0 |
|---|---|---|
| E1-01 | 方案页：内容方向、媒体类型、篇数、建议区间 | ✓ |
| E1-02 | 移除新单单篇发单价 | ✓ |
| E1-03 | `hiddenBudgetMaxCents` | ✓ |
| E1-04 | `perTaskBudgetCapCents` | ✓ |
| E1-05 | 按钮「生成报价任务」 | ✓ |
| E1-06 | 拆 N 条 `quote_open` 任务 | ✓ |

```gherkin
Given 发布方已生成投放方案
When 点击生成报价任务
Then 创建 N 条 provider_quote 任务且余额不冻结
```

## 7.2 E2 接单方报价

| ID | 需求 | P0 |
|---|---|---|
| E2-01 | 大厅无客户 budget | ✓ |
| E2-02 | 展示 suggestedMin/Max | ✓ |
| E2-03 | 按钮「提交报价」 | ✓ |
| E2-04 | 主输入 P0 | ✓ |
| E2-05 | 实时展示 G/F/P0 | ✓ |
| E2-06 | 超区间须 overRangeReason | ✓ |
| E2-07 | quoteExpiresAt 必填 | ✓ |
| E2-08 | 最低到手价校验（默认 ¥10） | ✓ |

## 7.3 E3 发布方选价冻结

| ID | 需求 | P0 |
|---|---|---|
| E3-01 | 比价表：接单方、媒体、G、上线、交付证明 | ✓ |
| E3-02 | 不展示 P/F | ✓ |
| E3-03 | 「确认并冻结 ¥{G}」 | ✓ |
| E3-04 | idempotencyKey | ✓ |
| E3-05 | 超隐藏上限禁止确认 | ✓ |
| E3-06 | 拒其他 pending 报价 | ✓ |

## 7.4 E4 金额快照与结算

| ID | 需求 | P0 |
|---|---|---|
| E4-01～04 | accept 写入 G/F/P/serviceFeeRateBps | ✓ |
| E4-05 | Settlement 复制快照 | ✓ |
| E4-06 | 禁止 netEarnings(gross) 重算历史单 | ✓ |

## 7.5 E5 绕路封禁与并发

| ID | 需求 | P0 |
|---|---|---|
| E5-01 | `POST .../claim` on quote → 400 | ✓ |
| E5-02 | `POST .../orders/:id/accept`（内部调 claim）→ 400 | ✓ |
| E5-03 | `assignTaskOrder` / `reassignTaskOrder` → 400（P1 专用派单除外） | ✓ |
| E5-04 | acceptQuote 事务+行锁 | ✓ |
| E5-05 | idempotencyKey 幂等 | ✓ |
| E5-06 | 审计 quote_submit/accept/freeze | ✓ |
| E5-07 | `confirmApplication` / 平台 `order-applications/confirm` on quote → 400 | ✓ |
| E5-08 | `acceptOrder`（order.service）on quote → 400 | ✓ |

### 绕路接口索引（实施时逐项封禁）

| 入口 | 参考模块 |
|---|---|
| `claimTaskOrder` | `provider.service.ts` |
| `POST /api/provider/task-orders/:id/claim` | `routes/provider.ts` |
| `POST /api/provider/orders/:id/accept` | `routes/provider.ts` |
| `confirmApplication` | `provider.service.ts` |
| `POST /api/platform/order-applications/:id/confirm` | `routes/platform.ts` |
| `assignTaskOrder` / `reassignTaskOrder` | `platform.service.ts` |
| `acceptOrder` | `order.service.ts` |

## 7.6 E6 价目带与建议区间

| ID | 需求 | P0 |
|---|---|---|
| E6-01 | `PlatformMediaPriceBand` 表与 migration | ✓ |
| E6-02 | 种子 15～30 条（产品/运营提供） | ✓ |
| E6-03 | 拆单/发布时按 mediaType+contentDirection 解析建议区间 | ✓ |
| E6-04 | 运营后台 CRUD 价目 | P1 |

```gherkin
Given 价目带存在「品牌介绍稿×官方媒体 80000-300000 分」
When 发布对应类型任务
Then TaskOrder.suggestedMinCents=80000 且 suggestedMaxCents=300000
```

---

# 8. 技术契约

## 8.1 数据模型

### CampaignPlan

```prisma
hiddenBudgetMaxCents    Int?
perTaskBudgetCapCents   Int?
budgetVisibleToProvider Boolean @default(false)
pricingMode             String  @default("provider_quote")
```

### TaskPackageDraft

```prisma
suggestedMinCents   Int?
suggestedMaxCents   Int?
slotCount           Int     @default(1)
contentDirection    String?
mediaTypeHint       String?
quoteRequired       Boolean @default(true)
```

### TaskOrder

```prisma
planId                      String?
pricingMode                 String   @default("provider_quote")
suggestedMinCents           Int?
suggestedMaxCents           Int?
selectedQuoteId             String?
acceptedAt                  DateTime?
serviceFeeRateBps           Int      @default(3000)
feeChargeSide               String   @default("provider")
publisherPayAmountCents     Int?
platformServiceFeeCents     Int?
providerIncomeCents         Int?
```

### TaskOrderQuote

```prisma
model TaskOrderQuote {
  id                          String   @id @default(uuid())
  orderId                     String
  providerId                  String
  providerName                String
  providerExpectedIncomeCents Int
  publisherPayAmountCents     Int
  platformServiceFeeCents     Int
  serviceFeeRateBps           Int      @default(3000)
  mediaName                   String?
  mediaType                   String?
  publishPlatform             String?
  estimatedPublishAt          DateTime?
  deliveryPromise             String?
  includeLink                 Boolean  @default(false)
  includeScreenshot           Boolean  @default(true)
  includeIndexingProof        Boolean  @default(false)
  overRangeReason             String?
  quoteExpiresAt              DateTime?
  message                     String?
  status                      String   @default("pending")
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
  @@index([orderId, status])
  @@index([providerId, createdAt])
}
```

### PlatformMediaPriceBand

```prisma
model PlatformMediaPriceBand {
  id                String   @id @default(uuid())
  mediaType         String
  contentDirection  String?
  publishPlatform   String?
  industry          String?
  city              String?
  suggestedMinCents Int
  suggestedMaxCents Int
  sampleSize        Int      @default(0)
  sourceType        String   @default("manual_seed")
  status            String   @default("active")
  updatedAt         DateTime @updatedAt
}
```

种子文件建议：`server/db/seed-media-price-bands.ts` 或 migration 内 `INSERT`（Sprint 1 由运营提供 CSV）。

### SettlementRecord

```prisma
publisherPayAmountCents   Int?
platformServiceFeeCents   Int?
providerIncomeCents       Int?
serviceFeeRateBps         Int?
feeChargeSide             String?
settlementBaseAmountCents Int?
isDemoSettlement          Boolean @default(false)
```

## 8.2 `lib/platform-fee.ts`

```ts
export const PLATFORM_FEE_RATE_BPS = 3000;
export const PROVIDER_NET_RATE_BPS = 7000;
export const FEE_CHARGE_SIDE = 'provider' as const;

export function grossFromProviderNetCents(netCents: number): number {
  return Math.ceil((netCents * 10000) / PROVIDER_NET_RATE_BPS);
}

export function platformFeeFromGrossCents(grossCents: number): number {
  return Math.round((grossCents * PLATFORM_FEE_RATE_BPS) / 10000);
}

/** 报价/accept 主路径：保证 P === netCents */
export function splitFromProviderNetCents(netCents: number) {
  const publisherPayAmountCents = grossFromProviderNetCents(netCents);
  const platformServiceFeeCents = publisherPayAmountCents - netCents;
  return {
    publisherPayAmountCents,
    platformServiceFeeCents,
    providerIncomeCents: netCents,
    serviceFeeRateBps: PLATFORM_FEE_RATE_BPS,
    feeChargeSide: FEE_CHARGE_SIDE,
  };
}

/** 仅对账校验，不用于改写快照单结算 */
export function splitFromGrossCentsForAudit(grossCents: number) {
  const platformServiceFeeCents = platformFeeFromGrossCents(grossCents);
  return {
    publisherPayAmountCents: grossCents,
    platformServiceFeeCents,
    providerIncomeCents: grossCents - platformServiceFeeCents,
  };
}
```

## 8.3 状态机

```text
quote_open → quote_review → awaiting_freeze → matched → in_progress
  → pending_review → completed → settling → settled
异常：awaiting_freeze → quote_review（冻结失败）
      quote_open|quote_review → cancelled
      pending_review → disputed
```

| 状态 | 含义 |
|---|---|
| `awaiting_freeze` | 已选报价，冻结进行中（与 matched 区分） |
| `matched` | 冻结成功，撮合完成 |

## 8.4 API

### 发布方

| 方法 | 路径 | 说明 |
|---|---|---|
| PATCH | `/api/campaign-plans/:id/packages` | 建议区间、slot、隐藏上限 |
| POST | `/api/campaign-plans/:id/publish` | 拆单，**不冻结** |
| GET | `/api/orders/:id` | 含 quotes（发布方可见 G） |
| POST | `/api/orders/:id/quotes/:quoteId/accept` | body: `{ idempotencyKey }` |
| POST | `/api/orders/:id/quotes/:quoteId/reject` | 拒绝报价 |
| POST | `/api/orders/:id/withdraw` | 未冻结可撤回 |

### 接单方

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/provider/task-marketplace` | 无 budget，有 suggestedMin/Max |
| GET | `/api/provider/task-marketplace/:id` | 同上 |
| POST | `/api/provider/task-orders/:id/quotes` | 提交报价 |
| GET | `/api/provider/quotes` | 我的报价列表 |
| POST | `/api/provider/task-orders/:id/claim` | quote 单 → 400 |
| POST | `/api/provider/orders/:id/accept` | quote 单 → 400 |

### 平台

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/platform/task-orders/:id` | 含 G/F/P 财务字段 |
| GET | `/api/platform/media-price-bands` | 价目带 P1 |

### 提交报价 body

```json
{
  "providerExpectedIncomeCents": 100000,
  "mediaName": "某科技垂类媒体",
  "mediaType": "vertical_media",
  "publishPlatform": "网站",
  "estimatedPublishAt": "2026-06-27T10:00:00+08:00",
  "quoteExpiresAt": "2026-06-26T23:59:59+08:00",
  "includeLink": true,
  "includeScreenshot": true,
  "includeIndexingProof": false,
  "deliveryPromise": "发布后提供链接与截图",
  "overRangeReason": null,
  "message": "可选备注"
}
```

服务端**必须**重算 G/F，不信任前端传入的 G/F。

## 8.5 acceptQuote 事务

```text
BEGIN
  SELECT order FOR UPDATE
  ASSERT status IN (quote_open, quote_review) AND selectedQuoteId IS NULL
  SELECT quote FOR UPDATE
  ASSERT quote.status=pending AND now() < quoteExpiresAt
  ASSERT provider approved AND NOT blocked
  ASSERT G <= perTaskBudgetCapCents
  ASSERT planFrozenTotal + G <= hiddenBudgetMaxCents
  freezeBudget(brand, G, idempotencyKey)  -- 失败 ROLLBACK
  UPDATE order: snapshots, selectedQuoteId, status=matched, acceptedAt
  UPDATE quote: accepted; other quotes: rejected
  INSERT audit_log
COMMIT
```

资金系统若不在同库事务：增加 `freezeRequestId`、`freezeStatus`、补偿任务。

---

# 9. 页面与文案

## 9.1 发布方比价（仅 G）

| 接单方 | 媒体 | 成交支付价 | 预计上线 | 交付证明 | 操作 |
|---|---|---:|---|---|---|
| A | 科技垂类 | ¥1,428.58 | 2天 | 链接+截图 | 确认并冻结 |
| B | 行业号 | ¥857.15 | 1天 | 链接+截图 | 确认并冻结 |

页脚：成交支付价为本任务最终支付金额，包含平台撮合、交付验收与结算保障等服务。确认后将冻结对应金额。

## 9.2 接单方报价页

```text
期望到手金额：¥1,000.00
平台技术服务费（30%）：¥428.58
发布方需支付：¥1,428.58

你填写的是本单验收完成后的预计到手金额。平台将按订单成交支付价的 30%
收取技术服务费，并在结算时从订单款项中扣除。
```

## 9.3 禁止文案

- 发布方另付 30% 平台费
- 保证 GEO 排名
- 客户预算 ¥XX
- 报价越低越容易中标

---

# 10. 埋点、灰度与监控

## 10.1 埋点事件

| 事件 | 触发 |
|---|---|
| `campaign_plan_publish` | 拆单发布 |
| `quote_submit` | 提交报价 |
| `quote_accept` | 确认报价 |
| `quote_reject` | 拒绝报价 |
| `freeze_success` / `freeze_fail` | 冻结结果 |
| `order_complete` | 验收完成 |

## 10.2 Feature Flag

| Flag | 默认 | 作用 |
|---|---|---|
| `ENABLE_PROVIDER_QUOTE` | false | 报价撮合总开关 |
| `HIDE_PUBLISHER_BUDGET` | true | 大厅预算脱敏 |
| `QUOTE_ACCEPT_FREEZE` | false | accept 是否真实冻结 |
| `QUOTE_SETTLEMENT_SNAPSHOT` | true | 结算读快照 |

## 10.3 灰度

1. 内部 3 单 → 2. 白名单 10 单 → 3. 全测试品牌 → 4. 默认 quote 发单

## 10.4 回滚

| 问题 | 动作 |
|---|---|
| 报价异常 | 关 `ENABLE_PROVIDER_QUOTE` |
| 冻结异常 | 关 `QUOTE_ACCEPT_FREEZE` |
| 结算异常 | 暂停批次，人工按快照处理 |

## 10.5 告警

| 指标 | 条件 |
|---|---|
| `freeze_fail_rate` | 10min > 5% |
| `quote_accept_409` | 异常升高 |
| `settlement_mismatch` | G ≠ P+F |
| `claim_400_on_quote` | 旧入口未清理干净 |

---

# 11. 验收矩阵

## 11.1 P0 功能 AC

| AC | 用例 | 预期 |
|---|---|---|
| AC-01 | 拆 3 单 | 余额不变，3×quote_open |
| AC-02 | 大厅 | 无 budget，有区间 |
| AC-03 | P0=¥1000 | G=1428.58，F=428.58 |
| AC-04 | 超区间无原因 | 提交失败 |
| AC-05 | 发布方比价 | 仅 G |
| AC-06 | 确认报价 | 冻结 G+快照 |
| AC-07 | 单篇上限¥1200 | G=1428.58 不可确认 |
| AC-08 | 过期报价 | QUOTE_EXPIRED |
| AC-09 | claim quote 单 | CLAIM_NOT_ALLOWED_FOR_QUOTE |
| AC-10 | 改全局费率 | 历史单结算不变 |
| AC-11 | confirmApplication on quote | 400 |

## 11.2 金额单测

| 输入 | 预期 |
|---|---|
| P0=70000 | G=100000, F=30000, P=70000 |
| P0=100000 | G=142858, F=42858, P=100000 |
| G=100000（审计） | F=30000, P=70000 |

## 11.3 非功能

- accept 双击只冻一次
- 每单仅一个 accepted quote
- 审计可查 quote_submit/accept/freeze
- 接单方接口无隐藏预算
- 发布方不能操作他品牌订单

---

# 12. AI Agent 执行包

## 12.1 允许修改

`lib/platform-fee.ts`、Prisma migration、`quote.service.ts`、provider/orders 路由、大厅脱敏、发布比价 UI、accept 事务、settlement 读快照、相关测试。

## 12.2 禁止修改

全局认证、完整资金系统、Hermes 主链路、GEO 分析算法、无关 UI 主题。

## 12.3 任务卡模板

```text
任务：实现 POST /api/provider/task-orders/:id/quotes
遵守：分单位；服务端算 G/F；不信任前端 G/F；超区间要 overRangeReason
文件：provider.ts, quote.service.ts, platform-fee.ts
验收：AC-03, AC-04, platform-fee 单测
禁止：Hermes、认证体系
```

## 12.4 MR Checklist

- [ ] 新金额字段均为 cents Int
- [ ] quote 链路无 Float
- [ ] 服务端重算 G/F
- [ ] 成交快照完整
- [ ] 绕路接口已封
- [ ] 单测+幂等测试
- [ ] 接单端无隐藏预算
- [ ] 发布方 UI 无 P/F

---

# 13. Sprint 计划

## Sprint 1（3～5 天）：底座

- `lib/platform-fee.ts` + 单测
- Prisma：`TaskOrderQuote`、快照字段、`PlatformMediaPriceBand`
- 价目带种子 15～30 条
- settlement 读快照方案

## Sprint 2（5～7 天）：报价闭环

- POST quotes、GET provider/quotes
- 大厅脱敏、报价 UI
- acceptQuote 事务、发布比价页
- 封绕路接口

## Sprint 3（3～5 天）：发单与验收

- publishCampaignPlan 拆单不冻结
- DeliveryPlanView 改造
- 状态文案、E2E 3 单、Feature Flag

## P1 Backlog

ProviderMediaResource、报价撮合中心、退款调账、BudgetAccount 迁分、批量确认、资质审核。

---

# 14. 待决事项

| ID | 问题 | 推荐 | 决策人 |
|---|---|---|---|
| D-01 | 最低到手价 | ¥10（1000 分） | 产品/运营 |
| D-02 | 试点任务类型 | 先官媒/垂类，文章类 P1 | 产品 |
| D-03 | 超隐藏上限 | P0 硬拦截 | 产品 |
| D-04 | awaiting_freeze UI | DB 有态，UI 可合并 | 研发 |
| D-05 | 历史无快照单 | `isDemoSettlement=true` | 财务 |
| D-06 | 价目带维护 | P0 运营种子 | 运营 |

---

# 15. 错误码

| code | HTTP | 说明 |
|---|---:|---|
| `QUOTE_PRICING_MODE_REQUIRED` | 400 | fixed 单不可走 quotes |
| `QUOTE_BELOW_MIN` | 400 | 低于最低到手价 |
| `QUOTE_EXPIRED` | 400 | 报价过期 |
| `QUOTE_OVER_TASK_CAP` | 400 | 超单篇上限 |
| `QUOTE_OVER_PLAN_CAP` | 400 | 超总隐藏上限 |
| `QUOTE_ORDER_NOT_OPEN` | 400 | 非可报价状态 |
| `QUOTE_ALREADY_SELECTED` | 409 | 已选中报价 |
| `FREEZE_INSUFFICIENT_BALANCE` | 400 | 余额不足 |
| `CLAIM_NOT_ALLOWED_FOR_QUOTE` | 400 | quote 单不可 claim |
| `APPLICATION_NOT_ALLOWED_FOR_QUOTE` | 400 | quote 单不可走旧申请确认 |
| `PROVIDER_NOT_APPROVED` | 403 | 未审核通过 |
| `QUOTE_IDEMPOTENCY_CONFLICT` | 409 | 幂等 key 与 body 不一致 |

---

# 16. 给老板同步摘要

撮合规则已定：**发布方只付 G；接单方填 P0；平台从 G 扣 30%**。发布方不看 P/F；接单方与财务透明。研发 P0 不推翻三端，纵切 `TaskOrderQuote` + accept 事务 + 按 G 冻结 + 快照结算。评审拍板：P0 边界、模型、冻结、三轮 Sprint。

---

# 附录 A：与 v2.1 结构对照

| v2.1 | v2.2 |
|---|---|
| 需求清单 | Epic + Gherkin + Sprint |
| 分散 AC | 第 11 章验收矩阵 |
| 无灰度 | Feature Flag + 回滚 |
| 无 Agent 包 | 第 12 章 |
| 价目带在文中有述 | 8.1 含完整 Prisma |

---

# 附录 B：与旧逻辑兼容

| 场景 | 处理 |
|---|---|
| `pricingMode=fixed` 历史单 | 保留 claim、原 budget |
| `TaskOrderApplication` | 保留表；新流程用 `TaskOrderQuote` |
| `TaskOrder.budget` Float | quote 单成交后可同步 `budget=G/100` 仅展示 |
| `PLATFORM_FEE_RATE=0.08` 旧单 | 无快照 → `isDemoSettlement=true` |
| Demo 模拟余额/充值 | 不进入真实 quote 账务 |

---

# 附录 C：研发模块索引

> 线上分支路径可能不同，按模块名搜索。

| 模块 | 参考路径（本仓库快照） |
|---|---|
| 费率计算 | `lib/platform-fee.ts`（新建） |
| 报价服务 | `server/services/quote.service.ts`（新建） |
| 价目带种子 | `server/db/seed-media-price-bands.ts`（新建） |
| 发布计划 | `server/services/campaign.service.ts` |
| 发单路由 | `server/routes/campaign.ts`、`orders.ts` |
| 接单大厅 | `server/services/provider.service.ts`、`routes/provider.ts` |
| 冻结 | `server/services/budget.service.ts`、`gate.service.ts` |
| 结算 | `server/services/settlement.service.ts`、`withdrawal.service.ts` |
| 发布端 UI | `src/components/DeliveryPlanView.tsx`、`TaskOrderDetailView.tsx` |
| 接单端 UI | `src/apps/provider/views/ProviderTaskView.tsx`、`ProviderOrderView.tsx` |
| 平台 UI | `src/apps/platform/views/PlatformOrdersView.tsx` |
| Schema | `prisma/schema.prisma` |
| GEO 输出 | `lib/campaign-package-output.ts`、`server/agent/task-success.ts` |
| 状态文案 | `src/lib/task-order-flow.ts` |

---

**文档结束**
