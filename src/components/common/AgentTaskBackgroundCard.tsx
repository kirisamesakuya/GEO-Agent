import { useState } from 'react';
import type { AgentTaskStatus, ViewType } from '../../types';
import { useAgentTaskPolling } from '../../hooks/useAgentTaskPolling';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import type { AgentTask } from '../../types';
import { Bot, Bell, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { navigateToAgentTasks, isAgentTaskInProgress, isAgentTaskBlocking } from './AgentTaskProgressLink';

export { isAgentTaskBlocking };
import { navigateToAgentTaskResult } from '../../lib/agent-task-result-nav';

export type TaskQueueHint = {
  isQueued?: boolean;
  queuePosition?: number;
  aheadCount?: number;
  userMessage?: string;
};

interface Props {
  taskId: string | null;
  taskTitle?: string;
  initialStatus?: AgentTaskStatus | null;
  queueHint?: TaskQueueHint | null;
  hermesSetupRequired?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onComplete?: (task: AgentTask) => void;
  onStatusChange?: (status: AgentTaskStatus) => void;
}

function resolveDetailMessage(
  status: AgentTaskStatus | null | undefined,
  inProgress: boolean,
  queueHint?: TaskQueueHint | null,
  hermesSetupRequired?: boolean
): string {
  if (
    hermesSetupRequired &&
    (status === 'pending_setup' ||
      status === 'waiting_local_device' ||
      status === 'pending' ||
      !status)
  ) {
    return '任务已创建，但本机 Hermes 尚未绑定。请先完成安装与绑定，绑定后任务将自动继续执行。';
  }
  if (status === 'succeeded' || status === 'partial') {
    return '任务已完成，请前往结果中心确认并应用结果。';
  }
  if (status === 'failed') {
    return '任务执行失败，可在结果中心查看详情后重试。';
  }
  if (inProgress) {
    const ahead = queueHint?.aheadCount ?? 0;
    if (ahead > 0) {
      return `任务已提交并排队中（前面还有 ${ahead} 个）。完成前暂无法提交新任务，可前往结果中心查看进度。`;
    }
    return '任务处理中，完成前暂无法提交新任务。可前往结果中心查看进度，完成后我们会通知你。';
  }
  return '任务已提交，可前往结果中心查看进度。';
}

function statusHeadline(
  status: AgentTaskStatus | null | undefined,
  queueHint?: TaskQueueHint | null,
  hermesSetupRequired?: boolean
) {
  if (status === 'succeeded' || status === 'partial') {
    return '任务已完成';
  }
  if (status === 'failed') {
    return '任务执行失败';
  }
  if (
    hermesSetupRequired &&
    (status === 'pending_setup' ||
      status === 'waiting_local_device' ||
      status === 'pending' ||
      !status)
  ) {
    return '等待本机 Hermes 绑定';
  }
  if (status === 'running') {
    return 'Hermes 正在执行';
  }
  if (queueHint?.isQueued || status === 'queued' || status === 'waiting_local_device') {
    return 'Hermes 正在后台处理';
  }
  return 'Hermes 正在后台处理';
}

export default function AgentTaskBackgroundCard({
  taskId,
  taskTitle,
  initialStatus,
  queueHint,
  hermesSetupRequired,
  onNavigate,
  onComplete,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState<AgentTaskStatus | null>(initialStatus ?? null);
  const [progress, setProgress] = useState(0);

  const handleUpdate = (task: AgentTask) => {
    const display = resolveTaskPillDisplay(task);
    setStatus(display.status);
    setProgress(task.progress ?? 0);
    onStatusChange?.(display.status);
  };

  const handleComplete = (task: AgentTask) => {
    handleUpdate(task);
    onComplete?.(task);
  };

  useAgentTaskPolling({
    taskId,
    onUpdate: handleUpdate,
    onComplete: handleComplete,
  });

  if (!taskId) return null;

  const inProgress = isAgentTaskInProgress(status);
  const isDone = status === 'succeeded' || status === 'partial';
  const isFailed = status === 'failed' || status === 'canceled';
  const headline = statusHeadline(status, queueHint, hermesSetupRequired);
  const detailMessage = resolveDetailMessage(status, inProgress, queueHint, hermesSetupRequired);

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-light)' }}
        >
          {inProgress ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
          ) : status === 'succeeded' || status === 'partial' ? (
            <Bell className="w-4 h-4 text-[var(--color-accent)]" />
          ) : (
            <Bot className="w-4 h-4 text-[var(--color-accent)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-title)]">{headline}</p>
          {taskTitle && (
            <p className="text-xs mt-0.5 text-[var(--neutral-text-02)] truncate">已创建任务：{taskTitle}</p>
          )}
          {status === 'running' && progress > 0 && (
            <p className="text-xs mt-1 text-[var(--neutral-text-03)]">进度 {progress}%</p>
          )}
          {(queueHint?.aheadCount ?? 0) > 0 && inProgress && (
            <p className="text-xs mt-1 flex items-center gap-1 text-amber-800">
              <Clock className="w-3 h-3 shrink-0" />
              排队中
            </p>
          )}
          <p className="text-xs mt-1.5 leading-relaxed text-[var(--neutral-text-03)]">{detailMessage}</p>
        </div>
      </div>

      {onNavigate && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isDone ? (
            <>
              <button
                type="button"
                className="geo-btn-primary geo-btn-xs inline-flex items-center gap-1"
                onClick={() => navigateToAgentTaskResult(onNavigate, taskId)}
              >
                查看结果
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
                onClick={() => onNavigate('agent_task_results')}
              >
                结果中心
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="geo-btn-primary geo-btn-xs inline-flex items-center gap-1"
                onClick={() => navigateToAgentTasks(onNavigate, taskId)}
              >
                查看本任务进度
                <ChevronRight className="w-3 h-3" />
              </button>
              {!isFailed && (
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs"
                  onClick={() => onNavigate('agent_task_results')}
                >
                  全部任务
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('workbench')}
          >
            返回工作台
          </button>
        </div>
      )}
    </div>
  );
}
