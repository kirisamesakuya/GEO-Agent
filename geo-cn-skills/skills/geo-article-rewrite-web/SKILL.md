# geo-article-rewrite-web

旧文 GEO 改造：结构化、可引用、可抽取。

## taskType

`article_rewrite`

## Inputs

`brandName`, `brandUrl`, `content` or `contentId`, `sourceMaterials`, `platforms`

## Workflow

1. 原文评分 `metrics.geoScoreBefore`
2. before/after diff 摘要
3. 原子事实卡、FAQ 增补
4. `data.rewrittenArticle`, `metrics.geoScoreAfter`
5. `artifacts` markdown diff report

## Output

`geoWebOutput.v1`. Single JSON only.
