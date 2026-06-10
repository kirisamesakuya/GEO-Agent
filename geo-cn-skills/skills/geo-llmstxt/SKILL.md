# geo-llmstxt

llms.txt 生成与校验：根路径 AI 抓取说明（中文站点说明块）。

## taskType

`geo_llmstxt`

## Inputs

`brandUrl` (required), `brandName`, `sourceMaterials`

## Workflow

1. 梳理值得索引的路径与禁止路径
2. 生成 llms.txt 正文（含品牌摘要、核心产品链接）
3. `artifacts` type `llms_txt`, `data.validation` 校验项

## Output

`geoWebOutput.v1`. Single JSON only.
