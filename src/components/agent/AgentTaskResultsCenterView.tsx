import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentTask, ViewType } from '../../types';
import { AGENT_TASK_TYPE_LABELS } from '../../types';
import PageHeaderWithBrand from '../common/PageHeaderWithBrand';
import TaskStatusPill from '../common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import { getResultConfirmUiStatus, isResultConfirmPending } from '../../lib/agent-result-confirmation';
import AgentTaskResultView from './AgentTaskResultView';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileCheck2,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  selectedTaskId?: string;
}

type Filter = 'all' | 'pending' | 'running' | 'done' | 'failed';

const RUNNING = new Set(['pending', 'pending_setup', 'waiting_local_device', 'pending_confirm', 'queued', 'running']);

function filterTask(task: AgentTask, filter: Filter) {
  if (filter === 'pending') return isResultConfirmPending(task);
  if (filter === 'running') return RUNNING.has(task.status);
  if (filter === 'done') return task.status === 'succeeded' || task.status === 'partial';
  if (filter === 'failed') return task.status === 'failed' || task.status === 'canceled';
  return true;
}

function resultTone(task: AgentTask) {
  if (isResultConfirmPending(task)) return '待确认';
  if (task.output?.confirmedAt) return '已应用';
  if (task.output?.rejectedAt) return '已忽略';
  if (RUNNING.has(task.status)) return '执行中';
  if (task.status === 'failed' || task.status === 'canceled') return '异常';
  return '可查看';
}

export default function AgentTaskResultsCenterView({
  brandName,
  onBrandChange,
  onNavigate,
  selectedTaskId,
}: Props) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!brandName || brandName === '__all__') {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ brandName, limit: '80' });
      const res = await fetch(`/api/agent-tasks?${q}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [brandName]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => isResultConfirmPending(t)).length,
      running: tasks.filter((t) => RUNNING.has(t.status)).length,
      done: tasks.filter((t) => t.status === 'succeeded' || t.status === 'partial').length,
      failed: tasks.filter((t) => t.status === 'failed' || t.status === 'canceled').length,
    };
  }, [tasks]);

  const list = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tasks
      .filter((task) => filterTask(task, filter))
      .filter((task) => {
        if (!keyword) return true;
        return [task.title, task.brandName, AGENT_TASK_TYPE_LABELS[task.type], task.id]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(keyword));
      });
  }, [filter, query, tasks]);

  if (selectedTaskId) {
    return (
      <AgentTaskResultView
        taskId={selectedTaskId}
        onNavigate={onNavigate}
        onBack={() => onNavigate?.('agent_task_results')}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="geo-page-content max-w-7xl space-y-5 pb-8">
        <PageHeaderWithBrand
          title="任务结果中心"
          titleClassName="text-xl font-bold text-[var(--color-title)]"
          brandName={brandName}
          onBrandChange={onBrandChange}
          actions={
            <>
              <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={() => void load()}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
              {onNavigate && (
                <button type="button" className="geo-btn-secondary text-sm" onClick={() => onNavigate('hermes_console')}>
                  本机 Hermes
                </button>
              )}
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: 'all' as const, label: '全部', value: counts.all, icon: Inbox },
            { id: 'pending' as const, label: '待确认', value: counts.pending, icon: Database },
            { id: 'running' as const, label: '执行中', value: counts.running, icon: Loader2 },
            { id: 'done' as const, label: '已完成', value: counts.done, icon: CheckCircle2 },
            { id: 'failed' as const, label: '异常', value: counts.failed, icon: AlertCircle },
          ].map(({ id, label, value, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`geo-card p-4 text-left transition ${filter === id ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--neutral-text-03)]">{label}</span>
                <Icon
                  className={`w-4 h-4 ${
                    id === 'running' && value > 0 ? 'animate-spin' : ''
                  } text-[var(--color-accent)]`}
                />
              </div>
              <p className="geo-stat-value">{value}</p>
            </button>
          ))}
        </div>

        <div className="geo-card overflow-hidden">
          <div className="p-4 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-text-03)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索任务、品牌或结果类型"
                className="geo-input w-full geo-input-with-icon"
              />
            </div>
          </div>

          {brandName === '__all__' ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
              请选择一个具体品牌查看结果中心。
            </div>
          ) : loading && list.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
              正在加载结果...
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FileCheck2 className="w-8 h-8 mx-auto text-[var(--neutral-text-03)]" />
              <p className="text-sm font-semibold text-[var(--color-title)]">暂无匹配结果</p>
              <p className="text-sm text-[var(--color-text-secondary)]">发起 Hermes 后台任务后，完成结果会出现在这里。</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {list.map((task) => {
                const display = resolveTaskPillDisplay(task);
                const confirmStatus = getResultConfirmUiStatus(task);
                return (
                  <button
                    key={task.id}
                    type="button"
                    className="w-full text-left p-4 hover:bg-[var(--neutral-bg-03)] transition"
                    onClick={() => onNavigate?.('agent_task_result', task.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg grid place-items-center bg-[var(--color-accent-light)] shrink-0">
                        {RUNNING.has(task.status) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
                        ) : (
                          <FileCheck2 className="w-4 h-4 text-[var(--color-accent)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[var(--color-title)] truncate">{task.title}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--neutral-bg-02)] text-[var(--neutral-text-03)]">
                            {resultTone(task)}
                          </span>
                          {confirmStatus && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
                              {confirmStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          {AGENT_TASK_TYPE_LABELS[task.type] ?? task.type}
                          {task.brandName ? ` · ${task.brandName}` : ''}
                          {' · '}
                          {new Date(task.updatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden md:block text-right">
                          <p className="text-xs text-[var(--neutral-text-03)]">进度</p>
                          <p className="text-sm font-semibold text-[var(--color-title)]">{task.progress ?? 0}%</p>
                        </div>
                        <TaskStatusPill status={display.status} title={display.title} size="sm" />
                        <ChevronRight className="w-4 h-4 text-[var(--neutral-text-03)]" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
