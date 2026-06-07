import type { AgentTask, AgentTaskStatus, ContentBatch } from '../types';

/** 侧栏/紧凑区展示：降级成功（有产物）不按「部分完成」显示，避免误解为未完成 */
export function resolveTaskPillDisplay(task: Pick<AgentTask, 'status' | 'userErrorMessage' | 'output'>): {
  status: AgentTaskStatus;
  title?: string;
} {
  const degraded =
    task.status === 'partial' && Boolean(task.userErrorMessage?.includes('降级'));

  if (degraded) {
    return { status: 'succeeded', title: task.userErrorMessage };
  }
  return { status: task.status };
}

/** 内容库批次：降级生成且已有文章时，不按「部分完成」展示 */
export function resolveBatchPillDisplay(batch: Pick<ContentBatch, 'status' | 'articleCount'>): {
  status: AgentTaskStatus;
  title?: string;
} {
  if (batch.status === 'partial' && batch.articleCount > 0) {
    return { status: 'succeeded', title: '模型降级生成，内容已入库' };
  }
  const map: Record<ContentBatch['status'], AgentTaskStatus> = {
    generating: 'running',
    ready: 'succeeded',
    partial: 'partial',
    failed: 'failed',
  };
  return { status: map[batch.status] };
}
