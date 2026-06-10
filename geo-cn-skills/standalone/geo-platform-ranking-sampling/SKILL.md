# geo-platform-ranking-sampling

国内 AI 平台**真机监测采样**：在 DeepSeek、豆包、千问、Kimi、元宝上执行监测 Prompt，记录品牌是否被提及、是否引用官网/第三方、回答摘要与引用链接。

**GEO-Agent taskType**: `index_sampling`

## When to Use

- 排名监控 / GEO 监控执行采样
- 文章效果验证复测（T+7/14/30）
- 验证某品牌在一组关键词下的 AI 可见度

## Required Runtime

- Hermes Gateway + **browser automation** 可用
- `samplingMode: live_browser` 时必须真实打开平台页面查询
- 无浏览器或无登录且无匿名入口 → 标 `unavailable` / `login_required`，**禁止编造 hit**

## Inputs (`metadata.input`)

| 字段 | 必填 | 说明 |
|------|------|------|
| `keywords` | 是* | 监测问句数组 |
| `platforms` | 是 | 默认：DeepSeek、豆包、千问、Kimi、元宝 |
| `brandName` | 推荐 | 用于判断 brandMentioned / citedMerchant |
| `brandUrl` | 推荐 | 判断是否引用官网 |
| `competitors` | 否 | 记录 competitorMentions |
| `monitoringPrompts` | 否 | `[{ platform, prompt, intent }]`，优先于 keywords |
| `planId` | 否 | GEO-Agent 计划 ID |
| `queryAt` | 否 | ISO 采样基准时间 |
| `region` | 否 | 默认 `CN` |
| `language` | 否 | 默认 `zh-Hans` |
| `samplingMode` | 否 | `live_browser` 表示真机 |

## Workflow

1. **准备矩阵** — 每个 `(keyword 或 monitoringPrompt, platform)` 一行任务。
2. **读平台 Playbook** — `references/platforms/<platform>.md`（入口 URL、登录检测、等待回答）。
3. **执行查询** — 仅当浏览器工具可用且页面可访问时提问；否则 `status: unavailable`。
4. **解析回答** — 提取：是否提及品牌、竞品、引用 URL、可引用摘要（≤500 字）。
5. **截图（可选）** — 成功采样写入 `artifacts` type `image` 或 Hermes run artifacts。
6. **汇总 metrics** — `hitRate`、`samplingStatus`（`complete` | `partial`）、`samplingMethod: hermes_browser`。
7. **输出 JSON** — 见下方；**顶层必须有 `results[]`** 供 GEO-Agent 落库。

## Per-Row `results[]` Shape

```json
{
  "keyword": "南京种植牙哪家好",
  "platform": "豆包",
  "hit": true,
  "brandMentioned": true,
  "citedMerchant": false,
  "rank": null,
  "citationSnippet": "回答中提及云杉口腔…",
  "aiResponse": "完整或截断回答正文",
  "citationUrls": [{ "title": "来源标题", "url": "https://..." }],
  "competitorMentions": ["竞品A"],
  "status": "sampled",
  "evidenceStatus": "measured",
  "sampledAt": "2026-06-09T10:00:00+08:00"
}
```

### `status` 枚举

- `sampled` — 成功获取回答
- `login_required` — 需用户在本机登录该平台
- `captcha` — 人机验证阻断
- `unavailable` — 无工具或页面不可达
- `error` — 其他错误（附 `errorMessage` 字段）

### `evidenceStatus`

- `measured` — 浏览器实测
- `user_provided` — 用户给定
- `estimated` — 仅推断（真机模式下尽量避免）

## Full Output (geoWebOutput.v1 + GEO-Agent bridge)

```json
{
  "summary": "2 平台 × 2 关键词，成功 3 条，需登录 1 条",
  "results": [],
  "metrics": {
    "totalQueries": 4,
    "hitRate": 0.5,
    "brandMentionRate": 0.25,
    "samplingStatus": "partial",
    "samplingMethod": "hermes_browser"
  },
  "audit": {
    "title": "AI 平台监测采样",
    "summary": "",
    "totalScore": null
  },
  "data": {
    "results": [],
    "sourceLedger": []
  },
  "findings": [],
  "artifacts": [],
  "actionPlan": []
}
```

`data.results` 应与顶层 `results` 内容一致。

## Safety

- 不得输出 cookie、session、token、完整登录态
- 不得在无证据时填写 `hit: true` 或具体排名位次
- 国内平台登录由用户在本机浏览器完成，技能只检测并报告 `login_required`

## Platform Playbooks

- [豆包](references/platforms/doubao.md)
- [DeepSeek](references/platforms/deepseek.md)
- [千问](references/platforms/qianwen.md)
- [Kimi](references/platforms/kimi.md)
- [元宝](references/platforms/yuanbao.md)

## Final Response Rule

The final assistant response must be a **single valid JSON object only**.
No Markdown fences. No prose before or after JSON.
