# CORE-EEAT 发布质检门（摘要）

摘自公开 SEO/GEO 质量框架，用于内容类技能自检与 `geo-citability` / `geo-content`。

## 否决项（未解决则 findings severity=critical）

- 核心事实无来源
- 夸大疗效/收益/合规承诺
- 关键实体（品牌/产品）无法消歧

## 快扫维度（17 项 on-page 相关）

标题意图匹配、首段定义、数据可追溯、作者/机构信号、FAQ、内链、图片 alt、更新日期。

## 输出

- `metrics.coreEeatQuickScore` — 0–100
- `findings` category=`content_quality`
- 深度 80 项全检在 Cursor 侧 `content-quality-auditor` 技能完成
