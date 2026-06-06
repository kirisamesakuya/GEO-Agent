# GEO 投放助手：项目化内容库与多项目发布排程小迭代方案

版本：v1.3.3 项目化内容与排程专项  
日期：2026-06-05  
关联文档：`GEO投放助手_AI写文章调用链路小版本迭代方案.md`、`GEO投放助手_AI写文章效果验证与排名监控联动小迭代方案.md`、`GEO投放助手_本机发布账号管理迭代计划.md`、`GEO投放助手_正式开发版_PRD_v1.1_最新设计风格.md`  
开发口径：本小版本只解决“GEO 写作按项目生成、多渠道内容统一管理、多项目定时发布排程”的产品与技术边界；Hermes 只作为本机发布执行适配器，不作为业务队列、发布计划状态机或批量并发发布器。

---

## 1. 检查结论

GEO 写作不是孤立生成一篇文章，而是围绕一个 GEO 项目，面向多个 AI 问题、多个关键词、多个内容平台生成一组内容资产。

因此内容库也应该从“按品牌 / 平台批次”升级为“按项目组织”：

```text
GEO 项目
  ├─ 来源：GEO 报告 / 排名监控缺口 / 手动目标
  ├─ 目标：问题集、关键词、AI 平台、发布平台
  ├─ 内容：多渠道文章、问答、FAQ、测评、案例
  ├─ 发布：多个账号、多个时间点、逐条执行
  └─ 验证：发布后排名监控复测
```

发布计划可以支持多选项目和多时间点，但落到 Hermes 执行时必须拆成细粒度任务：

```text
用户选择多个项目 + 多个时间点
        ↓
业务系统生成发布计划
        ↓
拆成多条 PublishJob / PublishRecord
        ↓
每条任务 = 1 篇文章 + 1 个平台 + 1 个账号 + 1 个时间点
        ↓
到点后创建 1 个 hermes_publish AgentTask
        ↓
Hermes 执行、截图、回填链接、失败分类
```

---

## 2. 当前缺口

| 缺口 | 当前问题 | 补齐方向 | 优先级 |
|---|---|---|---|
| 内容库没有项目层 | `ContentBatch` 主要按品牌、平台、任务批次组织 | 新增 GEO 写作项目，内容批次归属项目 | P0 |
| 多渠道内容分散 | 小红书、知乎、公众号文章以批次存在，缺少同一目标下的总览 | 项目详情按渠道、状态、目标问题聚合 | P0 |
| 发布计划偏单批次 | 当前发布计划更适合单品牌、单批次、单账号 | 发布排程支持选择多个项目和项目内文章 | P0 |
| Hermes 任务过粗 | 批量发布如果直接丢给 Hermes，失败和留证不可控 | 后端拆成单条发布任务，Hermes 逐条执行 | P0 |
| 时间点不够细 | 只支持计划级首发时间和频率，缺少文章级时间点 | 每篇文章/平台/账号保存独立 `scheduledAt` | P1 |
| 并发风控缺失 | 同账号多任务并发容易触发平台风控 | 同设备、同账号、同平台串行或限流 | P1 |
| 发布后验证未串联 | 项目排程完成后未自动进入效果验证 | 发布成功后关联排名监控复测 | P1 |

---

## 3. 产品边界

### 3.1 这个小版本要做什么

1. 新增“GEO 写作项目”概念，承载一次 GEO 内容补缺目标。
2. 内容库支持按项目查看，并在项目内按平台、状态、目标问题筛选文章。
3. AI 写文章生成结果写入指定项目。
4. 发布排程支持多选项目、选择项目内文章、选择账号、选择时间点。
5. 后端将多项目发布计划拆成逐条发布任务。
6. Hermes 到点只执行单条或小批量可控任务，并回写发布记录。

### 3.2 这个小版本不做什么

1. 不把 Hermes 作为本项目业务队列。
2. 不承诺多个平台全自动并发发布。
3. 不绕过验证码、扫码、人机验证或平台风控。
4. 不做复杂营销日历、团队审批流和跨组织排程。
5. 不以“已创建排程”代表“已发布成功”。

---

## 4. 信息架构调整

### 4.1 内容库

内容库默认按项目展示，而不是只按生成批次展示。

```text
内容库
├─ 项目列表
│  ├─ 云杉口腔 · 种植牙 GEO 补缺项目
│  ├─ 云杉口腔 · 隐形矫正问答覆盖项目
│  └─ 云杉口腔 · 品牌词防御项目
└─ 项目详情
   ├─ 项目目标
   ├─ 内容资产
   │  ├─ 小红书 3 篇
   │  ├─ 知乎 2 篇
   │  ├─ 公众号 1 篇
   │  └─ 百家号 2 篇
   ├─ 发布排程
   └─ 效果验证
```

项目卡片建议展示：

| 信息 | 说明 |
|---|---|
| 项目名称 | 由 GEO 报告/排名缺口/用户手动创建 |
| 来源 | GEO 报告、排名监控、手动项目 |
| 目标问题数 | 该项目要覆盖的 AI 问题 |
| 内容数量 | 已生成 / 已确认 / 已发布 |
| 发布进度 | 待排程、待发布、执行中、已完成、部分失败 |
| 效果状态 | 待复测、观察中、有效、无明显变化 |

---

### 4.2 项目详情

项目详情承载一次 GEO 内容战役的完整上下文。

```text
┌────────────────────────────────────────────────────────────┐
│ 项目：种植牙 GEO 补缺                                      │
│ 来源：GEO 报告 #xxxx / 排名监控计划 #xxxx                  │
├────────────────────────────────────────────────────────────┤
│ 目标问题：12 个   关键词：8 个   目标 AI 平台：豆包/元宝     │
├────────────────────────────────────────────────────────────┤
│ [内容资产] [发布排程] [效果验证] [项目日志]                 │
└────────────────────────────────────────────────────────────┘
```

内容资产表：

| 文章 | 渠道 | 目标问题 | 状态 | 发布计划 | 效果 |
|---|---|---|---|---|---|
| 南京种植牙怎么选 | 小红书 | 南京种植牙哪家靠谱 | 已确认 | 6/8 10:00 | 待复测 |
| 种植牙避坑 FAQ | 知乎 | 种植牙价格怎么判断 | 草稿 | 未排程 | 未开始 |

---

### 4.3 发布排程

发布排程支持两种入口：

1. 从单个项目详情进入：默认只排当前项目。
2. 从发布排程页进入：支持多选项目。

```text
发布排程
├─ 选择项目
│  ├─ [x] 种植牙 GEO 补缺
│  ├─ [x] 隐形矫正问答覆盖
│  └─ [ ] 品牌词防御
├─ 选择文章
│  ├─ 按渠道筛选
│  ├─ 按状态筛选
│  └─ 批量选择待发布文章
├─ 选择账号
│  ├─ 小红书账号 A
│  ├─ 知乎账号 B
│  └─ 公众号账号 C
└─ 设置时间
   ├─ 单一时间点
   ├─ 多个时间点
   └─ 自动错峰
```

时间设置建议：

| 模式 | 说明 |
|---|---|
| 单一时间点 | 所选内容从该时间开始排队，系统自动错峰 |
| 多个时间点 | 用户添加多个发布时间，系统按文章顺序分配 |
| 按间隔错峰 | 例如每 30 分钟发布 1 篇 |
| 手动指定 | 高级模式，逐篇指定时间 |

---

## 5. Hermes 技术实现边界

### 5.1 不能把多项目发布当成一个 Hermes 大任务

错误做法：

```text
把 3 个项目、20 篇文章、5 个账号、8 个时间点一次性丢给 Hermes
```

风险：

1. 中途失败后无法判断哪篇文章失败。
2. 平台验证码或风控会阻塞整个大任务。
3. 发布链接、截图、错误原因无法稳定回写到具体文章。
4. 同账号并发可能触发平台限制。
5. 用户无法逐条确认高风险动作。

正确做法：

```text
业务系统负责编排
Hermes 负责执行单条发布动作
每条动作都有独立 AgentTask、PublishRecord、LocalAutomationRun
```

---

### 5.2 Hermes 单条任务输入

每个到点发布任务建议输入如下：

```json
{
  "type": "hermes_publish",
  "brandName": "云杉口腔",
  "input": {
    "geoProjectId": "project-id",
    "contentItemId": "content-item-id",
    "publishRecordId": "publish-record-id",
    "targetPlatform": "小红书",
    "accountBindingId": "account-id",
    "accountName": "云杉口腔官方号",
    "title": "南京种植牙怎么选",
    "content": "文章正文...",
    "scheduledAt": "2026-06-08T10:00:00.000+08:00",
    "userConfirmed": true,
    "requiredEvidence": ["published_url", "screenshot", "platform_message"]
  }
}
```

Hermes 输出必须归一化后再由本项目落库：

```json
{
  "success": true,
  "publishedUrl": "https://example.com/post/123",
  "screenshotUrl": "/uploads/evidence/xxx.png",
  "platformMessage": "发布成功，等待审核",
  "reviewCategory": null
}
```

失败输出：

```json
{
  "success": false,
  "errorCode": "captcha_required",
  "reviewCategory": "need_manual_publish",
  "screenshotUrl": "/uploads/evidence/fail.png",
  "message": "平台要求扫码或验证码"
}
```

---

### 5.3 调度与并发规则

| 规则 | 说明 |
|---|---|
| 同账号串行 | 同一 `accountBindingId` 同一时间只运行 1 个发布任务 |
| 同平台限流 | 同一平台可配置最小间隔，例如 10-30 分钟 |
| 同设备限流 | 本机 Hermes 同时执行任务数默认 1 |
| 到点前复检 | 执行前校验账号登录态、内容状态、禁用词、用户确认 |
| 失败可重试 | `retry_ok` 可重试；`need_reauth` / `need_manual_publish` 进入人工处理 |
| 前端不可标成功 | 只有执行适配层回写后才能标记发布成功 |

---

## 6. 数据模型建议

### 6.1 新增 GeoContentProject

建议新增项目表：

| 字段 | 说明 |
|---|---|
| `id` | 项目 ID |
| `brandId` | 所属品牌 |
| `name` | 项目名称 |
| `sourceType` | `geo_report` / `indexing_gap` / `manual` |
| `sourceRef` | 来源报告、排名计划或任务 ID |
| `targetQuestionsJson` | 目标问题 |
| `targetKeywordsJson` | 目标关键词 |
| `targetAiPlatformsJson` | 目标 AI 平台 |
| `targetPublishPlatformsJson` | 目标发布平台 |
| `status` | `draft` / `writing` / `ready` / `scheduled` / `publishing` / `done` / `partial_failed` |
| `createdAt` | 创建时间 |
| `updatedAt` | 更新时间 |

### 6.2 ContentBatch / ContentItem 扩展

| 对象 | 字段 | 说明 |
|---|---|---|
| `ContentBatch` | `projectId` | 批次归属项目 |
| `ContentItem` | `projectId` | 可选冗余，便于查询 |
| `ContentItem` | `targetQuestionsJson` | 文章覆盖的问题 |
| `ContentItem` | `targetPublishPlatform` | 目标发布平台，兼容现有 `platform` |
| `ContentItem` | `publishStatus` | `not_scheduled` / `scheduled` / `published` / `failed` |

短期也可先把项目关系放在 `generationMetaJson`，但正式版建议落字段，避免内容库查询和排程筛选变复杂。

### 6.3 发布排程建议

当前 `PublishPlan` 可以继续作为计划主表，但建议补一个发布项表：

| 表 | 说明 |
|---|---|
| `PublishPlan` | 用户创建的一次排程计划，可跨项目 |
| `PublishJob` | 计划下的单条待执行任务 |
| `PublishRecord` | 执行结果记录，可由 `PublishJob` 创建或关联 |

`PublishJob` 建议字段：

| 字段 | 说明 |
|---|---|
| `id` | 发布项 ID |
| `planId` | 所属计划 |
| `projectId` | 所属 GEO 项目 |
| `contentItemId` | 文章 |
| `platform` | 发布平台 |
| `accountBindingId` | 发布账号 |
| `scheduledAt` | 计划发布时间 |
| `status` | `pending` / `ready` / `running` / `succeeded` / `failed` / `need_manual` / `cancelled` |
| `agentTaskId` | 对应 Hermes 任务 |
| `publishRecordId` | 对应发布记录 |
| `attemptCount` | 重试次数 |
| `lastErrorCode` | 最近失败原因 |

---

## 7. 接口建议

### 7.1 创建 GEO 写作项目

```http
POST /api/geo-content-projects
```

```json
{
  "brandName": "云杉口腔",
  "name": "种植牙 GEO 补缺项目",
  "sourceType": "indexing_gap",
  "sourceRef": "index-plan-id",
  "targetQuestions": ["南京种植牙哪家靠谱"],
  "targetKeywords": ["南京种植牙"],
  "targetAiPlatforms": ["豆包", "元宝"],
  "targetPublishPlatforms": ["小红书", "知乎", "公众号"]
}
```

### 7.2 文章生成写入项目

扩展 `article_generation` input：

```json
{
  "source": "geo_project",
  "geoProjectId": "project-id",
  "targetPublishPlatforms": ["小红书", "知乎"],
  "quantityByPlatform": {
    "小红书": 3,
    "知乎": 2
  }
}
```

### 7.3 创建多项目发布排程

```http
POST /api/publish-plans/bulk-schedule
```

```json
{
  "brandName": "云杉口腔",
  "name": "6 月种植牙内容发布排程",
  "projectIds": ["project-a", "project-b"],
  "contentItemIds": ["item-a", "item-b", "item-c"],
  "accountBindings": [
    {
      "platform": "小红书",
      "accountBindingId": "account-xhs"
    },
    {
      "platform": "知乎",
      "accountBindingId": "account-zhihu"
    }
  ],
  "schedule": {
    "mode": "staggered",
    "startAt": "2026-06-08T10:00:00.000+08:00",
    "intervalMinutes": 30
  }
}
```

返回：

```json
{
  "planId": "plan-id",
  "jobCount": 12,
  "jobs": [
    {
      "id": "job-id",
      "contentItemId": "item-a",
      "platform": "小红书",
      "scheduledAt": "2026-06-08T10:00:00.000+08:00",
      "status": "pending"
    }
  ]
}
```

---

## 8. 迭代拆分

### P0：项目化内容库

| 编号 | 功能 | 说明 |
|---|---|---|
| P0-01 | 新增 GEO 写作项目模型 | 承载来源、目标问题、目标平台 |
| P0-02 | 内容批次关联项目 | AI 写文章结果写入指定项目 |
| P0-03 | 内容库按项目展示 | 项目列表 + 项目详情内容资产 |
| P0-04 | 项目内按渠道/状态筛选 | 支持多渠道文章管理 |

### P1：多项目发布排程

| 编号 | 功能 | 说明 |
|---|---|---|
| P1-01 | 发布排程支持多选项目 | 可选择多个项目和文章 |
| P1-02 | 支持多个时间点/错峰 | 单时间、多时间、间隔错峰 |
| P1-03 | 拆分 PublishJob | 每篇文章生成独立发布项 |
| P1-04 | 发布前账号与内容校验 | 登录态、平台匹配、禁用词、确认状态 |

### P2：Hermes 执行与效果联动

| 编号 | 功能 | 说明 |
|---|---|---|
| P2-01 | 到点创建 hermes_publish 任务 | 单条发布项对应单个 AgentTask |
| P2-02 | 并发与限流 | 同账号串行、同平台间隔、本机默认单任务 |
| P2-03 | 失败分类和人工处理 | `need_reauth` / `need_manual_publish` / `retry_ok` |
| P2-04 | 发布成功触发效果复测 | 创建文章效果验证的排名监控计划 |

---

## 9. 验收标准

1. 用户可以创建一个 GEO 写作项目，并配置目标问题、关键词、AI 平台和发布平台。
2. AI 生成的多渠道文章可以归属到同一个项目。
3. 内容库默认按项目查看，并能在项目内筛选平台、状态和目标问题。
4. 发布排程可以选择至少 2 个项目，并生成多条待发布任务。
5. 每条待发布任务都有独立文章、平台、账号、发布时间和状态。
6. 到点后系统只为单条发布项创建 Hermes 发布任务。
7. 同账号发布任务不会并发执行。
8. 发布成功必须由 Hermes 适配层或后端执行层回写，不允许前端直接标记成功。
9. 发布失败能看到失败分类、截图或错误提示，并可进入人工处理或重试。

---

## 10. 建议实现顺序

1. 先落项目模型和内容库项目视图。
2. 再让 AI 写文章支持写入项目。
3. 再做多项目排程 UI，但先只生成 `PublishJob`，不接 Hermes。
4. 再接到点执行和单任务 Hermes 发布。
5. 最后接文章效果复测。

这样能先把产品心智从“文章批次”升级为“GEO 项目资产”，同时把 Hermes 风险控制在可测试、可回滚、可留证的单条任务里。
