# geo-article-generation-web

GEO 文章生成：科普/榜单/对比结构，适配国内 AI 可引用写法。

## taskType

`article_generation`

## Inputs

`brandName`, `brandUrl`, `title`, `keywords`, `contentType`, `geoReportId`, `knowledgeEntries`, `platforms`

## Workflow

执行前读取产品级交付标准（源码 `../../shared/product-grade-delivery-standard.md`；安装后 `../_shared/product-grade-delivery-standard.md`）。

1. 从 GEO 报告、排名缺口或品牌事实库读取目标 Prompt、目标实体、竞品和可核验来源；缺少事实依据时不得补写案例、数据、资质或功效。
2. 为每个目标 Prompt 设计独立可抽取回答块，再选择科普、榜单、对比、FAQ、研究报告等结构。
3. 文章必须包含：首段直接答案、清晰定义、事实/数据来源、结构化表格或步骤、FAQ、更新时间、作者/审核建议、内链与 Schema 建议。
4. 榜单/对比内容必须公开评价维度、入选条件、证据和利益关系；不得凭空把品牌排第一。
5. 输出候选引用句、目标 Prompt 覆盖矩阵、实体一致性检查和事实来源台账。
6. 执行 CORE-EEAT 关键门禁和受监管行业合规检查；关键事实冲突、虚构案例、无来源医疗功效直接 `BLOCK`。
7. `data.article` 必须包含 `title`, `body`, `meta`, `faq[]`, `targetPrompts[]`, `quotableBlocks[]`, `sourceLedger[]`, `schemaSuggestions[]`, `qualityReview`。
8. `artifacts` 至少包含可直接编辑发布的 Markdown 正文和发布检查清单。

## Done When

- 每个目标 Prompt 至少有一个 25-80 字可独立理解的回答块。
- 所有可验证断言均有来源或标为待确认；虚构来源为 0。
- `qualityGate.verdict=SHIP` 前，关键 CORE-EEAT 项不得存在未解决 Fail。
- “预计提升”只能标记 `estimated`，不得承诺 AI 引用或排名增长。

## Output

`geoWebOutput.v1`. Single JSON only.
