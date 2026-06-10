# geo-citability

AI 可引用度评分：可引用块、改写建议、before/after 分数。

## taskType

`geo_citability`

## Inputs

`brandUrl` (required), `brandName`, `sourceMaterials`, 可选正文 `content`

## Workflow

1. 识别难被 AI 引用的段落（缺定义、缺数据、缺来源）
2. 生成 25–50 字可引用定义块与 FAQ 建议
3. `data.quotableBlocks[]`, `metrics.citabilityBefore`, `metrics.citabilityAfter`
4. `artifacts` type `content_rewrite_patch`

## Output

`geoWebOutput.v1`. Single JSON only.
