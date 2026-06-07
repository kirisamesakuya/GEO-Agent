# geo-knowledge-extract-web

Use this skill to extract structured brand knowledge for GEO-Agent's knowledge
base.

## Inputs

Read from `metadata.input`.

Recommended:

- `brandName` or `brand`
- `brandUrl`
- `industry`
- `description`
- `sourceMaterials`
- `geoReport`
- `existingKnowledge`

## Workflow

1. Extract reusable factual knowledge only.
2. Group entries into:
   - `intro`
   - `product`
   - `proof`
   - `faq`
   - `policy`
   - `case`
3. Mark uncertain statements as `needsReview: true`.
4. Do not invent certifications, prices, guarantees, cases, or medical claims.

## Output

Return JSON:

```json
{
  "summary": "",
  "entries": [
    {
      "title": "",
      "category": "intro",
      "body": "",
      "source": "",
      "confidence": 0.8,
      "needsReview": false
    }
  ],
  "artifacts": [
    {
      "id": "knowledge-extract-json",
      "type": "json",
      "name": "knowledge-extract.json",
      "content": "{}",
      "preview": "{}"
    }
  ]
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
