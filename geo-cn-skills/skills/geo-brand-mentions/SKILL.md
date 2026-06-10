# geo-brand-mentions

品牌提及与实体整理（入驻/线索）：消歧、社媒与官网一致性。

## taskType

`brand_extract`

## Inputs

`brandName`, `brandUrl` (required), `industry`, `competitors`, `platforms`, `text`, `inputType`, `sourceMaterials`

## Workflow

1. 从官网/线索提取 profile 字段
2. 实体消歧（简称、同名行业）
3. `data.entities[]`, `data.disambiguation[]`
4. 证据写入 `data.sourceLedger`

## Output

`geoWebOutput.v1` + `data.profile` for GEO-Agent brand confirm.

Final response: single JSON only.
