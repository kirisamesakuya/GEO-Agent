import type { ViewType } from '../types';

export function navigateToAgentTaskResult(
  onNavigate: ((view: ViewType, hint?: string) => void) | undefined,
  taskId: string
) {
  onNavigate?.('agent_task_result', taskId);
}

export function readAgentTaskResultIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('hint') ?? params.get('taskId');
}

export function syncAgentTaskResultInUrl(taskId: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'agent_task_result');
  if (taskId) url.searchParams.set('hint', taskId);
  else url.searchParams.delete('hint');
  url.searchParams.delete('taskId');
  window.history.pushState({}, '', url);
}
