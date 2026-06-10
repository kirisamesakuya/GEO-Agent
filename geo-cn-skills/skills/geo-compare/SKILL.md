# geo-compare

GEO 月度对比：基线报告 vs 当前报告，五平台引用/提及变化。

## taskType

`geo_compare`

## Inputs

`brandName`, `currentReportId`, `baselineReportId` or `geoReport` snapshots, `brandUrl`, `platforms`

## Workflow

1. 对比 mentionRate、gaps、findings 数量、核心分数
2. 国内平台维度变化表 `data.platformDelta[]`
3. 月报摘要 artifact markdown
4. 无历史数据时 partial + finding

## Output

`geoWebOutput.v1`. Single JSON only.
