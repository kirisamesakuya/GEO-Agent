# geo-article-generation-web

Use this skill to generate platform-ready GEO content for GEO-Agent.

## Inputs

Read from `metadata.input`.

Recommended:

- `brandName`
- `source`: `brand_profile`, `geo_report`, `keyword`, or `manual`
- `targetPlatform`
- `contentDirection`
- `tone`
- `marketingIntensity`: 0-100
- `quantity`
- `wordCount`
- `templateType`
- `knowledgeCategories`
- `keywords`
- `geoReport`
- `brandProfile`
- `forbiddenWords`

## Workflow

1. Build content from verified brand facts, knowledge, and report gaps.
2. Produce the requested number of articles.
3. Adapt style to the target platform.
4. Keep claims compliant:
   - no guaranteed rankings
   - no exaggerated medical/financial/legal promises
   - avoid forbidden words
5. Add GEO features:
   - answer-ready headings
   - FAQ blocks
   - quotable facts
   - source/proof prompts where data is missing
6. Return drafts plus quality checks.

## Output

Return JSON:

```json
{
  "summary": "",
  "articles": [
    {
      "title": "",
      "platform": "",
      "summary": "",
      "previewText": "",
      "fullContent": "",
      "keywords": [],
      "suggestedTags": [],
      "riskFlags": [],
      "generationMeta": {
        "source": "",
        "templateType": "",
        "geoFeatures": []
      }
    }
  ],
  "qualityChecks": {
    "forbiddenWords": [],
    "claimRisks": [],
    "geoReadinessScore": 0,
    "needsHumanReview": false
  },
  "artifacts": [
    {
      "id": "articles-md",
      "type": "markdown",
      "name": "GEO-ARTICLES.md",
      "content": "# ...",
      "preview": "# ..."
    }
  ]
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
