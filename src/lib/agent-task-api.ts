import { appendBrandQuery } from './publisher-context';

/** 任务详情/操作 API：附带 brandName 以匹配 Demo 模式服务端工作区校验 */
export function agentTaskApiPath(taskId: string, brandName?: string | null): string {
  const base = `/api/agent-tasks/${encodeURIComponent(taskId)}`;
  if (!brandName || brandName === '__all__') return base;
  return appendBrandQuery(base, brandName);
}
