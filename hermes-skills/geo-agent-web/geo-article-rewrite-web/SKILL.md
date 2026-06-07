# geo-article-rewrite-web

Use this skill to rewrite a reference article into a compliant, GEO-ready draft.

## Inputs

Read from `metadata.input`.

Required:

- `referenceText` or `referenceUrl`

Recommended:

- `brandName`
- `targetPlatform`
- `quantity`
- `wordCount`
- `tone`
- `keywords`
- `brandProfile`
- `geoReport`
- `forbiddenWords`

## Workflow

1. Preserve useful structure and intent, not exact wording.
2. Rewrite using verified brand facts only.
3. Improve GEO readiness with:
   - answer-first paragraphs
   - FAQ
   - service/entity clarity
   - citations/proof placeholders
4. Avoid plagiarism, unsupported claims, and banned terms.
5. Return quality checks and differences from the reference.

## Output

Use the same output contract as `geo-article-generation-web` with an additional
`rewriteMeta` field per article:

```json
{
  "articles": [
    {
      "title": "",
      "fullContent": "",
      "rewriteMeta": {
        "referenceSource": "",
        "majorChanges": [],
        "plagiarismRisk": "low"
      }
    }
  ],
  "qualityChecks": {},
  "artifacts": []
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
