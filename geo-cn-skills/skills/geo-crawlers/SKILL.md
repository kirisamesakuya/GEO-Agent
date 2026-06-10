# geo-crawlers

AI 爬虫访问分析：robots、bot 矩阵、国内常见爬虫误拦检查。

## taskType

`geo_crawlers`

## Inputs

`brandUrl` (required), `brandName`, `sourceMaterials`

## Workflow

1. 解析 robots.txt、sitemap 可达性
2. 检查 GPTBot、Bytespider、Google-Extended 等规则
3. `findings` + `artifacts` type `robots_patch` 如需要
4. `metrics.crawlerAccessScore`

## Output

`geoWebOutput.v1`. Single JSON only.
