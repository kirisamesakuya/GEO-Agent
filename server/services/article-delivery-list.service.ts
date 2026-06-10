import { isAllBrandsScope } from './organization.service.js';
import { listContentBatches } from './content.service.js';
import { listPublishRecords } from './publish-plan.service.js';
import { listOrdersByBrand, type ListOrdersByBrandOptions } from './order.service.js';
import { isArticleContentOrder } from './article-delivery.service.js';
import {
  countStages,
  mapAiItemStage,
  mapManualOrderStage,
  rowMatchesStageFilter,
  type ArticleDeliveryStage,
  type ArticleDeliveryStageFilter,
} from '../lib/article-delivery-stage.js';

export type ArticleDeliverySource = 'ai_generated' | 'manual_order' | 'imported';

export interface ArticleDeliveryRowDto {
  id: string;
  source: ArticleDeliverySource;
  sourceId: string;
  batchId?: string;
  brandName: string;
  title: string;
  platform: string;
  ownerLabel: string;
  stage: ArticleDeliveryStage;
  updatedAt: string;
  createdAt: string;
  publishResultLabel?: string;
  publishUrl?: string;
  evidenceCount?: number;
  projectName?: string;
  providerName?: string;
  publishRecordId?: string;
  /** 原始 TaskOrder.status（仅 manual_order） */
  taskOrderStatus?: string;
}

export interface ListArticleDeliveriesOptions {
  brandName: string;
  stage?: ArticleDeliveryStageFilter;
  source?: 'all' | ArticleDeliverySource;
  platform?: string;
  limit?: number;
}

function publishResultForManual(stage: ArticleDeliveryStage): string {
  if (stage === 'pending_provider') return '大厅招募中';
  if (stage === 'writing') return '撰写中';
  if (stage === 'draft_review') return '草稿待审';
  if (stage === 'pending_publish') return '待回填链接';
  if (stage === 'pending_acceptance' || stage === 'final_revision') return '待验收';
  if (stage === 'completed') return '已验收';
  if (stage === 'disputed') return '争议处理中';
  if (stage === 'cancelled') return '已撤回';
  return '—';
}

function publishResultForAi(stage: ArticleDeliveryStage, record?: {
  status: string;
  publishedUrl?: string;
  errorCode?: string;
  reviewCategory?: string;
}): { label: string; url?: string; evidenceCount?: number } {
  if (stage === 'publish_failed') {
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
  if (stage === 'publishing') return { label: '已排程' };
  if (stage === 'published') return { label: '已发布', url: record?.publishedUrl };
  return { label: '—' };
}

async function buildAiRows(brandName: string): Promise<ArticleDeliveryRowDto[]> {
  const batches = await listContentBatches({
    brandName: isAllBrandsScope(brandName) ? undefined : brandName,
    limit: 200,
  });

  const records =
    brandName && !isAllBrandsScope(brandName)
      ? await listPublishRecords(brandName)
      : [];

  const recordByItem = new Map<string, (typeof records)[number]>();
  for (const rec of records) {
    if (rec.contentItemId && !recordByItem.has(rec.contentItemId)) {
      recordByItem.set(rec.contentItemId, rec);
    }
  }

  const rows: ArticleDeliveryRowDto[] = [];
  for (const batch of batches) {
    const projectLabel = batch.taskId
      ? `GEO文章批次 ${batch.createdAt.slice(5, 7)}`
      : `GEO文章批次 ${batch.createdAt.slice(5, 7)}`;

    for (const item of batch.items ?? []) {
      const record = recordByItem.get(item.id);
      const stage = mapAiItemStage({
        batchStatus: batch.status,
        itemPublishStatus: item.publishStatus,
        itemStatus: item.status,
        recordStatus: record?.status,
        recordPublishedUrl: record?.publishedUrl,
        effectVerificationJson: item.effectVerificationJson,
      });
      const pub = publishResultForAi(stage, record);

      rows.push({
        id: `ai:${item.id}`,
        source: 'ai_generated',
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

async function buildManualRows(
  brandName: string,
  orderOptions?: ListOrdersByBrandOptions
): Promise<ArticleDeliveryRowDto[]> {
  const orders = await listOrdersByBrand(brandName, orderOptions);
  return orders
    .filter(isArticleContentOrder)
    .map((o) => {
      const stage = mapManualOrderStage(o.status);
      return {
        id: `manual:${o.id}`,
        source: 'manual_order' as const,
        sourceId: o.id,
        brandName: o.brandName,
        title: o.title,
        platform: o.platform,
        ownerLabel: o.providerName ?? '待接单',
        stage,
        updatedAt: (o.updatedAt ?? o.createdAt).toISOString(),
        createdAt: o.createdAt.toISOString(),
        publishResultLabel: publishResultForManual(stage),
        providerName: o.providerName ?? undefined,
        taskOrderStatus: o.status,
      };
    });
}

function mergeRows(aiRows: ArticleDeliveryRowDto[], manualRows: ArticleDeliveryRowDto[]): ArticleDeliveryRowDto[] {
  return [...aiRows, ...manualRows].sort((a, b) => {
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    return tb - ta;
  });
}

function applyFilters(
  rows: ArticleDeliveryRowDto[],
  opts: ListArticleDeliveriesOptions
): ArticleDeliveryRowDto[] {
  const stage = opts.stage ?? 'all';
  const source = opts.source ?? 'all';
  const platform = opts.platform?.trim();

  return rows.filter((row) => {
    if (!rowMatchesStageFilter(row.stage, stage)) return false;
    if (source !== 'all' && row.source !== source) return false;
    if (platform && row.platform !== platform) return false;
    return true;
  });
}

export async function listArticleDeliveries(
  opts: ListArticleDeliveriesOptions
): Promise<ArticleDeliveryRowDto[]> {
  const stage = opts.stage ?? 'all';
  const orderOptions: ListOrdersByBrandOptions | undefined =
    stage === 'all' || stage === 'published'
      ? { articleOnly: true }
      : stage === 'pending_provider' ||
          stage === 'writing' ||
          stage === 'draft_review' ||
          stage === 'draft_revision' ||
          stage === 'pending_publish' ||
          stage === 'pending_acceptance' ||
          stage === 'completed' ||
          stage === 'cancelled'
        ? { articleOnly: true, stage }
        : { articleOnly: true };

  const needAi = stage === 'all' || stage === 'pending_publish' || stage === 'published';
  const [aiRows, manualRows] = await Promise.all([
    needAi ? buildAiRows(opts.brandName) : Promise.resolve([]),
    buildManualRows(opts.brandName, orderOptions),
  ]);

  let rows = mergeRows(aiRows, manualRows);
  rows = applyFilters(rows, opts);

  const limit = opts.limit ?? 500;
  return rows.slice(0, limit);
}

export async function countArticleDeliveriesByStage(
  brandName: string
): Promise<Record<ArticleDeliveryStageFilter, number>> {
  const [aiRows, manualRows] = await Promise.all([
    buildAiRows(brandName),
    buildManualRows(brandName, { articleOnly: true }),
  ]);
  const rows = mergeRows(aiRows, manualRows);
  return countStages(rows.map((r) => r.stage));
}

export async function countTaskOrdersByStage(
  brandName: string,
  articleOnly = true
): Promise<Record<string, number>> {
  const orders = await listOrdersByBrand(brandName, { articleOnly });
  const counts: Record<string, number> = {};
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  return counts;
}
