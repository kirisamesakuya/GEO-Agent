# geo-content

GEO 内容质量评估：E-E-A-T、内容库候选主题、改写 brief。

## taskType

`geo_content`

## Inputs

`brandUrl` (required), `brandName`, `industry`, `productNames`, `platforms`

## Workflow

1. CORE-EEAT 快扫 → `metrics.coreEeatQuickScore`
2. 可引用段落与缺口主题 `data.contentTopics[]`
3. 改写 brief `artifacts` markdown
4. `findings` category=content

## Output

`geoWebOutput.v1`. Single JSON only.
