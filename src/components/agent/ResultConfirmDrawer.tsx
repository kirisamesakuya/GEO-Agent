import { X } from 'lucide-react';
import type { AgentTask, ViewType } from '../../types';
import AgentTaskResultConfirmPanel from './AgentTaskResultConfirmPanel';
import { navigateToAgentTaskResult } from '../../lib/agent-task-result-nav';

interface Props {
  task: AgentTask;
  title: string;
  onClose: () => void;
  onUpdated: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function ResultConfirmDrawer({
  task,
  title,
  onClose,
  onUpdated,
  onNavigate,
}: Props) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20"
        aria-label="关闭预览"
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg shadow-xl border-l flex flex-col"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--neutral-divider-02)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-bold truncate">{title}</h3>
            <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">待确认入库 · 预览与操作</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <AgentTaskResultConfirmPanel
            task={task}
            compact
            onUpdated={onUpdated}
            onNavigate={(view, hint) => {
              onClose();
              onNavigate?.(view, hint);
            }}
            onRegenerated={(newTaskId) => {
              onClose();
              navigateToAgentTaskResult(onNavigate, newTaskId);
            }}
          />
        </div>

        {onNavigate && (
          <div
            className="shrink-0 px-4 py-3 border-t flex gap-2"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm flex-1"
              onClick={() => {
                onClose();
                onNavigate('agent_tasks', task.id);
              }}
            >
              进入任务详情
            </button>
          </div>
        )}
      </div>
    </>
  );
}
