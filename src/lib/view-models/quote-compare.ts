/** 发布端比价页 ViewModel — Mock-first，真实 API 经 adapter 转换 */

export interface QuoteCompareRowViewModel {
  id: string;
  providerId: string;
  providerName: string;
  publisherPayAmountYuan: string;
  publisherPayAmountCents: number;
  mediaLabel: string;
  earliestOnlineLabel: string;
  deliveryPromiseLabel: string;
  deliveryProofTags: string[];
  message?: string | null;
  verified: boolean;
  verificationLabel: string;
  fulfillmentScore: number;
  fulfillmentSummary: string;
  completedOrders: number;
  onTimeRatePct: number;
  mediaAccountLink?: string | null;
}

export interface RawPublisherQuoteRow {
  id: string;
  providerId: string;
  providerName: string;
  publisherPayAmountCents: number;
  publisherPayAmountYuan?: string;
  mediaName?: string | null;
  publishPlatform?: string | null;
  estimatedPublishAt?: string | null;
  deliveryPromise?: string | null;
  message?: string | null;
  includeLink?: boolean;
  includeScreenshot?: boolean;
  includeIndexingProof?: boolean;
  mediaAccountLink?: string | null;
}

function mockTrust(providerId: string) {
  let h = 0;
  for (let i = 0; i < providerId.length; i++) h = (h * 31 + providerId.charCodeAt(i)) >>> 0;
  const verified = h % 5 !== 0;
  const completedOrders = 5 + (h % 40);
  const onTimeRatePct = 82 + (h % 18);
  const fulfillmentScore = Math.min(99, Math.round(onTimeRatePct * 0.6 + Math.min(completedOrders, 30)));
  return {
    verified,
    verificationLabel: verified ? '已入驻认证' : '待补充认证',
    completedOrders,
    onTimeRatePct,
    fulfillmentScore,
    fulfillmentSummary: `完成 ${completedOrders} 单 · 准时率 ${onTimeRatePct}%`,
  };
}

function formatEarliestOnline(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function deliveryProofTags(row: RawPublisherQuoteRow): string[] {
  const tags: string[] = [];
  if (row.includeLink) tags.push('发布链接');
  if (row.includeScreenshot) tags.push('截图证明');
  if (row.includeIndexingProof) tags.push('收录证明');
  return tags.length ? tags : ['标准交付'];
}

export function mapQuoteCompareRow(row: RawPublisherQuoteRow): QuoteCompareRowViewModel {
  const trust = mockTrust(row.providerId);
  const mediaLabel =
    [row.mediaName, row.publishPlatform].filter(Boolean).join(' · ') || '—';
  return {
    id: row.id,
    providerId: row.providerId,
    providerName: row.providerName,
    publisherPayAmountCents: row.publisherPayAmountCents,
    publisherPayAmountYuan:
      row.publisherPayAmountYuan ?? (row.publisherPayAmountCents / 100).toFixed(2),
    mediaLabel,
    earliestOnlineLabel: formatEarliestOnline(row.estimatedPublishAt),
    deliveryPromiseLabel: row.deliveryPromise?.trim() || deliveryProofTags(row).join(' + '),
    deliveryProofTags: deliveryProofTags(row),
    message: row.message,
    mediaAccountLink: row.mediaAccountLink,
    ...trust,
  };
}

export function mapQuoteCompareRows(rows: RawPublisherQuoteRow[]): QuoteCompareRowViewModel[] {
  return rows.map(mapQuoteCompareRow);
}
