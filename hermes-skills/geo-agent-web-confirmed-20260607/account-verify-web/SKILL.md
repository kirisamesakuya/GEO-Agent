# account-verify-web

Use this skill to verify whether a local platform account is logged in and
usable for GEO-Agent publishing.

This skill must never return cookies, tokens, QR codes, or session secrets.

## Inputs

Read from `metadata.input`.

Recommended:

- `platform`
- `accountName`
- `accountId`
- `bindSessionId`
- `brandName`
- `mockVerify`

## Workflow

1. If `mockVerify` is true, return a clearly marked demo verification result.
2. Otherwise inspect the local platform session using approved Hermes tools.
3. Verify:
   - login state
   - visible account name if possible
   - publish permission if observable
4. If login is missing or manual action is needed, return `verified: false` and
   a safe next-step message.
5. Redact all sensitive session details.

## Output

Return JSON:

```json
{
  "summary": "",
  "verified": false,
  "platform": "",
  "accountName": "",
  "authMethod": "local_browser",
  "permissionSummary": "",
  "expiresAt": null,
  "needsManualLogin": false,
  "safeSessionRef": "",
  "artifacts": [
    {
      "id": "account-verify-json",
      "type": "json",
      "name": "account-verify.json",
      "content": "{}",
      "preview": "{}",
      "riskLevel": "medium",
      "requiresHumanApproval": false
    }
  ]
}
```
## Final response rule

The final assistant response must be a single valid JSON object only. Do not wrap it in Markdown fences and do not add explanatory text before or after the JSON. If evidence is incomplete, put the explanation inside JSON fields such as `summary`, `findings`, or `actionPlan`.
