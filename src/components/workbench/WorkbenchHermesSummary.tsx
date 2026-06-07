import { useCallback, useEffect, useState } from 'react';
import { Cpu, Inbox, RefreshCw } from 'lucide-react';
import type { ViewType } from '../../types';
import { fetchHermesHealth, type HermesHealth } from '../../lib/hermes-client';
import { HERMES_MODE_LABELS, hermesReady } from '../../lib/hermes-status-utils';
import { fetchPendingConfirmTasks } from '../../lib/agent-result-confirmation';
import { navigateToAgentTaskResult } from '../../lib/agent-task-result-nav';

interface Props {
  brandName: string;
  onNavigate: (view: ViewType, hint?: string) => void;
}

export default function WorkbenchHermesSummary({ brandName, onNavigate }: Props) {
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [taskStats, setTaskStats] = useState<{ queued?: number; running?: number; succeeded?: number }>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!brandName || brandName === '__all__') return;
    setLoading(true);
    try {
      const [h, pending, statsRes] = await Promise.all([
        fetchHermesHealth(),
        fetchPendingConfirmTasks(brandName),
        fetch('/api/agent-tasks/stats').then((r) => r.json()),
      ]);
      setHealth(h);
      setPendingCount(pending.length);
      setTaskStats(statsRes);
    } finally {
      setLoading(false);
    }
  }, [brandName]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 12000);
    return () => clearInterval(t);
  }, [refresh]);

  if (!brandName || brandName === '__all__') return null;

  const capacity = health?.capacity;
  const policy = capacity?.effectivePolicy;
  const ready = hermesReady(health);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="geo-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-title)] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--color-accent)]" />
            本机 Hermes
          </h3>
          <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            检测
          </button>
        </div>
        <p className="text-xs text-[var(--neutral-text-02)]">
          {ready ? '● 已连接' : '○ 未就绪'}
          {policy ? ` · ${HERMES_MODE_LABELS[policy.mode]}模式 · 分析 ${policy.maxAnalysisRuns} / 发布 ${policy.maxPublishRuns}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('hermes_console')}>
            管理本机 Hermes
          </button>
          <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('agent_tasks')}>
            查看运行日志
          </button>
        </div>
      </div>

      <div className="geo-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-title)] flex items-center gap-2">
          <Inbox className="w-4 h-4 text-[var(--color-accent)]" />
          待处理结果
        </h3>
        <p className="text-xs text-[var(--neutral-text-02)]">
          {pendingCount > 0
            ? `${pendingCount} 条待确认应用`
            : '暂无待确认结果'}
        </p>
        <p className="text-[11px] text-[var(--neutral-text-03)]">
          今日后台任务：排队 {taskStats.queued ?? 0} · 执行中 {taskStats.running ?? 0} · 已完成{' '}
          {taskStats.succeeded ?? 0}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="geo-btn-primary geo-btn-xs"
            onClick={() => onNavigate('notifications')}
          >
            查看结果收件箱
          </button>
          {pendingCount > 0 && (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-xs"
              onClick={async () => {
                const pending = await fetchPendingConfirmTasks(brandName);
                const first = pending[0];
                if (first) navigateToAgentTaskResult(onNavigate, first.id);
              }}
            >
              处理第一条
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
