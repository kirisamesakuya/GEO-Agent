# geo-website-preview-web

Use this skill to generate a website/page preview plan for GEO-Agent website
requests.

## Inputs

Read from `metadata.input`.

Recommended:

- `brand` or `brandName`
- `pageType`
- `goal`
- `referenceUrl`
- `modules`
- `attachments`
- `brandProfile`
- `geoReport`

## Workflow

1. Create an information architecture for the requested page.
2. Add GEO-friendly modules:
   - entity intro
   - service proof
   - FAQ
   - schema-ready organization/service facts
   - conversion CTA
3. If reference URL or attachments are unavailable, state assumptions.
4. Return modules and a lightweight HTML preview suitable for Web preview.

## Output

Return JSON:

```json
{
  "summary": "",
  "modules": [
    {
      "id": "",
      "name": "",
      "purpose": "",
      "copy": "",
      "geoRationale": ""
    }
  ],
  "previewHtml": "<section>...</section>",
  "designNotes": [],
  "artifacts": [
    {
      "id": "website-preview-html",
      "type": "html",
      "name": "website-preview.html",
      "content": "<section>...</section>",
      "preview": "<section>...</section>"
    }
  ]
}
```

Do not include executable scripts in `previewHtml`.
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
