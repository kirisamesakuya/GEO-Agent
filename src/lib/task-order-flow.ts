/** 走「草稿审稿 → 发布回填 → 最终验收」双阶段交付的任务类型 */
export const ARTICLE_TASK_TYPES = new Set(['种草', '探店', '问答覆盖', '测评', '文章', 'GEO']);

export type TaskOrderStatus =
  | 'published'
  | 'in_progress'
  | 'draft_review'
  | 'draft_revision'
  | 'draft_approved'
  | 'pending_review'
  | 'revision'
  | 'completed'
  | 'disputed';

export interface TaskOrderLike {
  type?: string;
  deliverable?: string;
  status?: string;
}

export function isArticleContentOrder(order: TaskOrderLike): boolean {
  if (order.type && ARTICLE_TASK_TYPES.has(order.type)) return true;
  const d = order.deliverable ?? '';
  return /文章|笔记|种草|测评|问答|文案/i.test(d);
}

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
};

/** 发布端任务列表/详情展示用，避免与 Agent「已入队」等技术态混用 */
export function taskOrderStatusLabel(status?: string): string {
  if (!status) return '—';
  return TASK_ORDER_STATUS_LABEL[status] ?? status;
}

export function taskOrderStatusClass(status?: string): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'disputed') return 'bg-red-50 text-red-700';
  if (status === 'published') return 'bg-sky-50 text-sky-700';
  if (status === 'pending_review' || status === 'draft_review') return 'bg-amber-50 text-amber-700';
  if (status === 'draft_revision' || status === 'revision') return 'bg-orange-50 text-orange-700';
  return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
}

export function formatTaskOrderListTime(iso?: string): string {
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

export const DELIVERY_STAGE_LABEL: Record<string, string> = {
  draft: '文章草稿',
  final: '发布交付',
};

export const DELIVERY_REVIEW_STATUS_LABEL: Record<string, string> = {
  submitted: '待审稿',
  approved: '已通过',
  revision_requested: '需修改',
};
