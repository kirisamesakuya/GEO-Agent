import { useCallback, useEffect, useState } from 'react';
import type { AgentTask, AgentTaskLog, ViewType } from '../../types';
import { AGENT_TASK_TYPE_LABELS } from '../../types';
import TaskStatusPill from '../common/TaskStatusPill';
import OverlayDrawer from '../common/OverlayDrawer';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import { fetchHermesHealth, type HermesHealth } from '../../lib/hermes-client';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Loader2,
  PanelRight,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Props {
  taskId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

const ACTIVE = new Set(['pending', 'pending_setup', 'waiting_local_device', 'pending_confirm', 'queued', 'running']);

export default function AgentTaskSubmittedView({ taskId, onNavigate }: Props) {
  const [task, setTask] = useState<AgentTask | null>(null);
  const [logs, setLogs] = useState<AgentTaskLog[]>([]);
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, healthRes] = await Promise.all([
        fetch(`/api/agent-tasks/${encodeURIComponent(taskId)}`),
        fetchHermesHealth().catch(() => null),
      ]);
      if (taskRes.ok) {
        const data = await taskRes.json();
        setTask(data.task ?? null);
        setLogs(data.logs ?? []);
      }
      setHealth(healthRes);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (task) setStatusDrawerOpen(true);
  }, [task?.id]);

  useEffect(() => {
    if (!task || !ACTIVE.has(task.status)) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [task?.status, load]);

  if (loading && !task) {
    return (
      <div className="geo-page-content h-full flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
        正在读取后台任务状态...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="geo-page-content h-full flex items-center justify-center">
        <div className="geo-card p-6 max-w-md text-center space-y-3">
          <p className="text-base font-semibold text-[var(--color-title)]">没有找到这个任务</p>
          <p className="text-sm text-[var(--color-text-secondary)]">任务可能已经被清理，或当前品牌无权访问。</p>
          {onNavigate && (
            <button type="button" className="geo-btn-primary text-sm" onClick={() => onNavigate('agent_task_results')}>
              返回结果中心
            </button>
          )}
        </div>
      </div>
    );
  }

  const display = resolveTaskPillDisplay(task);
  const inProgress = ACTIVE.has(task.status);
  const isDone = task.status === 'succeeded' || task.status === 'partial';
  const isFailed = task.status === 'failed' || task.status === 'canceled';
  const capacity = health?.capacity;
  const running = capacity?.occupiedCounts?.total ?? capacity?.runningCounts.total ?? 0;
  const max = capacity?.effectivePolicy.maxTotalRuns ?? capacity?.geoRecommendedMaxRuns ?? 3;
  const recentLogs = logs.slice(0, 4);

  return (
    <div>
      <div className="geo-page-content max-w-4xl space-y-5 pb-8">
        <div className="geo-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg grid place-items-center bg-[var(--color-accent-light)] shrink-0">
                  {inProgress ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-accent)]" />
                  ) : (
                    <Clock className="w-5 h-5 text-[var(--color-accent)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-accent)]">后台任务已提交</p>
                  <h2 className="text-xl font-bold text-[var(--color-title)] mt-1 truncate">{task.title}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {AGENT_TASK_TYPE_LABELS[task.type] ?? task.type}
                    {task.brandName ? ` · ${task.brandName}` : ''}
                  </p>
                </div>
              </div>
              <TaskStatusPill status={display.status} title={display.title} />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[var(--neutral-text-03)] mb-1.5">
                <span>执行进度</span>
                <span>{task.progress ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--neutral-bg-02)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, task.progress ?? 0))}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}>
              <div className="flex gap-3">
                <Bell className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-title)]">
                    {inProgress ? '你可以先去处理其他工作' : isDone ? '任务完成，结果已可查看' : '任务需要人工处理'}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] mt-1">
                    {inProgress
                      ? '本机 Hermes 会在后台继续执行。完成后会通过通知提醒你，并进入统一结果中心等待确认应用或入库。'
                      : isDone
                        ? '结果已经回填到结果中心，请检查内容后再确认应用、入库、发布或忽略。'
                        : task.userErrorMessage ?? 'Hermes 返回了异常状态，可以查看诊断日志后重试。'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="geo-btn-secondary text-sm inline-flex items-center gap-1.5"
                onClick={() => setStatusDrawerOpen(true)}
              >
                <PanelRight className="w-4 h-4" />
                Hermes 状态
              </button>
              <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={() => void load()}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
              {onNavigate && (
                <>
                  <button type="button" className="geo-btn-secondary text-sm" onClick={() => onNavigate('workbench')}>
                    先回工作台
                  </button>
                  <button type="button" className="geo-btn-secondary text-sm" onClick={() => onNavigate('agent_task_results')}>
                    打开结果中心
                  </button>
                  <button type="button" className="geo-btn-secondary text-sm" onClick={() => onNavigate('agent_tasks', task.id)}>
                    查看诊断日志
                  </button>
                  {(isDone || isFailed) && (
                    <button type="button" className="geo-btn-primary text-sm flex items-center gap-1" onClick={() => onNavigate('agent_task_result', task.id)}>
                      查看结果
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
      </div>

      {statusDrawerOpen && (
        <OverlayDrawer
          onClose={() => setStatusDrawerOpen(false)}
          width={360}
          panelClassName="border-l"
          panelStyle={{ background: 'var(--color-bg-card)', borderColor: 'var(--neutral-divider-02)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <h3 className="text-sm font-semibold text-[var(--color-title)]">Hermes 状态</h3>
            <button type="button" onClick={() => setStatusDrawerOpen(false)} className="p-1 rounded hover:bg-[var(--color-bg)]" aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="geo-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-base font-semibold text-[var(--color-title)]">Hermes 额度</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[var(--neutral-text-03)]">后台占用</p>
                  <p className="geo-stat-value">{running}/{max}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--neutral-text-03)]">发布额度</p>
                  <p className="geo-stat-value">{capacity?.effectivePolicy.maxPublishRuns ?? 1}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[var(--neutral-text-03)]">
                {capacity?.userSummary ?? '当前按保守策略执行：总并发 3，发布类任务保持串行，尽量不影响 Hermes 桌面端使用。'}
              </p>
              {onNavigate && (
                <button type="button" className="geo-btn-secondary text-sm w-full" onClick={() => onNavigate('hermes_console')}>
                  调整本机 Hermes
                </button>
              )}
            </div>

            <div className="geo-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-base font-semibold text-[var(--color-title)]">最近事件</h3>
              </div>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">暂无日志，任务正在等待 Hermes 拉取。</p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="text-xs rounded-md p-2 bg-[var(--neutral-bg-02)]">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-[var(--neutral-text-02)]">{log.level}</span>
                        <span className="text-[var(--neutral-text-03)]">{new Date(log.createdAt).toLocaleTimeString('zh-CN')}</span>
                      </div>
                      <p className="text-[var(--neutral-text-03)] mt-1 line-clamp-2">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </OverlayDrawer>
      )}
    </div>
  );
}
