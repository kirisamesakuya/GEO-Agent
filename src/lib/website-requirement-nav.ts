export type WebsiteRequirementStatusFilter =
  | 'all'
  | 'pending'
  | 'in_progress'
  | 'delivered'
  | 'need_info';

export const WEBSITE_REQUIREMENT_STATUS_TABS: {
  id: WebsiteRequirementStatusFilter;
  label: string;
}[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待处理' },
  { id: 'in_progress', label: '处理中' },
  { id: 'delivered', label: '已交付' },
  { id: 'need_info', label: '需补充' },
];

export interface WebsiteRequirementRow {
  id: string;
  brandName?: string;
  pageType: string;
  goal: string;
  referenceUrl?: string | null;
  status: string;
  createdAt: string;
  orders?: Array<{ id: string; status: string; previewUrl?: string | null; deliveryNote?: string | null }>;
}

export function deriveWebsiteRequirementStatus(
  req: WebsiteRequirementRow
): WebsiteRequirementStatusFilter {
  const order = req.orders?.[0];
  if (order?.status === 'completed') return 'delivered';
  if (order?.status === 'revision') return 'need_info';
  if (order || req.status === 'ordered') return 'in_progress';
  if (req.status === 'preview_ready') return 'in_progress';
  return 'pending';
}

export const WEBSITE_REQUIREMENT_STATUS_LABEL: Record<WebsiteRequirementStatusFilter, string> = {
  all: '全部',
  pending: '待处理',
  in_progress: '处理中',
  delivered: '已交付',
  need_info: '需补充',
};

export function websiteRequirementDetailHint(id: string) {
  return `website_req:${id}`;
}

export function parseWebsiteRequirementIdFromHint(hint?: string): string | undefined {
  if (hint?.startsWith('website_req:')) return hint.slice('website_req:'.length);
  return undefined;
}

export function parseWebsiteRequirementStatusFromUrl(): WebsiteRequirementStatusFilter {
  const s = new URLSearchParams(window.location.search).get('websiteStatus');
  if (WEBSITE_REQUIREMENT_STATUS_TABS.some((t) => t.id === s)) {
    return s as WebsiteRequirementStatusFilter;
  }
  return 'all';
}

export function taskOrderDetailHint(orderId: string) {
  return `order:${orderId}`;
}

export function parseTaskOrderIdFromHint(hint?: string): string | undefined {
  if (hint?.startsWith('order:')) return hint.slice('order:'.length);
  return undefined;
}
