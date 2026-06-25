import type { ViewType } from '../../src/types.js';

export interface WorkbenchTaskStat {
  label: string;
  value: number;
}

export interface WorkbenchBoardCard {
  id: string;
  title: string;
  category: 'content' | 'website';
  categoryLabel: string;
  brandStatus: string;
  statusTone: 'warning' | 'info' | 'neutral';
  stats: WorkbenchTaskStat[];
  actionLabel: string;
  targetView: ViewType;
  targetHint?: string;
}

export interface WorkbenchRecentRow {
  id: string;
  title: string;
  statusLabel: string;
  categoryLabel: string;
  responsibleParty?: string;
  completedAt: string;
  targetView: ViewType;
  targetHint?: string;
}

const CONTENT_STATUS_LABEL: Record<string, string> = {
  quote_open: '待报价',
  quote_review: '报价确认中',
  awaiting_freeze: '待冻结',
  matched: '已撮合',
  in_progress: '执行发布中',
  pending_review: '待验收',
  published: '待接单',
};

function contentStatusTone(status: string): WorkbenchBoardCard['statusTone'] {
  if (['quote_review', 'awaiting_freeze', 'pending_review'].includes(status)) return 'warning';
  if (['quote_open', 'in_progress', 'matched', 'published'].includes(status)) return 'info';
  return 'neutral';
}

function buildContentStats(
  status: string,
  pendingQuotes: number
): WorkbenchTaskStat[] {
  if (status === 'quote_review') {
    return [
      { label: '待确认报价', value: pendingQuotes },
      { label: '执行发布中', value: 0 },
    ];
  }
  if (status === 'in_progress') {
    return [
      { label: '执行发布中', value: 1 },
      { label: '待验收', value: 0 },
    ];
  }
  if (status === 'pending_review') {
    return [
      { label: '待验收', value: 1 },
      { label: '执行发布中', value: 0 },
    ];
  }
  if (status === 'quote_open') {
    return [
      { label: '待报价', value: pendingQuotes },
      { label: '执行发布中', value: 0 },
    ];
  }
  return [{ label: '进行中', value: 1 }];
}

function websiteCategoryLabel(pageType?: string | null): string {
  const pt = pageType ?? '';
  if (pt.includes('新建') || pt.includes('新站') || pt.includes('专题新站')) return '新建网站';
  return '自有网站优化';
}

function websiteStatusLabel(status: string, pageType?: string | null): string {
  if (status === 'revision') return '方案确认中';
  if (status === 'pending') {
    return pageType?.includes('GEO') || pageType?.includes('优化') ? '待工程排期' : '方案确认中';
  }
  if (status === 'in_progress') return '开发中';
  return '交付中';
}

function websiteStatusTone(status: string): WorkbenchBoardCard['statusTone'] {
  if (status === 'revision' || status === 'pending') return 'warning';
  if (status === 'in_progress') return 'info';
  return 'neutral';
}

function buildWebsiteStats(status: string, pageType?: string | null): WorkbenchTaskStat[] {
  const isNewSite = websiteCategoryLabel(pageType) === '新建网站';
  if (isNewSite) {
    return [
      { label: '方案待确认', value: status === 'pending' || status === 'revision' ? 1 : 0 },
      { label: '开发中', value: status === 'in_progress' ? 1 : 0 },
      { label: '已上线', value: 0 },
    ];
  }
  return [
    { label: 'AI建议已出', value: pageType?.includes('GEO') ? 1 : 0 },
    { label: '待工程处理', value: status === 'pending' || status === 'revision' ? 1 : 0 },
    { label: '已上线', value: 0 },
  ];
}

type ContentOrderInput = {
  id: string;
  title: string;
  status: string;
  platform?: string | null;
  providerName?: string | null;
  quotes?: Array<{ status?: string }>;
  updatedAt: Date;
};

type WebsiteOrderInput = {
  id: string;
  requestId: string;
  status: string;
  assigneeName?: string | null;
  updatedAt: Date;
  request?: {
    goal?: string;
    pageType?: string;
  } | null;
};

export function buildContentBoardCard(o: ContentOrderInput): WorkbenchBoardCard {
  const pendingQuotes = o.quotes?.filter((q) => q.status === 'pending').length ?? o.quotes?.length ?? 0;
  const brandStatus = CONTENT_STATUS_LABEL[o.status] ?? o.status;
  return {
    id: o.id,
    title: o.title.replace(/^\[演示\]\s*/, '').replace(/^\[工作台演示\]\s*/, ''),
    category: 'content',
    categoryLabel: '内容优化',
    brandStatus,
    statusTone: contentStatusTone(o.status),
    stats: buildContentStats(o.status, pendingQuotes),
    actionLabel: o.status === 'quote_review' ? '查看报价' : '查看进度',
    targetView: 'content_delivery',
    targetHint: o.status === 'quote_review' ? `order:${o.id}` : `delivery:order:${o.id}`,
  };
}

export function buildWebsiteBoardCard(w: WebsiteOrderInput): WorkbenchBoardCard {
  const pageType = w.request?.pageType;
  const categoryLabel = websiteCategoryLabel(pageType);
  const brandStatus = websiteStatusLabel(w.status, pageType);
  return {
    id: w.id,
    title: w.request?.keywords?.slice(0, 40) || w.request?.goal?.slice(0, 40) || pageType || '网站优化',
    category: 'website',
    categoryLabel,
    brandStatus,
    statusTone: websiteStatusTone(w.status),
    stats: buildWebsiteStats(w.status, pageType),
    actionLabel: categoryLabel === '新建网站' ? '查看方案' : '查看建议',
    targetView: categoryLabel === '新建网站' ? 'create_website' : 'site_optimize',
    targetHint: w.requestId,
  };
}

export function buildContentRecentRow(o: ContentOrderInput): WorkbenchRecentRow {
  return {
    id: o.id,
    title: o.title.replace(/^\[演示\]\s*/, '').replace(/^\[工作台演示\]\s*/, ''),
    statusLabel: '已完成',
    categoryLabel: '内容优化',
    responsibleParty: o.platform || o.providerName || undefined,
    completedAt: o.updatedAt.toISOString(),
    targetView: 'content_delivery',
    targetHint: `delivery:order:${o.id}`,
  };
}

export function buildWebsiteRecentRow(w: WebsiteOrderInput): WorkbenchRecentRow {
  const categoryLabel = websiteCategoryLabel(w.request?.pageType);
  return {
    id: w.id,
    title: w.request?.goal?.slice(0, 60) || w.request?.pageType || '网站任务',
    statusLabel: '已完成',
    categoryLabel,
    responsibleParty: w.assigneeName || '平台工程',
    completedAt: w.updatedAt.toISOString(),
    targetView: categoryLabel === '新建网站' ? 'create_website' : 'site_optimize',
    targetHint: w.requestId,
  };
}
