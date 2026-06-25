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
5. **`quantity` must equal the number of articles in `deliverables`** (or in the deliverable text). Do not list 3 articles in requirements while leaving `quantity` at 1.

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
      "quantity": 3,
      "budgetMin": 0,
      "budgetMax": 0,
      "message": "",
      "deliverables": ["article 1 brief", "article 2 brief", "article 3 brief"],
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
