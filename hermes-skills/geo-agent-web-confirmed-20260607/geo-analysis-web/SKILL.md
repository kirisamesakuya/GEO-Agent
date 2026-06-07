# geo-analysis-web

Use this skill as the Web-compatible fallback for legacy GEO analysis tasks.

Prefer the more specific skills when possible:

- `geo-quick-start`
- `geo-audit`
- `geo-technical`
- `geo-content`
- `geo-platform-optimizer`
- `geo-report-web`

## Inputs

Read from `metadata.input`.

Recommended:

- `brandName`
- `brandUrl`
- `brandCity`
- `industry`
- `productNames`
- `brandDesc`
- `platforms`
- `keywords`
- `competitors`
- `prospectMode`
- `plannedQuestions`
- `plannedModules`

## Workflow

1. Determine whether the task is quick-start style, audit style, or generic
   strategy analysis from `analysisDepth` and available inputs.
2. If no website URL is provided, do not perform technical website claims.
3. Produce:
   - visibility hypothesis
   - brand/entity clarity analysis
   - content and proof gaps
   - platform-specific recommendations
   - next action plan
4. If live sampling/crawling tools are unavailable, mark observations as
   strategy estimates rather than evidence.

## Output

Return `geoWebOutput.v1`:

```json
{
  "audit": {
    "title": "GEO Analysis",
    "summary": "",
    "totalScore": 0,
    "scores": {
      "brandAuthority": 0,
      "contentCitability": 0,
      "technicalGeo": 0,
      "platformReadiness": 0
    }
  },
  "data": {
    "brandMentionSummary": "",
    "competitorAnalysis": "",
    "contentGap": "",
    "optimizationSuggestions": ""
  },
  "metrics": {},
  "findings": [],
  "artifacts": [
    {
      "id": "geo-analysis-md",
      "type": "markdown",
      "name": "GEO-ANALYSIS.md",
      "content": "# ...",
      "preview": "# ..."
    }
  ],
  "actionPlan": []
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
