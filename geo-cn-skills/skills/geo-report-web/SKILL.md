# geo-report-web

GEO 客户报告汇总：合并检测/资产/对比产物为一份 Web 可读报告。

## taskType

`geo_report`

## Inputs

`brandName`, `geoReportIds[]` or task outputs, `brandUrl`, `platforms`

## Workflow

执行前读取产品级交付标准（源码 `../../shared/product-grade-delivery-standard.md`；安装后 `../_shared/product-grade-delivery-standard.md`）。

1. 合并 audit、findings、采样结果、发布记录和历史基线，统一证据 ID 与时间口径。
2. 生成面向管理层的一页摘要，先讲业务结论，再讲技术细节。
3. 报告固定包含：现状基线、竞品差距、关键证据、问题根因、P0/P1/P2 行动、90 天路线、发布清单、效果验证、限制与风险。
4. 每个指标标记 `measured | verified | user_provided | estimated | unavailable`，同时展示数据新鲜度和证据覆盖率。
5. 输出客户版 HTML + Markdown；可用渲染能力时同时输出 DOCX/PDF。四种格式必须共享同一内容结构。
6. 报告中的建议必须包含 Owner、工作量、截止窗口、验收指标和预期影响，不得只写“建议优化”。
7. `data.reportSections[]`、`data.executiveSummary`、`data.evidenceLedger`、`data.roadmap`、`data.measurementPlan`。

## Quality Gate

- 3 分钟内可读懂结论；首页不得以技术日志或 JSON 开场。
- 关键结论均可追溯证据；虚假引用为 0。
- 没有基线/对照时，只能描述观察和机会，不能宣称内容导致增长。
- 必需章节缺失、证据覆盖率 < 80% 或存在未解决关键事实冲突时不得 `SHIP`。

## Output

`geoWebOutput.v1`. Single JSON only.
