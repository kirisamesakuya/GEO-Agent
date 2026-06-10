# geo-technical

GEO 技术基础审计：可抓取性、索引、性能信号、AI 可抽取性。

## taskType

`geo_technical`

## Inputs

`brandUrl` (required), `pageUrls`, `modules`, `sourceMaterials`

## Workflow

1. 首页 + `pageUrls` 技术检查（HTTPS、canonical、meta、结构化数据存在性）
2. 国内 CDN/备案页可达性注意
3. AI 可抽取性：语义标题、正文密度、FAQ 模块
4. `audit.scores.technicalGeo`, `findings` category=technical

## Output

`geoWebOutput.v1`. Single JSON only.
