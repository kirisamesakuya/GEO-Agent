import type { AgentTaskStatus } from '../../types';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';

const STATUS_LABELS: Record<AgentTaskStatus, string> = {
  pending: '待处理',
  pending_confirm: '待确认',
  queued: '已入队',
  running: '执行中',
  succeeded: '已完成',
  partial: '部分完成',
  failed: '失败',
  canceled: '已取消',
};

interface TaskStatusPillProps {
  status: AgentTaskStatus | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
  title?: string;
  userErrorMessage?: string;
  output?: Record<string, unknown>;
}

export default function TaskStatusPill({
  status,
  size = 'md',
  showDot = true,
  className = '',
  title,
  userErrorMessage,
  output,
}: TaskStatusPillProps) {
  const display = resolveTaskPillDisplay({
    status: status as AgentTaskStatus,
    userErrorMessage,
    output,
  });
  const key = display.status in STATUS_LABELS ? display.status : 'pending';
  const label = STATUS_LABELS[key as AgentTaskStatus] ?? '待处理';
  const tip =
    title ??
    (display.status === 'failed' && userErrorMessage ? userErrorMessage : undefined) ??
    display.title;

  return (
    <span
      title={tip}
      className={`geo-status-pill geo-status-pill--${key} geo-status-pill--${size} ${className}`}
    >
      {showDot && (
        <span
          className={`geo-status-pill-dot ${display.status === 'running' ? 'geo-status-pill-dot--pulse' : ''}`}
        />
      )}
      {label}
    </span>
  );
}
