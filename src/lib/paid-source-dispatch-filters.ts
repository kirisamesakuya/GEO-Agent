import { isQuotePricingMode, QUOTE_STATUS_LABELS } from '../../lib/quote-order';

/** 内容交付 · 发单管理（付费信源报价撮合） */
export type PaidSourceDispatchFilter =
  | 'all'
  | 'quote_open'
  | 'quoted'
  | 'confirmed'
  | 'cancelled';

export const PAID_SOURCE_DISPATCH_STATUS_TABS: { id: PaidSourceDispatchFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'quote_open', label: '待报价' },
  { id: 'quoted', label: '已报价' },
  { id: 'confirmed', label: '已确认' },
  { id: 'cancelled', label: '已撤回' },
];

const CONFIRMED_STATUSES = new Set([
  'matched',
  'awaiting_freeze',
  'in_progress',
  'draft_review',
  'draft_revision',
  'draft_approved',
  'pending_review',
  'revision',
  'completed',
]);

export interface PaidSourceDispatchOrderLike {
  status: string;
  pricingMode?: string | null;
  quotes?: Array<{ status?: string }>;
}

export function isPaidSourceDispatchOrder(order: PaidSourceDispatchOrderLike): boolean {
  return isQuotePricingMode(order.pricingMode);
}

export function orderMatchesPaidSourceDispatchFilter(
  order: PaidSourceDispatchOrderLike,
  filter: PaidSourceDispatchFilter
): boolean {
  if (!isPaidSourceDispatchOrder(order)) return false;
  const { status } = order;
  if (filter === 'all') return true;
  if (filter === 'cancelled') return status === 'cancelled';
  if (filter === 'quote_open') return status === 'quote_open';
  if (filter === 'quoted') return status === 'quote_review';
  if (filter === 'confirmed') return CONFIRMED_STATUSES.has(status);
  return true;
}

export function countPaidSourceDispatchOrders(
  orders: PaidSourceDispatchOrderLike[]
): Record<PaidSourceDispatchFilter, number> {
  const quoteOrders = orders.filter(isPaidSourceDispatchOrder);
  const counts: Record<PaidSourceDispatchFilter, number> = {
    all: quoteOrders.length,
    quote_open: 0,
    quoted: 0,
    confirmed: 0,
    cancelled: 0,
  };
  for (const o of quoteOrders) {
    if (o.status === 'quote_open') counts.quote_open += 1;
    else if (o.status === 'quote_review') counts.quoted += 1;
    else if (o.status === 'cancelled') counts.cancelled += 1;
    else if (CONFIRMED_STATUSES.has(o.status)) counts.confirmed += 1;
  }
  return counts;
}

export function paidSourceDispatchRowStatusLabel(order: PaidSourceDispatchOrderLike): string {
  const pendingQuotes = order.quotes?.filter((q) => q.status === 'pending').length ?? 0;
  if (order.status === 'cancelled') return '已撤回';
  if (CONFIRMED_STATUSES.has(order.status)) return '已确认发布';
  if (order.status === 'quote_review') return '待确认报价';
  if (order.status === 'quote_open') return pendingQuotes > 0 ? '报价中' : '待报价';
  return QUOTE_STATUS_LABELS[order.status] ?? order.status;
}

export function paidSourceDispatchRowStatusClass(
  status: string,
  order?: PaidSourceDispatchOrderLike
): string {
  if (status === 'cancelled') return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
  if (CONFIRMED_STATUSES.has(status)) return 'bg-sky-50 text-sky-700';
  if (status === 'quote_review') return 'bg-amber-50 text-amber-700';
  if (status === 'quote_open') {
    const n = order?.quotes?.filter((q) => q.status === 'pending').length ?? 0;
    return n > 0 ? 'bg-orange-50 text-orange-700' : 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
  }
  return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
}

export function paidSourceQuoteProgressLabel(order: PaidSourceDispatchOrderLike): string {
  const pending = order.quotes?.filter((q) => q.status === 'pending').length ?? 0;
  if (order.status === 'quote_open' && pending === 0) return '待报价';
  if (pending > 0) return `已收 ${pending} 份报价`;
  if (order.status === 'quote_review') return '待确认';
  if (CONFIRMED_STATUSES.has(order.status)) return '已确认';
  if (order.status === 'cancelled') return '—';
  return '—';
}

export function parsePaidSourceDispatchStageFromUrl(): PaidSourceDispatchFilter {
  const stage = new URLSearchParams(window.location.search).get('orderDispatchStage');
  const legacyMap: Record<string, PaidSourceDispatchFilter> = {
    all: 'all',
    published: 'quote_open',
    accepted: 'confirmed',
    cancelled: 'cancelled',
    quote_open: 'quote_open',
    quoted: 'quoted',
    confirmed: 'confirmed',
  };
  if (stage && stage in legacyMap) return legacyMap[stage];
  return 'all';
}

export function paidSourceDispatchStageFromHint(hint?: string): PaidSourceDispatchFilter | null {
  if (!hint) return null;
  if (hint === 'order_manage' || hint === 'order_manage:all') return 'all';
  if (hint === 'pending_provider' || hint === 'order_manage:published') return 'quote_open';
  if (hint === 'order_manage:quoted') return 'quoted';
  if (hint === 'accepted' || hint === 'order_manage:accepted' || hint === 'order_manage:confirmed') {
    return 'confirmed';
  }
  if (hint === 'cancelled' || hint === 'order_manage:cancelled') return 'cancelled';
  return null;
}
