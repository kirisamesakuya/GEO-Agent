import type { ContentBatch, ContentItem } from '../types';
import { matchesDateRange } from './date-filter';
import { parseEffectVerification } from './content-item-meta';
import { isArticleContentOrder } from './task-order-flow';

// 本期内容交付仅开放文章类交付；非文章类任务暂不进入统一列表。
// 后续恢复短视频、设计、账号运维等交付类型时，可从 source/type 维度扩展。

export type ArticleDeliverySource = 'ai_generated' | 'manual_order' | 'imported';

export type ArticleDeliveryStage =
  | 'pending_provider'
  | 'writing'
  | 'draft_review'
  | 'draft_revision'
  | 'pending_publish'
  | 'publishing'
  | 'published'
  | 'publish_failed'
  | 'pending_acceptance'
  | 'final_revision'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export interface ArticleDeliveryRow {
  id: string;
  source: ArticleDeliverySource;
  sourceId: string;
  batchId?: string;
  brandName: string;
  title: string;
  platform: string;
  ownerLabel: string;
  stage: ArticleDeliveryStage;
  updatedAt?: string;
  createdAt: string;
  publishResultLabel?: string;
  publishUrl?: string;
  evidenceCount?: number;
  projectName?: string;
  providerName?: string;
  publishRecordId?: string;
}

export type ArticleDeliveryStatusFilter =
  | 'all'
  | 'pending_provider'
  | 'writing'
  | 'draft_review'
  | 'draft_revision'
  | 'pending_publish'
  | 'published'
  | 'pending_acceptance'
  | 'completed'
  | 'cancelled';

export type ArticleDeliverySourceFilter = 'all' | ArticleDeliverySource;

/** 文章交付列表阶段 Tab（待接单、已撤回归发单管理） */
export const ARTICLE_DELIVERY_STATUS_TABS: {
  id: ArticleDeliveryStatusFilter;
  label: string;
}[] = [
  { id: 'all', label: '全部' },
  { id: 'writing', label: '写作中' },
  { id: 'draft_review', label: '待审稿' },
  { id: 'draft_revision', label: '审稿返修' },
  { id: 'pending_publish', label: '待发布' },
  { id: 'published', label: '已发布' },
  { id: 'pending_acceptance', label: '待验收' },
  { id: 'completed', label: '已完成' },
];

/** 仅出现在发单管理、不进入文章交付统一列表的阶段 */
export function isOrderDispatchOnlyStage(stage: ArticleDeliveryStage): boolean {
  return stage === 'pending_provider' || stage === 'cancelled';
}

export function filterArticleDeliveryListRows(rows: ArticleDeliveryRow[]): ArticleDeliveryRow[] {
  return rows.filter((row) => {
    if (row.source !== 'manual_order') return true;
    return !isOrderDispatchOnlyStage(row.stage);
  });
}

export const ARTICLE_DELIVERY_SOURCE_OPTIONS: { id: ArticleDeliverySourceFilter; label: string }[] = [
  { id: 'all', label: '全部来源' },
  { id: 'ai_generated', label: '自有内容（Hermes）' },
  { id: 'manual_order', label: '服务商交付' },
];

/** 列表快捷来源筛选（不含未开放能力） */
export const ARTICLE_DELIVERY_QUICK_SOURCE_FILTERS: ArticleDeliverySource[] = [
  'ai_generated',
  'manual_order',
];

export const ARTICLE_DELIVERY_PLATFORM_OPTIONS = [
  { id: '', label: '全部平台' },
  { id: '多平台', label: '多平台' },
];

export function buildArticleDeliveryPlatformOptions(labels: string[]) {
  return [
    { id: '', label: '全部平台' },
    ...labels.map((label) => ({ id: label, label })),
    { id: '多平台', label: '多平台' },
  ];
}

export const ARTICLE_DELIVERY_SOURCE_LABEL: Record<ArticleDeliverySource, string> = {
  ai_generated: '自有·Hermes',
  manual_order: '服务商',
  imported: '导入',
};

/** 内容交付渠道 Tab：自有 Hermes vs 服务商接单 */
export type ArticleDeliveryChannelFilter = 'all' | 'self' | 'provider';

export const ARTICLE_DELIVERY_CHANNEL_TABS: {
  id: ArticleDeliveryChannelFilter;
  label: string;
  desc: string;
}[] = [
  { id: 'all', label: '全部', desc: '自有内容与服务商订单' },
  { id: 'self', label: '自有内容', desc: 'AI 生成 · Hermes 发布' },
  { id: 'provider', label: '服务商交付', desc: '接单方写作/发布 · 需验收' },
];

export function parseDeliveryChannelFromUrl(): ArticleDeliveryChannelFilter {
  const ch = new URLSearchParams(window.location.search).get('deliveryChannel');
  if (ch === 'self' || ch === 'provider' || ch === 'all') return ch;
  return 'all';
}

export function channelToSourceFilter(
  channel: ArticleDeliveryChannelFilter
): ArticleDeliverySourceFilter {
  if (channel === 'self') return 'ai_generated';
  if (channel === 'provider') return 'manual_order';
  return 'all';
}

export const ARTICLE_DELIVERY_STAGE_LABEL: Record<ArticleDeliveryStage, string> = {
  pending_provider: '待接单',
  writing: '写作中',
  draft_review: '待审稿',
  draft_revision: '审稿返修',
  pending_publish: '待发布',
  publishing: '发布中',
  published: '已发布',
  publish_failed: '发布失败',
  pending_acceptance: '待验收',
  final_revision: '最终返修',
  completed: '已完成',
  disputed: '争议中',
  cancelled: '已撤回',
};

export function articleDeliveryStageClass(stage: ArticleDeliveryStage): string {
  if (stage === 'published' || stage === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (stage === 'pending_provider' || stage === 'pending_publish' || stage === 'publishing') {
    return 'bg-sky-50 text-sky-700';
  }
  if (stage === 'draft_review' || stage === 'pending_acceptance') return 'bg-amber-50 text-amber-700';
  if (stage === 'draft_revision' || stage === 'final_revision') return 'bg-orange-50 text-orange-700';
  if (stage === 'cancelled') return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-03)]';
  if (stage === 'publish_failed' || stage === 'disputed') return 'bg-red-50 text-red-700';
  return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
}

export function articleDeliverySourceClass(source: ArticleDeliverySource): string {
  if (source === 'ai_generated') return 'bg-emerald-50 text-emerald-700';
  if (source === 'manual_order') return 'bg-blue-50 text-blue-700';
  return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
}

interface TaskOrderRow {
  id: string;
  brandName?: string;
  title: string;
  platform: string;
  status: string;
  providerName?: string;
  type?: string;
  deliverable?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PublishRecordLite {
  id: string;
  contentItemId?: string;
  status: string;
  publishedUrl?: string;
  errorCode?: string;
  reviewCategory?: string;
  accountName?: string;
  executedAt?: string;
}

function mapAiItemStage(
  item: ContentItem,
  batch: ContentBatch,
  record?: PublishRecordLite
): ArticleDeliveryStage {
  if (batch.status === 'failed' || item.publishStatus === 'failed') return 'publish_failed';
  if (item.publishStatus === 'scheduled') return 'publishing';

  const effectUrl = parseEffectVerification(item.effectVerificationJson)?.publishUrl;
  const hasBackfill = Boolean(record?.publishedUrl || effectUrl);

  if (item.publishStatus === 'published' || item.status === 'published') {
    if (!hasBackfill && record?.status !== 'succeeded') return 'publish_failed';
    return 'published';
  }
  return 'pending_publish';
}

export function mapManualOrderStage(status: string): ArticleDeliveryStage {
  switch (status) {
    case 'published':
      return 'pending_provider';
    case 'in_progress':
      return 'writing';
    case 'draft_review':
      return 'draft_review';
    case 'draft_revision':
      return 'draft_revision';
    case 'draft_approved':
      return 'pending_publish';
    case 'pending_review':
      return 'pending_acceptance';
    case 'revision':
      return 'final_revision';
    case 'completed':
      return 'completed';
    case 'disputed':
      return 'disputed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'writing';
  }
}

function publishResultForAi(
  item: ContentItem,
  record: PublishRecordLite | undefined,
  stage: ArticleDeliveryStage
): { label: string; url?: string; evidenceCount?: number } {
  if (stage === 'publish_failed') {
    if (
      (item.publishStatus === 'published' || item.status === 'published') &&
      !record?.publishedUrl
    ) {
      return { label: '待回填链接' };
    }
    return { label: record?.errorCode ?? record?.reviewCategory ?? '发布失败' };
  }
  if (record?.status === 'succeeded' && record.publishedUrl) {
    return { label: '链接+证据', url: record.publishedUrl, evidenceCount: 2 };
  }
  if (record?.status === 'failed') {
    return { label: record.errorCode ?? '发布失败' };
  }
  if (record?.status === 'need_reauth' || record?.reviewCategory === 'need_reauth') {
    return { label: '账号需授权' };
  }
  if (item.publishStatus === 'scheduled') return { label: '已排程' };
  if (item.publishStatus === 'published' || item.status === 'published') {
    return { label: '已发布', url: record?.publishedUrl };
  }
  if (item.status === 'draft') return { label: '草稿待审' };
  return { label: '—' };
}

function publishResultForManual(status: ArticleDeliveryStage): string {
  if (status === 'pending_provider') return '大厅招募中';
  if (status === 'writing') return '撰写中';
  if (status === 'draft_review') return '草稿待审';
  if (status === 'pending_publish') return '待回填链接';
  if (status === 'pending_acceptance') return '待验收';
  if (status === 'completed') return '已验收';
  if (status === 'disputed') return '争议处理中';
  if (status === 'cancelled') return '已撤回';
  return '—';
}

function rowActionForStage(stage: ArticleDeliveryStage): 'view' | 'publish' | 'review' | 'retry' | 'accept' {
  if (stage === 'draft_review') return 'review';
  if (stage === 'pending_publish') return 'publish';
  if (stage === 'publish_failed') return 'retry';
  if (stage === 'pending_acceptance') return 'accept';
  return 'view';
}

export function isAiPublishSelectable(row: ArticleDeliveryRow): boolean {
  return (
    row.source === 'ai_generated' &&
    Boolean(row.batchId) &&
    (row.stage === 'pending_publish' || row.stage === 'publish_failed')
  );
}

export interface AiPublishGroup {
  batchId: string;
  platform: string;
  brandName: string;
  itemIds: string[];
}

export function groupAiRowsForPublish(rows: ArticleDeliveryRow[]): AiPublishGroup[] {
  const map = new Map<string, AiPublishGroup>();
  for (const row of rows) {
    if (!isAiPublishSelectable(row) || !row.batchId) continue;
    const key = `${row.batchId}:${row.platform}`;
    const existing = map.get(key);
    if (existing) {
      existing.itemIds.push(row.sourceId);
    } else {
      map.set(key, {
        batchId: row.batchId,
        platform: row.platform,
        brandName: row.brandName,
        itemIds: [row.sourceId],
      });
    }
  }
  return Array.from(map.values());
}

export function articleDeliveryRowAction(row: ArticleDeliveryRow): ReturnType<typeof rowActionForStage> {
  if (row.source === 'manual_order') {
    const stage = row.stage;
    if (stage === 'draft_review') return 'review';
    if (stage === 'pending_acceptance') return 'accept';
    if (stage === 'pending_publish') return 'view';
    if (stage === 'publish_failed') return 'view';
    return 'view';
  }
  return rowActionForStage(row.stage);
}

export const ARTICLE_DELIVERY_ACTION_LABEL: Record<
  ReturnType<typeof rowActionForStage>,
  string
> = {
  view: '查看',
  publish: '发布',
  review: '审核',
  retry: '重试',
  accept: '验收',
};

export function mapAiContentToRows(
  batches: ContentBatch[],
  publishRecords: PublishRecordLite[],
  projectNames: Map<string, string>
): ArticleDeliveryRow[] {
  const recordByItem = new Map<string, PublishRecordLite>();
  for (const rec of publishRecords) {
    if (rec.contentItemId && !recordByItem.has(rec.contentItemId)) {
      recordByItem.set(rec.contentItemId, rec);
    }
  }

  const rows: ArticleDeliveryRow[] = [];
  for (const batch of batches) {
    const projectLabel =
      (batch.taskId && projectNames.get(batch.taskId)) ||
      `GEO文章批次 ${batch.createdAt.slice(5, 7)}`;

    for (const item of batch.items ?? []) {
      const record = recordByItem.get(item.id);
      const stage = mapAiItemStage(item, batch, record);
      const pub = publishResultForAi(item, record, stage);
      const source: ArticleDeliverySource = 'ai_generated';

      rows.push({
        id: `ai:${item.id}`,
        source,
        sourceId: item.id,
        batchId: batch.id,
        brandName: batch.brandName,
        title: item.title,
        platform: item.platform || batch.platform,
        ownerLabel: projectLabel,
        stage,
        updatedAt: item.updatedAt ?? batch.updatedAt,
        createdAt: item.createdAt ?? batch.createdAt,
        publishResultLabel: pub.label,
        publishUrl: pub.url ?? record?.publishedUrl,
        evidenceCount: pub.evidenceCount,
        projectName: projectLabel,
        publishRecordId: record?.id,
      });
    }
  }
  return rows;
}

export function mapManualOrdersToRows(orders: TaskOrderRow[]): ArticleDeliveryRow[] {
  return orders
    .filter(isArticleContentOrder)
    .map((o) => {
      const stage = mapManualOrderStage(o.status);
      return {
        id: `manual:${o.id}`,
        source: 'manual_order' as const,
        sourceId: o.id,
        brandName: o.brandName ?? '',
        title: o.title,
        platform: o.platform,
        ownerLabel: o.providerName ?? '待接单',
        stage,
        updatedAt: o.updatedAt ?? o.createdAt,
        createdAt: o.createdAt ?? new Date().toISOString(),
        publishResultLabel: publishResultForManual(stage),
        providerName: o.providerName,
      };
    });
}

export function mergeArticleDeliveryRows(
  aiRows: ArticleDeliveryRow[],
  manualRows: ArticleDeliveryRow[]
): ArticleDeliveryRow[] {
  return [...aiRows, ...manualRows].sort((a, b) => {
    const ta = new Date(a.updatedAt ?? a.createdAt).getTime();
    const tb = new Date(b.updatedAt ?? b.createdAt).getTime();
    return tb - ta;
  });
}

export function filterArticleDeliveryRows(
  rows: ArticleDeliveryRow[],
  opts: {
    status: ArticleDeliveryStatusFilter;
    source: ArticleDeliverySourceFilter;
    platform: string;
    owner: string;
    search: string;
    dateSince?: string;
    dateUntil?: string;
  }
): ArticleDeliveryRow[] {
  const q = opts.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.status !== 'all') {
      if (opts.status === 'pending_provider' && row.stage !== 'pending_provider') return false;
      if (opts.status === 'writing' && row.stage !== 'writing') return false;
      if (opts.status === 'draft_review' && row.stage !== 'draft_review') return false;
      if (opts.status === 'draft_revision' && row.stage !== 'draft_revision') return false;
      if (opts.status === 'pending_publish') {
        if (
          row.stage !== 'pending_publish' &&
          row.stage !== 'publishing' &&
          row.stage !== 'publish_failed'
        ) {
          return false;
        }
      }
      if (opts.status === 'published' && row.stage !== 'published') return false;
      if (opts.status === 'pending_acceptance' && row.stage !== 'pending_acceptance') return false;
      if (opts.status === 'completed' && row.stage !== 'completed') return false;
      if (opts.status === 'cancelled' && row.stage !== 'cancelled') return false;
    }
    if (opts.source !== 'all' && row.source !== opts.source) return false;
    if (opts.platform && row.platform !== opts.platform) return false;
    if (opts.owner && row.ownerLabel !== opts.owner) return false;
    if (q && !row.title.toLowerCase().includes(q)) return false;
    if (!matchesDateRange(row.updatedAt ?? row.createdAt, opts.dateSince ?? '', opts.dateUntil ?? '')) {
      return false;
    }
    return true;
  });
}

export function countArticleDeliveryByStatus(
  rows: ArticleDeliveryRow[]
): Record<ArticleDeliveryStatusFilter, number> {
  const counts: Record<ArticleDeliveryStatusFilter, number> = {
    all: rows.length,
    pending_provider: 0,
    writing: 0,
    draft_review: 0,
    draft_revision: 0,
    pending_publish: 0,
    published: 0,
    pending_acceptance: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of rows) {
    if (row.stage === 'pending_provider') counts.pending_provider += 1;
    if (row.stage === 'writing') counts.writing += 1;
    if (row.stage === 'draft_review') counts.draft_review += 1;
    if (row.stage === 'draft_revision') counts.draft_revision += 1;
    if (row.stage === 'pending_publish' || row.stage === 'publishing' || row.stage === 'publish_failed') {
      counts.pending_publish += 1;
    }
    if (row.stage === 'published') counts.published += 1;
    if (row.stage === 'pending_acceptance') counts.pending_acceptance += 1;
    if (row.stage === 'completed') counts.completed += 1;
    if (row.stage === 'cancelled') counts.cancelled += 1;
  }
  return counts;
}

export function formatArticleDeliveryTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function articleDeliveryDetailHint(source: ArticleDeliverySource, sourceId: string): string {
  if (source === 'manual_order') return `delivery:order:${sourceId}`;
  if (source === 'imported') return `delivery:import:${sourceId}`;
  return `delivery:content:${sourceId}`;
}

export function parseArticleDeliveryOrderHint(hint?: string): string | undefined {
  if (hint?.startsWith('delivery:order:')) return hint.slice('delivery:order:'.length);
  return undefined;
}

export function parseArticleDeliveryDetailHint(hint?: string): {
  kind: 'content' | 'import' | 'order';
  id: string;
} | null {
  if (hint?.startsWith('delivery:content:')) {
    return { kind: 'content', id: hint.slice('delivery:content:'.length) };
  }
  if (hint?.startsWith('delivery:import:')) {
    return { kind: 'import', id: hint.slice('delivery:import:'.length) };
  }
  if (hint?.startsWith('delivery:order:')) {
    return { kind: 'order', id: hint.slice('delivery:order:'.length) };
  }
  return null;
}

export function parseArticleDeliveryStatusFromUrl(): ArticleDeliveryStatusFilter {
  const s = new URLSearchParams(window.location.search).get('articleStage');
  if (s && ARTICLE_DELIVERY_STATUS_TABS.some((t) => t.id === s)) {
    return s as ArticleDeliveryStatusFilter;
  }
  return 'all';
}

/** 文章交付列表阶段筛选（不含发单管理阶段） */
export function articleDeliveryStatusFromHint(hint?: string): ArticleDeliveryStatusFilter | null {
  if (!hint) return null;
  if (hint === 'manual') return 'all';
  if (hint === 'writing' || hint === 'order_manage:writing') return 'writing';
  if (ARTICLE_DELIVERY_STATUS_TABS.some((t) => t.id === hint)) {
    return hint as ArticleDeliveryStatusFilter;
  }
  return null;
}
