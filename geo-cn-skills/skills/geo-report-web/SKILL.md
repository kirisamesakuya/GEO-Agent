# geo-report-web

GEO 客户报告汇总：合并检测/资产/对比产物为一份 Web 可读报告。

## taskType

`geo_report`

## Inputs

`brandName`, `geoReportIds[]` or task outputs, `brandUrl`, `platforms`

## Workflow

1. 合并 audit、findings、artifacts 为统一目录
2. 中文客户报告 `artifacts` html + markdown
3. `data.reportSections[]`

## Output

`geoWebOutput.v1`. Single JSON only.
