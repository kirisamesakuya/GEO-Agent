# GEO-Agent Web Skill Integration Notes

## Direct Replacements For Existing Task Types

These skills can replace current placeholder or direct-model routes when Hermes
is ready:

| Current taskType | Current/old skill | New skill |
|---|---|---|
| `geo_analysis` | `geo.analysis.run` | `geo-analysis-web` |
| `keyword_mining` | `geo.keyword.mine` | `geo-keyword-mining-web` |
| `knowledge_extract` | `geo.knowledge.extract` | `geo-knowledge-extract-web` |
| `index_sampling` | `geo.index.sample` | `geo-platform-ranking-sampling` |
| `article_generation` | `geo.article.generate` | `geo-article-generation-web` |
| `article_rewrite` | `geo.article.rewrite` | `geo-article-rewrite-web` |
| `campaign_plan` | `geo.campaign.plan` | `geo-campaign-plan-web` |
| `website_preview` | `geo.website.preview` | `geo-website-preview-web` |
| `hermes_publish` | `hermes.publish.auto` | `hermes-publish-web` |
| `account_verify` | `geo.account.verify` | `account-verify-web` |

## New Product-Loop Task Types

These skills are provided for product closure, but the app currently needs
taskType/API/UI wiring before they can be submitted as first-class tasks:

| New taskType | Skill | Purpose |
|---|---|---|
| `geo_report` | `geo-report-web` | Merge audit/assets/compare outputs into a client Web report. |
| `geo_proposal` | `geo-proposal-web` | Generate packages, pricing ranges, timeline, and acceptance criteria. |
| `geo_prospect` | `geo-prospect-web` | Create/update sales prospect records without local CRM files. |

## Suggested Order

1. Copy this folder to the Hermes skills directory or load it as a custom skill
   package.
2. Update `skill_routes` using `adapter-skill-map.json`.
3. Test existing direct replacements first:
   - `keyword_mining`
   - `knowledge_extract`
   - `campaign_plan`
   - `index_sampling`
4. Add Web task types for:
   - `geo_report`
   - `geo_proposal`
   - `geo_prospect`
5. Keep high-risk tasks behind confirmation:
   - `hermes_publish`
   - `account_verify`

## Expected App Changes Later

No app code was changed in this skill pack. To fully activate the new
product-loop skills, add these to the app when ready:

- `AgentTaskType`: `geo_report`, `geo_proposal`, `geo_prospect`.
- `TASK_SKILL_MAP` entries for the three new task types.
- `VALID_TYPES` route allowlist entries.
- UI/API entry points for report merge, proposal generation, and prospect save.
- Persistence models or JSON fields for proposals and prospects.

