# geo-quick-start

GEO 快速检测（中国环境）：平台提及速检 + 内容可引用性快检。

## When to Use

- GEO-Agent taskType `geo_quick_start`
- 新品牌首次 AI 可见度体检
- 不需要全站深度审计时的轻量入口

## Inputs

Read `metadata.input`. Apply defaults from `shared/cn-defaults.json`:

- `brandName` (required)
- `brandUrl`, `brandCity`, `productNames`, `brandDesc`, `industry`, `competitors`
- `platforms` — default DeepSeek, 豆包, 千问, Kimi, 元宝
- `region: CN`, `language: zh-Hans`, `geoMarket: domestic`

## Workflow

1. **品牌核对** — 官网 title/H1/JSON-LD 与 `brandName` 一致性。
2. **平台提及速检** — 为每个平台生成 2–3 条监测 Prompt（见 `shared/references/cn-ai-platforms.md`）。有浏览器/API 则记录采样结果；无则 `metrics.samplingStatus=partial`。
3. **内容可引用快检** — CORE-EEAT 快扫（见 `shared/references/core-eeat-cn-gate.md`）：首段定义、FAQ、数据出处。
4. **机会摘要** — P0/P1 动作写入 `actionPlan`。
5. **输出 geoWebOutput.v1** — 长摘要放 `artifacts[].type=markdown`。

## data 扩展字段

- `monitoringPrompts[]` — `{ platform, prompt, intent }`
- `visibilityMatrix[]` — `{ platform, mentionSignal, evidenceStatus }`
- `keywordGroups` — 可选快检词

## Output Contract

`geoWebOutput.v1` — see `shared/geo-web-contract.md`.

`metrics` 建议包含：`mentionRate`（仅在有证据时）、`coreEeatQuickScore`、`samplingStatus`.

## Final Response Rule

Single JSON object only. No Markdown fences.
