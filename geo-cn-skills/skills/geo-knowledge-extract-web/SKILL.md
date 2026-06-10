# geo-knowledge-extract-web

品牌知识库抽取：事实卡、FAQ、禁用表达、实体清单。

## taskType

`knowledge_extract`

## Inputs

`brandName`, `brandUrl`, `industry`, `productNames`, `sourceMaterials`, `platforms`

## Workflow

1. 官网/材料抽取结构化事实
2. `data.factCards[]`, `data.faq[]`, `data.prohibitedExpressions[]`
3. `data.entityInventory[]`, `data.sourceLedger`
4. 供文章生成与监测复用

## Output

`geoWebOutput.v1` + `data.entries` for knowledge base confirm. Single JSON only.
