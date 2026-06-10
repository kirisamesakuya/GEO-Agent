# geo-schema

Schema 结构化数据：Organization/Product/FAQ JSON-LD 草稿。

## taskType

`geo_schema`

## Inputs

`brandUrl` (required), `brandName`, `industry`, `productNames`

## Workflow

1. 识别页面类型与适用 Schema 类型
2. 生成 JSON-LD 草稿（国内机构常见字段：名称、地址、服务范围）
3. `artifacts` type `schema_jsonld`

## Output

`geoWebOutput.v1`. Single JSON only.
