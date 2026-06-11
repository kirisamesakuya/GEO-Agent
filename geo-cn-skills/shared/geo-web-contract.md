# GEO-Agent Web Contract (geo-cn-skills)

All skills in this pack target **GEO-Agent + Hermes Gateway** integration.

## Runtime Input

Hermes run payload canonical fields live in `metadata.input`:

| Field | Description |
|-------|-------------|
| `brandName` | Brand display name |
| `brandUrl` | Canonical website URL |
| `brandCity` | City or market |
| `industry` | Industry |
| `productNames` | Products or services |
| `platforms` | Default: DeepSeek, 豆包, 千问, Kimi, 元宝 |
| `competitors` | Competitor names or URLs |
| `region` | Default `CN` |
| `language` | Default `zh-Hans` |
| `geoMarket` | Default `domestic` |
| `sourceMaterials` | Uploads, links, notes |
| `modules` | Sub-modules for `geo-audit` |
| `outputContract` | `{ "format": "geoWebOutput.v1" }` |

See `shared/cn-defaults.json` for China defaults.

## geoWebOutput.v1 (required)

Every skill must return a single JSON object with:

- `audit` — title, summary, totalScore, scores
- `data` — skill-specific structured payload
- `metrics` — numeric measurements; mark `partial: true` when evidence incomplete
- `findings` — issues with severity, category, evidence, recommendation
- `artifacts` — markdown, html, json, pdf, schema_jsonld, llms_txt, robots_patch
- `actionPlan` — P0/P1/P2 actions with owner
- `deliveryStatus` — `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_INPUT`
- `qualityGate` — `verdict`, `score`, `evidenceCoverage`, `measuredShare`, `blockers`
- `nextBestAction` — one concrete next action with owner and acceptance

Long reports (HTML/Markdown briefs) go in `artifacts`, not outside JSON.

Core customer-facing skills MUST also follow `shared/product-grade-delivery-standard.md`. A syntactically valid JSON response is not sufficient for completion.

## China Environment Rules

1. Prefer domestic AI platforms in sampling and recommendations.
2. Do not claim live platform rankings or citation rates without tool evidence.
3. Label metrics as `measured`, `user_provided`, or `estimated`.
4. Use official-site-first evidence; record gaps in `data.sourceLedger`.
5. Forbidden superlatives in regulated industries unless sourced and flagged risky.

## Final Response Rule

The final assistant response must be **one valid JSON object only**.
No Markdown fences, no prose before/after JSON.
