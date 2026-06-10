# geo-report-pdf

GEO 报告 PDF 导出：基于已有审计 JSON 生成客户 PDF 交付件。

## taskType

`geo_report_pdf`

## Inputs

`brandName`, `geoReportId` or embedded `audit`/`artifacts`, `sourceReport`

## Workflow

1. 组装客户可读中文报告结构
2. `artifacts` type `pdf`（content 为 base64 或 url 若工具生成）
3. 需要 pandoc 时若无工具则 markdown artifact + finding

## Output

`geoWebOutput.v1`. Single JSON only.
