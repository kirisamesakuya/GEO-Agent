# geo-proposal-web

Use this skill to turn a GEO audit or quick-start report into a commercial
proposal with packages, acceptance criteria, timeline, and next steps.

## Inputs

Read from `metadata.input`.

Recommended:

- `brandName`
- `brandUrl`
- `industry`
- `audit`, `geoReport`, or `report`
- `findings`
- `actionPlan`
- `budgetMin`
- `budgetMax`
- `platforms`
- `serviceScope`
- `salesStage`

## Workflow

1. Identify the most valuable gaps from the audit/report.
2. Convert gaps into deliverable packages:
   - starter: quick fixes and content foundations
   - growth: platform visibility and content production
   - managed: monthly audit, publishing, and review cadence
3. Include acceptance criteria that are measurable inside GEO-Agent:
   - report artifacts delivered
   - content items created
   - platform/account evidence uploaded
   - ranking/index sampling results
4. Do not promise guaranteed AI rankings or guaranteed citations.
5. If budget is missing, provide relative package tiers instead of exact prices.

## Output

Return JSON:

```json
{
  "summary": "",
  "proposal": {
    "brandName": "",
    "stage": "proposed",
    "recommendedPackage": "growth",
    "packages": [
      {
        "id": "starter",
        "name": "Starter",
        "priceRange": "",
        "durationDays": 30,
        "deliverables": [],
        "acceptanceCriteria": [],
        "riskNotes": []
      }
    ],
    "timeline": [],
    "assumptions": [],
    "nextSteps": []
  },
  "artifacts": [
    {
      "id": "proposal-md",
      "type": "markdown",
      "name": "GEO-PROPOSAL.md",
      "content": "# ...",
      "preview": "# ..."
    }
  ],
  "rawJson": {}
}
```

Also include `audit`, `data`, `metrics`, `findings`, and `actionPlan` if the
caller requested `geoWebOutput.v1`.
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
