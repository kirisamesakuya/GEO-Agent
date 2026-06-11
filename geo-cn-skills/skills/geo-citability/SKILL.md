# geo-citability

AI 可引用度评分：可引用块、改写建议、before/after 分数。

## taskType

`geo_citability`

## Inputs

`brandUrl` (required), `brandName`, `sourceMaterials`, 可选正文 `content`

## Workflow

执行前读取产品级交付标准（源码 `../../shared/product-grade-delivery-standard.md`；安装后 `../_shared/product-grade-delivery-standard.md`）。

1. 按目标 Prompt 检查直接回答、定义完整性、事实密度、来源支持、实体消歧、结构闭合和内容新鲜度。
2. 生成 25-80 字可独立理解的候选引用块、事实表、FAQ 和来源补齐建议。
3. 每个候选引用块必须关联目标 Prompt、来源 ID、适用页面和禁止夸大的边界。
4. 输出 before/after 评分时注明 `estimated`；只有发布后真机采样才能验证引用表现。
5. `data.quotableBlocks[]`, `data.queryCoverage[]`, `data.sourceLedger[]`, `metrics.citabilityBefore`, `metrics.citabilityAfter`。
6. `artifacts` 输出可应用的内容补丁和发布后 T+7/14/30 复测清单。

## Output

`geoWebOutput.v1`. Single JSON only.
