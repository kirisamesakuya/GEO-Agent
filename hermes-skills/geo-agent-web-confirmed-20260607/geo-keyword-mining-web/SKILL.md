# geo-keyword-mining-web

Use this skill to mine keyword candidates for GEO-Agent's keyword library.

## Inputs

Read from `metadata.input`.

Recommended:

- `brandName` or `brand`
- `brandUrl`
- `industry`
- `brandCity`
- `productNames`
- `seedKeywords`
- `competitors`
- `platforms`
- `geoReport`
- `targetAudience`

## Workflow

1. Expand keywords into five groups:
   - `brand`
   - `industry`
   - `longtail`
   - `geo`
   - `competitor`
2. Prefer buyer-intent and AI-question-style terms.
3. Deduplicate terms.
4. Avoid banned medical/financial/legal superlatives unless present in source
   and clearly marked as risky.
5. Add rationale for high-value keywords.

## Output

Return JSON that GEO-Agent can confirm into the keyword library:

```json
{
  "summary": "",
  "suggestions": [
    {
      "term": "",
      "group": "longtail",
      "intent": "informational",
      "priority": "P1",
      "rationale": ""
    }
  ],
  "data": {
    "keywordGroups": {
      "brand": [],
      "industry": [],
      "longtail": [],
      "geo": [],
      "competitor": []
    }
  },
  "artifacts": [
    {
      "id": "keyword-suggestions-json",
      "type": "json",
      "name": "keyword-suggestions.json",
      "content": "{}",
      "preview": "{}"
    }
  ]
}
```

Allowed groups are exactly: `brand`, `industry`, `longtail`, `geo`,
`competitor`.
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
