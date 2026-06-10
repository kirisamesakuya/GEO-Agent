# 国内 AI 平台 GEO 监测要点

默认监测平台：**DeepSeek、豆包、千问、Kimi、元宝**。

## 问法特征

- 口语化、场景化：「哪家好」「怎么选」「多少钱」「靠谱吗」
- 对比型：「A 和 B 哪个好」「替代方案」
- 地域型：「北京/上海 XX 行业推荐」

## 采样注意

- 无浏览器/API 证据时，不得编造提及率或排名。
- 在 `metrics.samplingStatus` 标 `partial` 或 `not_run`。
- 将建议监测 Prompt 写入 `data.monitoringPrompts[]`。

## 内容适配

- 可引用块：25–50 字定义 + 带来源的数据点 + FAQ。
- 避免仅 SEO 关键词堆砌；优先问答结构与表格。
