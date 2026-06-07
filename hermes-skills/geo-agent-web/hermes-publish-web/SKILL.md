# hermes-publish-web

Use this skill for local-account publishing or publish evidence preparation.

This is a high-risk skill. It must not publish unless the input contains
explicit user confirmation or Hermes has emitted an approval event.

## Inputs

Read from `metadata.input`.

Required for real publishing:

- `userConfirmed: true`
- `targetPlatform`
- `contentItemIds` or `contentItems`
- `accountName` or `accountId`

Recommended:

- `brandName`
- `contentBatchId`
- `contentTitles`
- `publishJobId`
- `attachments`
- `dryRun`

## Workflow

1. If `dryRun` is true or confirmation is missing, do not publish. Return a
   `ready_for_manual_publish` result with a checklist.
2. Verify the local account/session without exposing secrets.
3. Open/use platform publishing tools only when available and approved.
4. Publish content items or prepare manual publish evidence.
5. Capture evidence:
   - publish URL if available
   - screenshot path/URL if available
   - platform response summary
   - account label
6. If any item fails, return partial status details.

## Output

Return JSON:

```json
{
  "summary": "",
  "platform": "",
  "accountName": "",
  "publishedAt": "",
  "publishLink": "",
  "items": [
    {
      "contentItemId": "",
      "title": "",
      "status": "published",
      "publishLink": "",
      "evidenceUrl": "",
      "errorMessage": ""
    }
  ],
  "reviewCategory": null,
  "artifacts": [
    {
      "id": "publish-evidence",
      "type": "json",
      "name": "publish-evidence.json",
      "content": "{}",
      "preview": "{}",
      "riskLevel": "high",
      "requiresHumanApproval": true
    }
  ]
}
```

Allowed item statuses: `published`, `manual_required`, `failed`, `skipped`.
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
