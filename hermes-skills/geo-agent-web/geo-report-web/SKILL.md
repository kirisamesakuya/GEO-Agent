# geo-report-web

Use this skill when GEO-Agent needs to merge one or more audit outputs into a
client-facing Web report.

## Inputs

Read structured input from `metadata.input`.

Required one of:

- `audit`
- `auditReport`
- `geoReport`
- `baselineReport` and `currentReport`
- `sections`
- `findings`

Recommended:

- `brandName`
- `brandUrl`
- `reportType`: `quick_start`, `audit`, `assets`, `compare`, or `proposal`
- `scores`
- `metrics`
- `findings`
- `actionPlan`
- `artifacts`

## Workflow

1. Normalize all provided audit/report fragments.
2. Build a concise client-facing report with:
   - executive summary
   - score overview
   - key findings
   - platform visibility
   - technical/content/assets gaps
   - 30-day action plan
3. Preserve evidence from source findings. Do not invent crawl, ranking, or
   publication evidence.
4. If input is incomplete, produce a partial report and add a finding explaining
   missing source data.

## Output

Return `geoWebOutput.v1`.

Required shape:

```json
{
  "audit": {
    "title": "Brand GEO Report",
    "summary": "One paragraph summary.",
    "totalScore": 0,
    "scores": {}
  },
  "data": {
    "brandMentionSummary": "",
    "competitorAnalysis": "",
    "contentGap": "",
    "optimizationSuggestions": "",
    "sections": []
  },
  "metrics": {},
  "findings": [],
  "artifacts": [
    {
      "id": "geo-report-md",
      "type": "markdown",
      "name": "GEO-REPORT.md",
      "content": "# ...",
      "preview": "# ...",
      "riskLevel": "low",
      "requiresHumanApproval": false
    }
  ],
  "actionPlan": []
}
```

## Quality Bar

- Markdown must be ready for customer preview.
- Keep JSON valid.
- Use Chinese copy when the brand/market input is Chinese.
- Include "数据来源/限制" if evidence is partial.
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
