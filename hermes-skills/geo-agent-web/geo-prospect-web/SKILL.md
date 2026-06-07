# geo-prospect-web

Use this skill to create or update a sales prospect record from brand clues,
quick-start results, audit results, or proposal context.

This Web version is stateless. Do not write to `~/.geo-prospects` or any local
CRM file. GEO-Agent owns persistence.

## Inputs

Read from `metadata.input`.

Recommended:

- `brandName`
- `brandUrl`
- `industry`
- `brandCity`
- `contactName`
- `contactPhone`
- `contactEmail`
- `source`
- `audit`, `geoReport`, or `quickStartReport`
- `proposal`
- `salesStage`: `new`, `audited`, `proposed`, `won`, `lost`
- `contractAmount`
- `mrr`

## Workflow

1. Normalize brand and contact data.
2. Infer prospect stage from supplied context:
   - no audit: `new`
   - quick-start/audit exists: `audited`
   - proposal exists: `proposed`
3. Score opportunity fit from:
   - urgency of findings
   - industry fit
   - brand website maturity
   - available budget or service intent
4. Generate next sales actions.
5. Return a patch object for the Web app to persist.

## Output

Return JSON:

```json
{
  "summary": "",
  "prospect": {
    "brandName": "",
    "brandUrl": "",
    "industry": "",
    "city": "",
    "stage": "audited",
    "fitScore": 0,
    "priority": "medium",
    "estimatedMrr": null,
    "tags": [],
    "contacts": [],
    "sourceReportIds": [],
    "nextActions": []
  },
  "artifacts": [
    {
      "id": "prospect-note",
      "type": "markdown",
      "name": "PROSPECT-NOTE.md",
      "content": "# ...",
      "preview": "# ..."
    }
  ],
  "rawJson": {}
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
