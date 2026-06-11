# geo-content

GEO 内容质量评估：E-E-A-T、内容库候选主题、改写 brief。

## taskType

`geo_content`

## Inputs

`brandUrl` (required), `brandName`, `industry`, `productNames`, `platforms`

## Workflow

执行前读取产品级交付标准（源码 `../../shared/product-grade-delivery-standard.md`；安装后 `../_shared/product-grade-delivery-standard.md`）。

1. 对关键内容执行完整发布门禁，至少覆盖直接回答、结构、可引用性、来源、独特信息、经验、专业性、权威性和可信度。
2. 输出 `SHIP | FIX | BLOCK`；事实冲突、虚假引用和高风险无依据功效为阻断项。
3. 给出逐项证据、修复方式、修复后验收标准和优先级，而不是只返回总分。
4. 可引用段落与缺口主题写入 `data.contentTopics[]`，目标 Prompt 覆盖写入 `data.queryCoverage[]`。
5. 改写 brief、发布检查清单和质量报告写入 `artifacts`。
6. 所有评分带版本、覆盖率和证据等级；数据不足项标记 N/A，不按 0 分处理。

## Output

`geoWebOutput.v1`. Single JSON only.
