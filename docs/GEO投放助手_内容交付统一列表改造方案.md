# GEO 投放助手｜内容交付统一列表改造方案

更新时间：2026-06-08

## 1. 背景与判断

当前「内容交付」被拆成了「内容列表 / 发布记录 / 人工交付 / 网页需求」四个 Tab，其中前三项本质都围绕同一条交付链路：

1. 写文章
2. 审核文章
3. 发布文案
4. 查看发布结果与证据
5. 确认验收

现有拆分把来源不同的内容拆成了多个页面：

- 「内容列表」主要承载 AI 生成的 GEO 文章。
- 「发布记录」主要承载 AI 生成文章的发布记录。
- 「人工交付」主要承载人工写作、审稿、发布、验收。

这些并不是三套独立业务，而是同一套「文章交付」业务的不同来源和不同阶段。继续拆成多个大模块，会让用户需要先理解“这篇文章来自哪里”，再判断该去哪个列表处理，增加认知成本。

本期建议收敛为一个主列表，通过表头字段、筛选项和详情页状态区分来源、阶段与处理动作。

## 2. 改造目标

### 2.1 信息架构目标

将「内容交付」收敛为两个可见区域：

- 文章交付：统一承载 AI 生成文章、AI 发布记录、人工文章交付。
- 网页需求：保留精简入口，只记录后台是否已交付。

本期隐藏非文章类人工交付，不在前台呈现完整流程。

### 2.2 用户理解目标

用户进入「内容交付」后，只需要理解一件事：

> 这里是所有文章从生产到发布再到验收的交付台。

用户不需要先判断“AI 生成文章”“发布记录”“人工交付”分别在哪里，只需要通过筛选找到对应记录。

## 3. 新页面结构

### 3.1 顶层 Tab 调整

当前：

- 内容列表
- 发布记录
- 人工交付
- 网页需求

建议改为：

- 文章交付
- 网页需求

其中：

- 「文章交付」为默认 Tab。
- 「网页需求」为本期精简版。
- 「发布记录」不再作为一级 Tab，变成文章交付表的一类状态或证据字段。
- 「人工交付」不再作为一级 Tab，人工文章订单进入统一文章交付列表。

### 3.2 本期隐藏范围

非文章类交付本期暂不展示：

- 视觉设计
- 短视频
- 网页改造中间过程
- 账号运维
- 其他非文章服务

代码中保留相关判断和注释，避免后续恢复时丢失上下文。

建议注释策略：

```ts
// 本期内容交付仅开放文章类交付；非文章类任务暂不在前台列表展示。
// 后续如恢复短视频/设计/账号运维等交付类型，可从这里扩展 source/type 筛选。
```

## 4. 统一文章交付表设计

### 4.1 数据来源

统一表需要合并两类数据：

- AI 生成文章：来自内容批次 / 内容库 / GEO 内容项目。
- 人工文章订单：来自接单任务订单，且满足文章类判断。

两类数据统一映射成 `ArticleDeliveryRow`。

建议前端聚合模型：

```ts
type ArticleDeliverySource = 'ai_generated' | 'manual_order' | 'imported';

type ArticleDeliveryStage =
  | 'writing'
  | 'draft_review'
  | 'draft_revision'
  | 'pending_publish'
  | 'publishing'
  | 'published'
  | 'publish_failed'
  | 'pending_acceptance'
  | 'final_revision'
  | 'completed'
  | 'disputed';

interface ArticleDeliveryRow {
  id: string;
  source: ArticleDeliverySource;
  sourceId: string;
  brandName: string;
  title: string;
  platform: string;
  ownerLabel: string;
  stage: ArticleDeliveryStage;
  createdAt: string;
  updatedAt?: string;
  publishUrl?: string;
  evidenceCount?: number;
  projectName?: string;
  budget?: number;
}
```

### 4.2 表格字段

建议表头：

| 字段 | 说明 |
| --- | --- |
| 文章标题 | 统一展示 AI 文章标题或人工订单标题 |
| 来源 | AI 生成 / 人工写作 / 导入 |
| 平台 | 小红书 / 知乎 / 公众号 / 多平台 |
| 项目 / 接单方 | AI 生成项目名或接单方名称 |
| 状态 | 当前交付阶段 |
| 更新时间 | 优先展示最近处理时间 |
| 发布结果 | 已发布时展示链接/证据数量，未发布为空 |
| 操作 | 查看、发布、审核、验收等根据状态出现 |

预算字段不建议默认展示在主表。它更适合人工订单详情页，因为 AI 生成文章通常没有单条预算。若业务方需要，可放入表头设置或详情侧栏。

### 4.3 筛选项

统一列表上方建议保留三组筛选：

- 状态筛选：全部、写作中、待审稿、审稿返修、待发布、已发布、发布失败、待验收、已完成。
- 来源筛选：全部来源、AI 生成、人工写作、导入。
- 平台筛选：全部平台、小红书、知乎、公众号、其他。

可选补充：

- 品牌筛选：沿用现有 BrandSwitcher。
- 项目筛选：仅当来源为 AI 生成时启用。
- 接单方筛选：仅当来源为人工写作时启用。

## 5. 状态映射方案

### 5.1 AI 文章状态映射

| 现有状态 | 统一状态 | 展示文案 |
| --- | --- | --- |
| draft / generated | writing | 待发布 |
| scheduled | publishing | 已排程 |
| published | published | 已发布 |
| failed / publish_failed | publish_failed | 发布失败 |

AI 文章如已发布，需要在同一行展示发布结果入口，不再跳到独立「发布记录」Tab 查找。

### 5.2 人工文章订单状态映射

| 订单状态 | 统一状态 | 展示文案 |
| --- | --- | --- |
| published | writing | 待接单 |
| in_progress | writing | 写作中 |
| draft_review | draft_review | 待审稿 |
| draft_revision | draft_revision | 审稿返修 |
| draft_approved | pending_publish | 待发布 |
| pending_review | pending_acceptance | 待验收 |
| revision | final_revision | 最终返修 |
| completed | completed | 已完成 |
| disputed | disputed | 争议中 |

状态展示应尽量贴近用户任务，而不是内部状态。例如 `draft_approved` 不展示为“草稿已通过”，而展示为“待发布”。

## 6. 详情页交互

统一列表点击「查看」后进入统一详情容器，根据来源渲染对应内容：

- AI 生成文章：展示文章内容、生成项目、发布平台、发布结果、证据。
- 人工文章订单：展示草稿、审稿意见、发布链接、截图证明、验收动作。

详情页顶部统一展示：

- 文章标题
- 来源
- 平台
- 当前状态
- 最近更新时间

详情页动作按状态出现：

| 状态 | 主要动作 |
| --- | --- |
| 待审稿 | 审稿通过、要求修改 |
| 待发布 | 发布 / 查看发布准备 |
| 已发布 | 查看链接、查看证据 |
| 待验收 | 验收通过、要求最终返修、发起争议 |
| 发布失败 | 查看失败原因、重新发布 |

## 7. 网页需求本期精简方案

网页需求本期以后台线下交付为主，线上只做最小闭环，不展示复杂中间状态。

### 7.1 顶层定位

「网页需求」不是完整线上交付流程，而是一个交付结果登记入口。

页面目标：

- 记录客户提交过哪些网页需求。
- 记录后台是否已经交付。
- 展示最终交付链接或说明。

### 7.2 状态精简

建议只保留：

| 状态 | 含义 |
| --- | --- |
| 待交付 | 后台尚未登记交付结果 |
| 已交付 | 后台已登记交付链接或说明 |
| 需补充 | 后台需要客户补充信息 |

暂时隐藏：

- 执行中
- 排期中
- 审核中
- 多轮返修
- 线上验收流

### 7.3 表格字段

| 字段 | 说明 |
| --- | --- |
| 页面类型 | 官网、落地页、专题页等 |
| 目标说明 | 用户提交的核心诉求 |
| 状态 | 待交付 / 已交付 / 需补充 |
| 提交时间 | 需求创建时间 |
| 交付结果 | 已交付时显示链接或“已登记” |
| 操作 | 查看 |

## 8. 涉及代码模块

### 8.1 前端模块

需要重点调整：

- `src/components/ContentDeliveryView.tsx`
- `src/lib/content-delivery-nav.ts`
- `src/components/geo-project/GeoProjectLibraryShell.tsx`
- `src/components/ContentLibraryView.tsx`
- `src/components/PublishRecordsPanel.tsx`
- `src/components/OrderDeliveryView.tsx`
- `src/components/delivery/TaskOrderDetailView.tsx`
- `src/components/delivery/WebPageRequirementDetailView.tsx`
- `src/lib/order-delivery-filters.ts`
- `src/lib/task-order-flow.ts`
- `src/lib/article-result-nav.ts`
- `src/lib/website-requirement-nav.ts`

建议新增：

- `src/lib/article-delivery-unified.ts`
- `src/components/delivery/ArticleDeliveryUnifiedView.tsx`
- `src/components/delivery/ArticleDeliveryDetailView.tsx`

### 8.2 后端模块

短期可以前端聚合，减少后端改动。

更稳妥的后续方案是新增统一接口：

- `GET /api/article-deliveries`
- `GET /api/article-deliveries/:id`

涉及服务：

- `server/services/content.service.ts`
- `server/services/article-generation.service.ts`
- `server/services/article-delivery.service.ts`
- `server/services/order.service.ts`

## 9. 分阶段落地计划

### Phase 1：先收敛前端信息架构

目标：

- 内容交付只保留「文章交付 / 网页需求」两个 Tab。
- 「文章交付」展示统一列表。
- 人工交付只展示文章类订单。
- 非文章类订单代码注释隐藏。
- 发布记录并入文章行的发布结果字段。

实现方式：

- 新增统一行模型和前端聚合函数。
- AI 文章数据继续调用现有内容接口。
- 人工文章数据继续调用现有订单接口。
- 表格内通过 `source` 区分详情跳转。

### Phase 2：统一详情与动作入口

目标：

- 同一详情容器承载 AI 文章和人工文章。
- 审稿、发布、验收动作按照状态展示。
- 发布结果和发布证据在详情页集中查看。

实现方式：

- 保留现有详情能力，先做统一外壳。
- AI 文章详情复用现有内容库详情。
- 人工文章详情复用现有 `TaskOrderDetailView` 的审稿和验收逻辑。

### Phase 3：后端统一接口

目标：

- 前端不再分别理解内容批次、发布记录、订单。
- 后端输出统一文章交付列表。

实现方式：

- 新增 `article-deliveries` 聚合服务。
- 将来源、状态、平台、发布结果在后端统一映射。
- 保留旧接口兼容一段时间。

## 10. 验收标准

### 10.1 页面验收

- 进入 `content_delivery` 默认看到「文章交付」统一表。
- 页面不再出现「内容列表 / 发布记录 / 人工交付」三个并列 Tab。
- AI 生成文章和人工文章订单出现在同一张表。
- 表格可以按来源、状态、平台筛选。
- 非文章类人工订单不出现在本期内容交付列表。
- 网页需求只展示精简状态，不出现复杂执行流。

### 10.2 业务验收

- 用户能从一张表理解每篇文章当前处于写作、审核、发布、验收中的哪一步。
- 已发布文章可以直接在同一行或详情页查看发布链接和证据。
- 人工文章可以继续完成审稿、要求修改、验收通过、最终返修。
- 网页需求能记录是否已由后台交付。

### 10.3 兼容验收

- 旧 URL 参数 `deliveryTab=list`、`deliveryTab=publish_records`、`deliveryTab=manual` 均跳转或归一到「文章交付」。
- `deliveryTab=website` 仍进入「网页需求」。
- 旧详情跳转 hint 仍可打开对应文章或订单详情。

## 11. 推荐结论

本次不建议继续强化「内容列表 / 发布记录 / 人工交付」三个独立模块，而应把它们统一成「文章交付」。

核心改动不是新增复杂功能，而是把同一条业务链路放回同一张表里，用来源、状态、平台、项目/接单方等字段解决差异。这样既符合本期只有文章类交付的范围，也能为后续恢复非文章交付、网页线上化、统一后端接口留下扩展位置。
