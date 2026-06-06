import { Bot, ChevronRight } from 'lucide-react';
import type { AgentTaskStatus, ViewType } from '../../types';

const IN_PROGRESS_STATUSES: AgentTaskStatus[] = [
  'pending',
  'pending_confirm',
  'queued',
  'running',
];

export function isAgentTaskInProgress(
  status: AgentTaskStatus | string | null | undefined
): boolean {
  return status != null && IN_PROGRESS_STATUSES.includes(status as AgentTaskStatus);
}

export function navigateToAgentTasks(
  onNavigate: ((view: ViewType, hint?: string) => void) | undefined,
  taskId?: string | null
) {
  onNavigate?.('agent_tasks', taskId ?? undefined);
}

interface AgentTaskProgressHintProps {
  onNavigate?: (view: ViewType, hint?: string) => void;
  taskId?: string | null;
}

/** 执行中状态旁：提示前往任务详情查看进度 */
export function AgentTaskProgressHint({ onNavigate, taskId }: AgentTaskProgressHintProps) {
  if (!onNavigate) return null;
  return (
    <p className="text-xs leading-relaxed" style={{ color: 'var(--neutral-text-03)' }}>
      任务在后台执行，可前往{' '}
      <button
        type="button"
        className="geo-link font-medium inline-flex items-center gap-0.5"
        onClick={() => navigateToAgentTasks(onNavigate, taskId)}
      >
        任务详情
        <ChevronRight className="w-3 h-3" />
      </button>
      查看进度
    </p>
  );
}

interface AgentTaskPanelEntryProps {
  onNavigate?: (view: ViewType, hint?: string) => void;
  taskId?: string | null;
}

/** 右侧面板底部：单一 Agent 任务入口 */
export function AgentTaskPanelEntry({ onNavigate, taskId }: AgentTaskPanelEntryProps) {
  if (!onNavigate) return null;
  return (
    <button
      type="button"
      className="geo-btn-secondary w-full text-sm flex items-center justify-center gap-2"
      onClick={() => navigateToAgentTasks(onNavigate, taskId)}
    >
      <Bot className="w-4 h-4" />
      查看任务详情
      <ChevronRight className="w-4 h-4 opacity-60" />
    </button>
  );
}
