import { useEffect, useState, type ReactNode } from 'react';
import { PanelRight, X } from 'lucide-react';
import OverlayDrawer from './OverlayDrawer';
import TaskStatusPill from './TaskStatusPill';
import type { AgentTaskStatus } from '../../types';

interface ResultWorkspaceProps {
  items: Array<{ id: string | number; title: string; subtitle?: string }>;
  selectedId?: string | number | null;
  onSelect: (id: string | number) => void;
  editor: ReactNode;
  taskStatus?: AgentTaskStatus | null;
  taskProgress?: number;
  actions?: ReactNode;
  emptyMessage?: string;
}

export default function ResultWorkspace({
  items,
  selectedId,
  onSelect,
  editor,
  taskStatus,
  taskProgress,
  actions,
  emptyMessage = '暂无结果，提交任务后将在此显示',
}: ResultWorkspaceProps) {
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);

  useEffect(() => {
    if (taskStatus) setStatusDrawerOpen(true);
  }, [taskStatus]);

  return (
    <>
      <div className="flex flex-1 overflow-hidden border rounded-lg" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <div
          className="shrink-0 overflow-y-auto border-r"
          style={{ width: 220, borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
        >
          {items.length === 0 ? (
            <p className="p-4 text-xs" style={{ color: 'var(--neutral-text-03)' }}>{emptyMessage}</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`w-full text-left px-3 py-2.5 border-b text-xs ${
                  selectedId === item.id ? 'geo-nav-active' : 'geo-nav-item'
                }`}
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                <div className="font-medium truncate" style={{ color: 'var(--neutral-text-01)' }}>{item.title}</div>
                {item.subtitle && (
                  <div className="truncate mt-0.5" style={{ color: 'var(--neutral-text-03)' }}>{item.subtitle}</div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div
            className="shrink-0 flex justify-end px-3 py-2 border-b"
            style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--color-bg-card)' }}
          >
            <button
              type="button"
              className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
              onClick={() => setStatusDrawerOpen(true)}
            >
              <PanelRight className="w-3.5 h-3.5" />
              任务状态
            </button>
          </div>
          {editor}
        </div>
      </div>

      {statusDrawerOpen && (
        <OverlayDrawer
          onClose={() => setStatusDrawerOpen(false)}
          width={320}
          panelClassName="border-l"
          panelStyle={{ background: 'var(--neutral-bg-03)', borderColor: 'var(--neutral-divider-02)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-[var(--color-bg-card)]"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <h4 className="text-sm font-semibold text-[var(--color-title)]">任务状态</h4>
            <button type="button" onClick={() => setStatusDrawerOpen(false)} className="p-1 rounded hover:bg-[var(--color-bg)]" aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {taskStatus ? (
              <>
                <TaskStatusPill status={taskStatus} />
                {taskProgress !== undefined && (
                  <div className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>进度 {taskProgress}%</div>
                )}
              </>
            ) : (
              <span className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>等待提交</span>
            )}
            {actions && (
              <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {actions}
              </div>
            )}
          </div>
        </OverlayDrawer>
      )}
    </>
  );
}
