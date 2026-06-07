# geo-platform-ranking-sampling

Use this skill to sample brand visibility on AI/search-answer platforms for
GEO-Agent ranking monitoring.

## Inputs

Read from `metadata.input`.

Required:

- `keywords`: array of user questions or search terms.
- `platforms`: target platforms.

Recommended:

- `brandName` or `brand`
- `brandUrl`
- `competitors`
- `planId`
- `queryAt`

## Workflow

1. For each keyword and platform, perform or request a platform query only when
   the runtime has a safe tool for that platform.
2. Record:
   - whether the brand is mentioned
   - whether competitors are mentioned
   - ranking/position if observable
   - citation/source URL if available
   - answer snippet
3. If a platform cannot be queried, return `status: "unavailable"` for that row
   and do not fabricate results.
4. Keep snippets short and avoid storing private account/session details.

## Output

Return JSON:

```json
{
  "summary": "",
  "results": [
    {
      "keyword": "",
      "platform": "",
      "hit": false,
      "brandMentioned": false,
      "citedMerchant": false,
      "rank": null,
      "citationSnippet": "",
      "sourceUrls": [],
      "competitorMentions": [],
      "status": "sampled",
      "sampledAt": ""
    }
  ],
  "metrics": {
    "totalQueries": 0,
    "hitRate": 0
  },
  "artifacts": [
    {
      "id": "ranking-sample-json",
      "type": "json",
      "name": "ranking-sample.json",
      "content": "{}",
      "preview": "{}"
    }
  ]
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
