import { useState } from 'react';
import type { AgentTaskStatus, ViewType } from '../../types';
import { useAgentTaskPolling } from '../../hooks/useAgentTaskPolling';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import type { AgentTask } from '../../types';
import { Bot, Bell, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { navigateToAgentTasks, isAgentTaskInProgress } from './AgentTaskProgressLink';
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
  onNavigate?: (view: ViewType, hint?: string) => void;
  onComplete?: (task: AgentTask) => void;
  showWhyQueued?: boolean;
}

function statusHeadline(status: AgentTaskStatus | null | undefined, queueHint?: TaskQueueHint | null) {
  if (status === 'succeeded' || status === 'partial') {
    return '任务已完成';
  }
  if (status === 'failed') {
    return '任务执行失败';
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
  onNavigate,
  onComplete,
  showWhyQueued = true,
}: Props) {
  const [status, setStatus] = useState<AgentTaskStatus | null>(initialStatus ?? null);
  const [progress, setProgress] = useState(0);

  const handleUpdate = (task: AgentTask) => {
    const display = resolveTaskPillDisplay(task);
    setStatus(display.status);
    setProgress(task.progress ?? 0);
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
  const headline = statusHeadline(status, queueHint);
  const detailMessage =
    queueHint?.userMessage ??
    (status === 'running'
      ? '你可以先去处理其他工作，完成后会通过通知提醒你。'
      : '任务已提交，本机 Hermes 会在后台处理。你可以先去做其他事，完成后我们会通过通知提醒你。');

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
              排队中，前面还有 {queueHint!.aheadCount} 个任务
            </p>
          )}
          <p className="text-xs mt-1.5 leading-relaxed text-[var(--neutral-text-03)]">{detailMessage}</p>
        </div>
      </div>

      {showWhyQueued && inProgress && (queueHint?.isQueued || queueHint?.aheadCount) && (
        <div
          className="text-[11px] rounded-lg px-3 py-2 leading-relaxed"
          style={{ background: 'var(--neutral-bg-02)', color: 'var(--neutral-text-03)' }}
        >
          <p className="font-medium text-[var(--neutral-text-02)] mb-0.5">为什么排队？</p>
          当前为保守模式：分析任务最多同时 2 个，发布任务一次只执行 1 个。这样可以避免影响你在 Hermes 桌面端的正常使用。
        </div>
      )}

      {onNavigate && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
            onClick={() => navigateToAgentTasks(onNavigate, taskId)}
          >
            查看后台进度
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('workbench')}
          >
            返回工作台
          </button>
          {(status === 'succeeded' || status === 'partial') && (
            <button
              type="button"
              className="geo-btn-primary geo-btn-xs"
              onClick={() => navigateToAgentTaskResult(onNavigate, taskId)}
            >
              查看结果
            </button>
          )}
        </div>
      )}
    </div>
  );
}
