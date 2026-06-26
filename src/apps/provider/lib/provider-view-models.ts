import type { ProviderPageId } from '../types';

export type ProviderQuoteFunnelTab =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'ordered';

export const QUOTE_FUNNEL_TABS: Array<{ id: ProviderQuoteFunnelTab | ''; label: string }> = [
  { id: '', label: '全部' },
  { id: 'pending', label: '待确认' },
  { id: 'accepted', label: '已中标' },
  { id: 'rejected', label: '未中标' },
  { id: 'expired', label: '已过期' },
  { id: 'ordered', label: '已转订单' },
];

export interface ProviderQuoteRowVm {
  id: string;
  status: string;
  providerExpectedIncomeYuan: string;
  publisherPayAmountYuan: string;
  platformServiceFeeYuan?: string;
  quoteExpiresAt?: string | null;
  createdAt?: string;
  order?: {
    id?: string;
    title?: string;
    brandName?: string;
    status?: string;
    platform?: string;
  };
}

export function classifyQuoteTab(row: ProviderQuoteRowVm): ProviderQuoteFunnelTab {
  const orderStatus = row.order?.status ?? '';
  if (row.status === 'accepted' && orderStatus && !['quote_open', 'quote_review'].includes(orderStatus)) {
    return 'ordered';
  }
  if (row.status === 'accepted') return 'accepted';
  if (row.status === 'rejected') return 'rejected';
  if (row.status === 'pending' && row.quoteExpiresAt && new Date(row.quoteExpiresAt) < new Date()) {
    return 'expired';
  }
  if (row.status === 'pending') return 'pending';
  return 'rejected';
}

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  pending: '待品牌确认',
  accepted: '已中标',
  rejected: '未中标',
};

export interface ProviderHomeWorkbenchVm {
  pendingQuotes: number;
  pendingDelivery: number;
  pendingReview: number;
  activeOrders: number;
  openTasks: number;
  extractable: number;
  accumulatedIncome: number;
  todos: Array<{ type: string; label: string; action?: ProviderPageId }>;
  announcements: string[];
}

export const MOCK_HOME_ANNOUNCEMENTS = [
  '任务大厅采用 P0 到手价报价，系统自动计算成交支付价 G 与平台服务费 F。',
  '审核通过的资料变更在生效前，任务大厅仍展示原资料，请勿担心展示不一致。',
];


export function formatSuggestedRange(minCents?: number | null, maxCents?: number | null): string | null {
  if (minCents == null || maxCents == null) return null;
  return `¥${(minCents / 100).toLocaleString()} – ¥${(maxCents / 100).toLocaleString()}`;
}

export function buildHomeWorkbenchVm(input: {
  summary: {
    openTasks: number;
    pendingDelivery: number;
    pendingReview: number;
    myOrders: number;
  };
  todos: Array<{ type: string; label: string }>;
  wallet: { extractable: number; accumulatedIncome: number };
  pendingQuotes?: number;
}): ProviderHomeWorkbenchVm {
  return {
    openTasks: input.summary.openTasks,
    pendingDelivery: input.summary.pendingDelivery,
    pendingReview: input.summary.pendingReview,
    activeOrders: input.summary.myOrders,
    pendingQuotes: input.pendingQuotes ?? 0,
    extractable: input.wallet.extractable,
    accumulatedIncome: input.wallet.accumulatedIncome,
    todos: input.todos,
    announcements: MOCK_HOME_ANNOUNCEMENTS,
  };
}
