export type PublishEvidenceItem = {
  contentItemId: string;
  title: string;
  status: 'published' | 'failed' | 'need_manual';
  publishLink?: string;
  screenshotUrl?: string;
  platformMessage?: string;
  errorCode?: string;
};

export const PUBLISH_REVIEW_LABELS: Record<string, string> = {
  need_manual_publish: '需人工发布',
  need_reauth: '账号需重新授权',
};

export function parsePublishEvidence(output: Record<string, unknown> | undefined) {
  if (!output) return null;
  const evidenceItems = Array.isArray(output.evidenceItems)
    ? (output.evidenceItems as PublishEvidenceItem[])
    : [];
  return {
    platform: String(output.platform ?? ''),
    accountName: String(output.accountName ?? ''),
    publishLink: output.publishLink ? String(output.publishLink) : undefined,
    publishedCount: Number(output.publishedCount ?? 0),
    failedCount: Number(output.failedCount ?? 0),
    evidence: output.evidence ? String(output.evidence) : undefined,
    reviewCategory: output.reviewCategory ? String(output.reviewCategory) : undefined,
    verified: output.verified as boolean | undefined,
    checkedAt: output.checkedAt ? String(output.checkedAt) : undefined,
    evidenceItems,
  };
}
