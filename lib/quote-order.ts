export type PricingMode = 'provider_quote' | 'fixed';

export function isQuotePricingMode(pricingMode?: string | null): boolean {
  return pricingMode === 'provider_quote';
}

export const QUOTE_OPEN_STATUSES = ['quote_open', 'quote_review'] as const;

export function isQuoteOrder(order: { pricingMode?: string | null; status?: string | null }) {
  return isQuotePricingMode(order.pricingMode);
}

export function assertQuoteBypassAllowed(order: { pricingMode?: string | null }, action: string): void {
  if (isQuoteOrder(order)) {
    const err = new Error(`${action} 不可用于报价撮合任务`) as Error & { code?: string };
    err.code =
      action.includes('claim') || action.includes('领取')
        ? 'CLAIM_NOT_ALLOWED_FOR_QUOTE'
        : 'APPLICATION_NOT_ALLOWED_FOR_QUOTE';
    throw err;
  }
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  quote_open: '待报价',
  quote_review: '报价中',
  awaiting_freeze: '冻结中',
  matched: '已撮合',
  in_progress: '执行中',
  pending_review: '待验收',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '已争议',
};
