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

/** 需求备注是否来自网站 GEO 分析并附带方案摘要 */
export function hasWebsiteGeoAnalysisNotes(notes?: string | null): boolean {
  if (!notes) return false;
  return notes.includes('来源：网站 GEO 资产') || notes.includes('分析摘要：');
}

export interface WebsiteGeoAnalysisNotes {
  hasAnalysis: boolean;
  source?: string;
  reportId?: string;
  reportTitle?: string;
  websiteFromNotes?: string;
  scope?: string;
  summary?: string;
  plainNotes?: string;
}

function pickPrefixedLine(notes: string, prefix: string): string | undefined {
  const line = notes.split('\n').find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : undefined;
}

/** 从需求备注解析 GEO 网站分析结构化字段 */
export function parseWebsiteGeoAnalysisFromNotes(
  notes?: string | null
): WebsiteGeoAnalysisNotes {
  const raw = notes?.trim() ?? '';
  if (!raw) return { hasAnalysis: false };
  if (!hasWebsiteGeoAnalysisNotes(raw)) {
    return { hasAnalysis: false, plainNotes: raw };
  }

  const summaryIdx = raw.indexOf('分析摘要：');
  const summary =
    summaryIdx >= 0 ? raw.slice(summaryIdx + '分析摘要：'.length).trim() : undefined;

  return {
    hasAnalysis: true,
    source: pickPrefixedLine(raw, '来源：'),
    reportId: pickPrefixedLine(raw, '关联报告：'),
    reportTitle: pickPrefixedLine(raw, '报告标题：'),
    websiteFromNotes: pickPrefixedLine(raw, '官网：'),
    scope: pickPrefixedLine(raw, '分析范围：'),
    summary,
  };
}

/** 从需求备注解析关联 GEO 报告 ID */
export function parseGeoReportIdFromWebsiteNotes(notes?: string | null): string | undefined {
  if (!notes) return undefined;
  const line = notes.split('\n').find((l) => l.startsWith('关联报告：'));
  if (!line) return undefined;
  const id = line.slice('关联报告：'.length).trim();
  return id || undefined;
}

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
