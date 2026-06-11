/** 订单交付列表阶段筛选（替代原内容发布页 Tab） */
export type OrderStageFilter =
  | 'all'
  | 'published'
  | 'in_progress'
  | 'draft_review'
  | 'draft_revision'
  | 'draft_approved'
  | 'pending_review'
  | 'completed'
  | 'disputed'
  | 'revision'
  | 'cancelled';

export type OrderTypeFilter = 'all' | 'article' | 'non_article';

export const ORDER_STAGE_FILTER_OPTIONS: { id: OrderStageFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'published', label: '待接单' },
  { id: 'in_progress', label: '执行中' },
  { id: 'draft_review', label: '待审稿' },
  { id: 'draft_revision', label: '审稿返修' },
  { id: 'draft_approved', label: '待发布' },
  { id: 'pending_review', label: '待验收' },
  { id: 'revision', label: '最终返修' },
  { id: 'completed', label: '已完成' },
  { id: 'disputed', label: '争议中' },
  { id: 'cancelled', label: '已撤回' },
];

/** 旧 contentTab / contentPublishTabFromHint → 订单交付阶段 */
export function legacyContentTabToOrderStage(tab: string | null | undefined): OrderStageFilter | null {
  if (!tab || tab === 'compose') return null;
  if (tab === 'draft_review' || tab === 'records') return 'draft_review';
  if (tab === 'pending_publish' || tab === 'schedule') return 'pending_review';
  if (tab === 'completed') return 'completed';
  return null;
}

export function parseOrderStageFromUrl(): OrderStageFilter {
  const params = new URLSearchParams(window.location.search);
  const stage = params.get('orderStage');
  const legacy = legacyContentTabToOrderStage(params.get('contentTab'));
  const valid = ORDER_STAGE_FILTER_OPTIONS.map((o) => o.id);
  if (stage && valid.includes(stage as OrderStageFilter)) return stage as OrderStageFilter;
  if (legacy) return legacy;
  return 'all';
}

export function orderMatchesStageFilter(status: string, filter: OrderStageFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'draft_review') return status === 'draft_review' || status === 'draft_revision';
  if (filter === 'pending_review') return status === 'draft_approved' || status === 'pending_review';
  return status === filter;
}

/** 内容交付 · 发单管理列表阶段 */
export type OrderDispatchStatusFilter = 'all' | 'published' | 'accepted' | 'cancelled';

export const ORDER_DISPATCH_STATUS_TABS: { id: OrderDispatchStatusFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'published', label: '待接单' },
  { id: 'accepted', label: '已接单' },
  { id: 'cancelled', label: '已撤回' },
];

export function parseOrderDispatchStageFromUrl(): OrderDispatchStatusFilter {
  const stage = new URLSearchParams(window.location.search).get('orderDispatchStage');
  if (ORDER_DISPATCH_STATUS_TABS.some((t) => t.id === stage)) {
    return stage as OrderDispatchStatusFilter;
  }
  return 'all';
}

export function orderDispatchStageFromHint(hint?: string): OrderDispatchStatusFilter | null {
  if (!hint) return null;
  if (hint === 'pending_provider' || hint === 'order_manage:published') return 'published';
  if (hint === 'cancelled' || hint === 'order_manage:cancelled') return 'cancelled';
  if (hint === 'accepted' || hint === 'order_manage:accepted') return 'accepted';
  if (hint === 'order_manage' || hint === 'order_manage:all') return 'all';
  return null;
}

export function orderMatchesDispatchFilter(status: string, filter: OrderDispatchStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'published') return status === 'published';
  if (filter === 'cancelled') return status === 'cancelled';
  if (filter === 'accepted') return status !== 'published' && status !== 'cancelled';
  return true;
}

export function countOrdersByDispatchFilter(
  orders: { status: string }[]
): Record<OrderDispatchStatusFilter, number> {
  const counts: Record<OrderDispatchStatusFilter, number> = {
    all: orders.length,
    published: 0,
    accepted: 0,
    cancelled: 0,
  };
  for (const o of orders) {
    if (o.status === 'published') counts.published += 1;
    else if (o.status === 'cancelled') counts.cancelled += 1;
    else counts.accepted += 1;
  }
  return counts;
}
