# GEO 产品级交付标准

本标准适用于 `geo-audit`、`geo-report-web`、`geo-report-pdf`、`geo-article-generation-web`、`geo-article-rewrite-web`、`geo-content`、`geo-citability`、`geo-platform-ranking-sampling`。

## 1. 用户购买的结果

用户购买的不是 Hermes 运行成功或 JSON 返回成功，而是以下四类结果：

1. **看得懂**：非技术客户能在 3 分钟内理解现状、问题、机会和下一步。
2. **能汇报**：报告可直接用于客户沟通和管理层决策，结论有证据、有优先级、有投入产出解释。
3. **能执行**：每项建议明确对象、动作、负责人、交付物、验收指标和时间窗口。
4. **能验证**：发布前有基线，发布后有同口径复测，并区分观察变化、相关性和因果归因。

`run.status=completed` 不等于业务完成。未通过本标准的产物必须标记 `DONE_WITH_CONCERNS` 或 `BLOCKED`，不得包装为正式交付。

## 2. 证据等级

所有结论、指标和评分必须带 `evidenceLevel`：

| 等级 | 含义 | 可使用措辞 |
|---|---|---|
| measured | 工具/API/浏览器真实采样，保留时间、环境和原始证据 | “实测”“观察到” |
| verified | 用户材料或公开来源经交叉核验 | “已核验” |
| user_provided | 用户提供但未独立核验 | “据客户提供” |
| estimated | 模型推断或规则估算 | “预计”“建议验证” |
| unavailable | 无法获得数据 | “未评估”，禁止填 0 |

评分必须同时输出 `scoreVersion`、`coverage`、`measuredShare`。当 `measuredShare < 0.5` 时，禁止使用“综合表现优秀/领先”等确定性结论。

## 3. 客户报告强制结构

正式报告至少包含：

1. 一页管理层摘要：一句话结论、3 个关键发现、3 个优先动作、证据覆盖率。
2. 当前基线：平台、Prompt、样本、时间、设备/地区、品牌和竞品表现。
3. 问题与机会：事实问题、内容问题、结构问题、信源问题分开描述。
4. 证据明细：原始回答摘要、引用 URL、截图或抓取证据、来源新鲜度。
5. 90 天行动路线：P0/P1/P2、Owner、工作量、依赖、交付物、验收指标。
6. 发布计划：目标问题、目标页面/文章、渠道、发布日期、内容版本。
7. 效果验证计划：T0、T+7、T+14、T+30 的同口径复测与停止/迭代规则。
8. 限制与风险：缺失数据、平台波动、无法归因事项、合规风险。

报告不能只罗列分数；每个分数必须回答“为什么、证据是什么、应该做什么、怎么验收”。

## 4. 内容产物强制门禁

文章或页面内容进入“可发布”前必须满足：

- 每个目标问题都有可独立抽取的直接回答块。
- 品牌、产品、价格、案例、资质和数据均来自知识库或明确来源；未知内容不得补写。
- 包含定义、事实表/步骤、FAQ、来源、更新时间、作者/审核信息建议。
- 给出目标 Prompt、目标实体、候选引用句和内链/Schema 建议。
- 完成 CORE-EEAT 关键项检查；存在事实冲突、虚构案例、无来源医疗功效等问题时必须 `BLOCK`。
- 输出“发布前评分”和“预计改进点”时标记为 `estimated`，不得承诺排名或引用结果。

## 5. 效果指标

真机采样至少计算：

- 品牌出现率、候选率、推荐率。
- 引用官网率、有效引用率、描述准确率。
- 竞品出现率、平均可识别排序、负面/错误表述率。
- 同 Prompt 多次采样的答案稳定性。
- 成功采样率与证据完整率。

只有平台输出明确有序列表时才计算排序；无可靠顺序时 `rank=null`。

## 6. 发布前后验证与归因

每个效果验证项目必须绑定：

- `baselineId`、`contentId`、`contentVersion`、`publishedUrl`、`publishedAt`。
- 固定 Prompt 集、平台、地区、设备/账号状态和采样规则版本。
- 处理组 Prompt 与至少一组对照 Prompt；条件允许时增加竞品对照。
- T0、T+7、T+14、T+30 观察窗口。
- 同期外部事件记录，如品牌新闻、平台模型更新、竞品投放和季节变化。

归因结论只能使用：`observed_change`、`possible_association`、`medium_confidence_attribution`、`high_confidence_attribution`。只有具备基线、对照、足够样本、稳定方向和混杂因素记录时才能使用后两档。

## 7. 业务完成门禁

核心 Skill 必须输出：

```json
{
  "deliveryStatus": "DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_INPUT",
  "qualityGate": {
    "verdict": "SHIP|FIX|BLOCK",
    "score": 0,
    "evidenceCoverage": 0,
    "measuredShare": 0,
    "blockers": []
  },
  "nextBestAction": {
    "action": "",
    "owner": "",
    "acceptance": ""
  }
}
```

`SHIP` 的最低要求：契约完整率 100%、虚假引用 0、关键事实冲突 0、证据覆盖率不低于 80%、客户报告必需章节齐全。

