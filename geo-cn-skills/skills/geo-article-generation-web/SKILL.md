# geo-article-generation-web

GEO 文章生成：科普/榜单/对比结构，适配国内 AI 可引用写法。

## taskType

`article_generation`

## Inputs

`brandName`, `brandUrl`, `title`, `keywords`, `contentType`, `geoReportId`, `knowledgeEntries`, `platforms`

## Workflow

1. 按选题类型选结构（科普、榜单、对比、FAQ）
2. 首段定义 + 数据带来源 + FAQ + 内链建议
3. CORE-EEAT 快扫自检
4. `data.article` { title, body, meta, faq[] }
5. `artifacts` markdown

## Output

`geoWebOutput.v1`. Single JSON only.
