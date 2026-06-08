// 本期网页需求以后台线下交付为主，前台仅记录是否已交付结果。
// 复杂执行流、排期、线上验收暂不展示，后续恢复时从 website requirement 状态扩展。

export type WebsiteRequirementStatusFilter =
  | 'all'
  | 'pending'
  | 'delivered';

/** 精简版状态 Tab（本期前台：线下交付，无「需补充」） */
export const WEBSITE_REQUIREMENT_STATUS_TABS: {
  id: WebsiteRequirementStatusFilter;
  label: string;
}[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待交付' },
  { id: 'delivered', label: '已交付' },
];

export interface WebsiteRequirementRow {
  id: string;
  brandName?: string;
  pageType: string;
  goal: string;
  referenceUrl?: string | null;
  keywords?: string | null;
  contact?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  orders?: Array<{
    id: string;
    status: string;
    previewUrl?: string | null;
    deliveryNote?: string | null;
    revisionReason?: string | null;
  }>;
}

function deriveRawWebsiteStatus(
  req: WebsiteRequirementRow
): 'pending' | 'in_progress' | 'delivered' {
  const order = req.orders?.[0];
  if (order?.status === 'completed') return 'delivered';
  if (order?.status === 'revision') return 'in_progress';
  if (order || req.status === 'ordered') return 'in_progress';
  if (req.status === 'preview_ready') return 'in_progress';
  return 'pending';
}

/** 对外展示用的精简状态 */
export function deriveWebsiteRequirementStatus(
  req: WebsiteRequirementRow
): Exclude<WebsiteRequirementStatusFilter, 'all'> {
  const raw = deriveRawWebsiteStatus(req);
  if (raw === 'in_progress') return 'pending';
  return raw;
}

export const WEBSITE_REQUIREMENT_STATUS_LABEL: Record<
  Exclude<WebsiteRequirementStatusFilter, 'all'>,
  string
> = {
  pending: '待交付',
  delivered: '已交付',
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
