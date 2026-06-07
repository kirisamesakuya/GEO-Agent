# GEO-Agent Web Contract

## Runtime Input

Hermes receives a run payload with:

- `metadata.taskId`
- `metadata.type`
- `metadata.skill`
- `metadata.input`
- `metadata.outputContract`

If both prompt text and metadata exist, trust `metadata.input` as the canonical
structured input.

Common input fields:

- `brandName`: brand display name.
- `brandUrl`: canonical website URL. Do not substitute another domain.
- `brandCity`: market/city.
- `industry`: industry.
- `productNames`: products or services.
- `platforms`: target AI/content platforms.
- `competitors`: competitor names or URLs.
- `sourceMaterials`: uploaded text, links, or files.
- `outputContract`: requested format/version.

## geoWebOutput.v1

Return a single JSON object with these required top-level fields:

- `audit`: report header, total score, score map, and summary.
- `data`: product-specific structured data.
- `metrics`: numeric or boolean measurements.
- `findings`: issue list.
- `artifacts`: deliverables such as markdown, HTML, JSON, PDF links, code blocks.
- `actionPlan`: prioritized next actions.

Recommended finding shape:

```json
{
  "id": "finding-1",
  "severity": "high",
  "category": "citability",
  "title": "Weak answer-ready service proof",
  "evidence": "The service page lacks prices, scope, and author credentials.",
  "recommendation": "Add FAQ and expert-reviewed service proof blocks."
}
```

Recommended artifact shape:

```json
{
  "id": "artifact-1",
  "type": "markdown",
  "name": "GEO-REPORT.md",
  "content": "# Report...",
  "preview": "# Report...",
  "riskLevel": "low",
  "requiresHumanApproval": false
}
```

## Safety Rules

- Do not claim live rankings, successful publication, or account verification
  unless tool evidence exists.
- If a tool is unavailable, return `partial` data with a clear finding instead
  of inventing evidence.
- For publishing and account verification, require explicit confirmation fields:
  `userConfirmed`, `userConfirmedExecution`, or a Hermes approval event.
- Never expose secrets, cookies, tokens, or full session data in output.

