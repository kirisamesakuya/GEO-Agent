# GEO-Agent Web Hermes Skill Pack

This folder contains Web-adapter skills for the GEO-Agent product loop.

It is intentionally separate from the application runtime so the skills can be
copied into the final Hermes skill directory, adapted to the Hermes runtime, or
versioned independently.

## Goal

The existing app already wires core GEO skills such as `geo-audit`,
`geo-schema`, `geo-llmstxt`, `geo-content`, and `geo-compare`.

This pack fills the missing product-loop skills:

- `geo-report-web`: merge audit outputs into a Web report.
- `geo-proposal-web`: generate offer packages and acceptance criteria.
- `geo-prospect-web`: turn brand/audit context into a sales pipeline record.
- `geo-keyword-mining-web`: mine keyword candidates for the keyword library.
- `geo-platform-ranking-sampling`: sample AI platform visibility results.
- `geo-knowledge-extract-web`: extract structured brand knowledge.
- `geo-article-generation-web`: generate GEO-ready platform articles.
- `geo-article-rewrite-web`: rewrite reference articles into GEO-safe drafts.
- `geo-campaign-plan-web`: convert report gaps into task packages.
- `geo-website-preview-web`: generate a page preview plan and HTML draft.
- `hermes-publish-web`: publish or prepare publish evidence.
- `account-verify-web`: verify local platform account login/session state.

## Contract

All skills must return machine-readable JSON.

GEO-reporting skills must return the `geoWebOutput.v1` shape:

```json
{
  "audit": {},
  "data": {},
  "metrics": {},
  "findings": [],
  "artifacts": [],
  "actionPlan": []
}
```

Business skills may return their native product contract, but should also add
`summary`, `artifacts`, and `rawJson` when useful.

See `shared/geo-web-contract.md` for details.

## Suggested skill_routes

Use `adapter-skill-map.json` as the initial route source when adapting Hermes.
The current app can keep direct-model routes until these skills are installed.

