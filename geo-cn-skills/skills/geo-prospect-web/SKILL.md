# geo-prospect-web

GEO 销售线索：结构化线索记录（国内字段：城市、行业、决策角色）。

## taskType

`geo_prospect`

## Inputs

`brandName`, `brandUrl`, `brandCity`, `industry`, `contact`, `notes`, clue text

## Workflow

1. 规范化线索 `data.prospect`
2. 下一步跟进 `actionPlan`
3. 不写本地 CRM 文件，仅 JSON 回传

## Output

`geoWebOutput.v1`. Single JSON only.
