# geo-keyword-mining-web

国内 AI 意图拓词：关键词五组 + 意图簇 + 监测 Prompt 库。

## When to Use

- GEO-Agent `keyword_mining`
- 品牌中心关键词库「AI 挖词」

## Inputs

- `brandName` / `brand`
- `brandUrl`, `industry`, `brandCity`, `productNames`
- `seedKeywords`, `competitors`, `platforms`（五平台默认）
- `targetAudience`, `geoReport`（可选）

## Workflow

1. **五组关键词** — `brand`, `industry`, `longtail`, `geo`, `competitor`
2. **意图簇** — `data.intentClusters[]`: `{ name, questions[], followUps[] }`
3. **国内问法** — 口语对比、地域、选型、价格（见 cn-ai-platforms.md）
4. **监测 Prompt** — `data.monitoringPrompts[]` 供排名/收录采样复用
5. **证据缺口** — `data.evidenceGaps[]`
6. **合规** — 医疗/金融夸大表述标 risky

## Product Bridge

Also emit flat list for keyword library confirmation:

```json
{
  "suggestions": [
    { "term": "", "group": "longtail", "intent": "informational", "priority": "P1", "rationale": "" }
  ],
  "data": {
    "keywordGroups": { "brand": [], "industry": [], "longtail": [], "geo": [], "competitor": [] },
    "intentClusters": [],
    "monitoringPrompts": []
  }
}
```

Wrap in full `geoWebOutput.v1` with `audit`, `metrics`, `findings`, `artifacts`, `actionPlan`.

## Final Response Rule

Single JSON object only.
