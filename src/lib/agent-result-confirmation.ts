import type { AgentTask } from '../types';

export type ResultPreviewField = {
  key: string;
  label: string;
  current: string;
  suggested: string;
  changed?: boolean;
};

export const KEYWORD_GROUP_OPTIONS = [
  { id: 'brand', label: '品牌词' },
  { id: 'industry', label: '行业词' },
  { id: 'longtail', label: '长尾词' },
  { id: 'geo', label: '地域词' },
  { id: 'competitor', label: '竞品词' },
] as const;

export type ResultPreview = {
  confirmationType:
    | 'brand_profile'
    | 'keyword_suggestions'
    | 'knowledge_entries'
    | 'geo_content_brief';
  fields?: ResultPreviewField[];
  suggestedProfile?: Record<string, unknown> | null;
  currentProfile?: Record<string, unknown> | null;
  totalCount?: number;
  groups?: Array<{ group: string; label: string; terms: string[]; count: number }>;
  suggestions?: Array<{ term: string; group: string }>;
  knowledgeGroups?: Array<{
    category: string;
    label: string;
    count: number;
    items: Array<{ category: string; title: string; body: string }>;
  }>;
  entries?: Array<{ category: string; title: string; body: string }>;
  rewriteBrief?: string;
  findingsCount?: number;
  contentItemId?: string;
  candidateTopics?: string[];
};

export function knowledgeEntryKey(item: { category: string; title: string }) {
  return `${item.category}::${item.title}`;
}

export type ResultPreviewResponse = {
  task: AgentTask;
  status: 'pending' | 'confirmed' | 'rejected' | 'none';
  preview: ResultPreview;
};

export function isResultConfirmPending(task: AgentTask): boolean {
  if (task.output?.confirmedAt || task.output?.rejectedAt) return false;
  return Boolean(task.needsReview && task.reviewCategory === 'result_confirm_required');
}

export function getResultConfirmUiStatus(task: AgentTask): string | null {
  if (task.output?.confirmedAt) return '已入库';
  if (task.output?.rejectedAt || task.reviewCategory === 'result_rejected') return '已忽略';
  if (isResultConfirmPending(task)) return '待确认入库';
  return null;
}

export async function fetchPendingConfirmTasks(brandName: string): Promise<AgentTask[]> {
  const res = await fetch(`/api/agent-tasks?brandName=${encodeURIComponent(brandName)}&limit=50`);
  const data = await res.json();
  return ((data.tasks ?? []) as AgentTask[]).filter(isResultConfirmPending);
}

export async function fetchAgentTaskResultPreview(taskId: string): Promise<ResultPreviewResponse> {
  const res = await fetch(`/api/agent-tasks/${taskId}/result-preview`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '加载预览失败');
  return data;
}

export async function confirmAgentTaskResult(
  taskId: string,
  input?: {
    selectedTerms?: string[];
    groupOverrides?: Record<string, string>;
    selectedEntryKeys?: string[];
  }
) {
  const res = await fetch(`/api/agent-tasks/${taskId}/confirm-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmedBy: 'merchant', ...input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '确认入库失败');
  return data;
}

export async function rejectAgentTaskResult(taskId: string, reason?: string) {
  const res = await fetch(`/api/agent-tasks/${taskId}/reject-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '忽略失败');
  return data;
}

export async function regenerateAgentTaskResult(taskId: string) {
  const res = await fetch(`/api/agent-tasks/${taskId}/regenerate-result`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '重新生成失败');
  return data as { task: AgentTask };
}

export function canRegenerateResultTask(task: AgentTask): boolean {
  return (
    task.type === 'brand_extract' ||
    task.type === 'keyword_mining' ||
    task.type === 'knowledge_extract'
  );
}
