/** 与前端 `src/lib/article-delivery-unified.ts` 保持一致的统一交付阶段 */
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

export type ArticleDeliveryStageFilter =
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

export const TASK_ORDER_STATUS_LABEL: Record<string, string> = {
  published: '待接单',
  in_progress: '写作中',
  draft_review: '待审稿',
  draft_revision: '审稿返修',
  draft_approved: '待发布',
  pending_review: '待最终验收',
  revision: '最终返修',
  completed: '已完成',
  disputed: '争议中',
  cancelled: '已撤回',
};

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

/** 统一阶段筛选 → TaskOrder.status 列表（仅人工订单） */
export function taskOrderStatusesForStageFilter(
  stage: ArticleDeliveryStageFilter
): string[] | undefined {
  switch (stage) {
    case 'pending_provider':
      return ['published'];
    case 'writing':
      return ['in_progress'];
    case 'draft_review':
      return ['draft_review'];
    case 'draft_revision':
      return ['draft_revision'];
    case 'pending_publish':
      return ['draft_approved'];
    case 'pending_acceptance':
      return ['pending_review', 'revision'];
    case 'completed':
      return ['completed'];
    case 'cancelled':
      return ['cancelled'];
    case 'published':
      return [];
    case 'all':
      return undefined;
    default:
      return undefined;
  }
}

export function rowMatchesStageFilter(stage: ArticleDeliveryStage, filter: ArticleDeliveryStageFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending_provider') return stage === 'pending_provider';
  if (filter === 'writing') return stage === 'writing';
  if (filter === 'draft_review') return stage === 'draft_review';
  if (filter === 'draft_revision') return stage === 'draft_revision';
  if (filter === 'pending_publish') {
    return stage === 'pending_publish' || stage === 'publishing' || stage === 'publish_failed';
  }
  if (filter === 'published') return stage === 'published';
  if (filter === 'pending_acceptance') return stage === 'pending_acceptance' || stage === 'final_revision';
  if (filter === 'completed') return stage === 'completed';
  if (filter === 'cancelled') return stage === 'cancelled';
  return true;
}

export function emptyStageCounts(): Record<ArticleDeliveryStageFilter, number> {
  return {
    all: 0,
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
}

export function countStages(stages: ArticleDeliveryStage[]): Record<ArticleDeliveryStageFilter, number> {
  const counts = emptyStageCounts();
  counts.all = stages.length;
  for (const stage of stages) {
    if (stage === 'pending_provider') counts.pending_provider += 1;
    if (stage === 'writing') counts.writing += 1;
    if (stage === 'draft_review') counts.draft_review += 1;
    if (stage === 'draft_revision') counts.draft_revision += 1;
    if (stage === 'pending_publish' || stage === 'publishing' || stage === 'publish_failed') {
      counts.pending_publish += 1;
    }
    if (stage === 'published') counts.published += 1;
    if (stage === 'pending_acceptance' || stage === 'final_revision') counts.pending_acceptance += 1;
    if (stage === 'completed') counts.completed += 1;
    if (stage === 'cancelled') counts.cancelled += 1;
  }
  return counts;
}

function parseEffectPublishUrl(json?: string | null): string | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as { publishUrl?: string };
    return typeof parsed.publishUrl === 'string' ? parsed.publishUrl : undefined;
  } catch {
    return undefined;
  }
}

export function mapAiItemStage(input: {
  batchStatus: string;
  itemPublishStatus?: string | null;
  itemStatus: string;
  recordStatus?: string;
  recordPublishedUrl?: string;
  effectVerificationJson?: string | null;
}): ArticleDeliveryStage {
  const { batchStatus, itemPublishStatus, itemStatus, recordStatus, recordPublishedUrl, effectVerificationJson } =
    input;
  if (batchStatus === 'failed' || itemPublishStatus === 'failed') return 'publish_failed';
  if (itemPublishStatus === 'scheduled') return 'publishing';

  const effectUrl = parseEffectPublishUrl(effectVerificationJson);
  const hasBackfill = Boolean(recordPublishedUrl || effectUrl);

  if (itemPublishStatus === 'published' || itemStatus === 'published') {
    if (!hasBackfill && recordStatus !== 'succeeded') return 'publish_failed';
    return 'published';
  }
  return 'pending_publish';
}
