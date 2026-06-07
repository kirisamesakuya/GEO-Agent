# geo-campaign-plan-web

Use this skill to turn GEO report gaps, ranking samples, or brand goals into
task packages for providers or internal operators.

## Inputs

Read from `metadata.input`.

Recommended:

- `brand` or `brandName`
- `goal`
- `source`: `geo_report`, `indexing_result`, or `brand_profile`
- `geoReport`
- `findings`
- `actionPlan`
- `platforms`
- `budgetMin`
- `budgetMax`
- `supplementNotes`
- `sourceIndexResults`

## Workflow

1. Convert high-value gaps into executable task packages.
2. Separate package owners:
   - content writer/provider
   - platform publisher
   - website/technical operator
   - brand reviewer
3. Include budget guidance, evidence requirements, and acceptance rules.
4. Keep tasks concrete and easy to assign.

## Output

Return JSON:

```json
{
  "summary": "",
  "packages": [
    {
      "name": "",
      "providerName": "",
      "platforms": [],
      "serviceType": "",
      "budgetMin": 0,
      "budgetMax": 0,
      "message": "",
      "deliverables": [],
      "acceptanceCriteria": [],
      "evidenceRequired": ["link", "screenshot"],
      "priority": "P1"
    }
  ],
  "plan": {
    "goal": "",
    "timelineDays": 30,
    "riskNotes": []
  },
  "artifacts": [
    {
      "id": "campaign-plan-md",
      "type": "markdown",
      "name": "CAMPAIGN-PLAN.md",
      "content": "# ...",
      "preview": "# ..."
    }
  ]
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
