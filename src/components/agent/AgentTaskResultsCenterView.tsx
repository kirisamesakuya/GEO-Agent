import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentTask, AgentTaskType, ViewType } from '../../types';
import { AGENT_TASK_TYPE_LABELS } from '../../types';
import PageHeaderWithBrand from '../common/PageHeaderWithBrand';
import TaskStatusPill from '../common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import { getResultConfirmUiStatus, isResultConfirmPending } from '../../lib/agent-result-confirmation';
import AgentTaskResultView from './AgentTaskResultView';
import { navigateToAgentTasks } from '../common/AgentTaskProgressLink';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
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
  onGoBack?: () => void;
  selectedTaskId?: string;
}

type Filter = 'all' | 'pending' | 'running' | 'done' | 'failed';

const RUNNING = new Set(['pending', 'pending_setup', 'waiting_local_device', 'pending_confirm', 'queued', 'running']);

const FILTER_TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待确认' },
  { id: 'running', label: '执行中' },
  { id: 'done', label: '已完成' },
  { id: 'failed', label: '异常' },
];

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
  onGoBack,
  selectedTaskId,
}: Props) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | AgentTaskType>('all');
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

  const typeOptions = useMemo(() => {
    const types = new Set<AgentTaskType>();
    for (const task of tasks) types.add(task.type);
    return Array.from(types).sort((a, b) =>
      (AGENT_TASK_TYPE_LABELS[a] ?? a).localeCompare(AGENT_TASK_TYPE_LABELS[b] ?? b, 'zh-CN')
    );
  }, [tasks]);

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
      .filter((task) => typeFilter === 'all' || task.type === typeFilter)
      .filter((task) => {
        if (!keyword) return true;
        return [task.title, task.brandName, AGENT_TASK_TYPE_LABELS[task.type], task.id]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(keyword));
      });
  }, [filter, query, tasks, typeFilter]);

  const openTaskResult = (task: AgentTask) => {
    if (task.brandName && task.brandName !== brandName) {
      onBrandChange(task.brandName);
    }
    onNavigate?.('agent_task_result', task.id);
  };

  if (selectedTaskId) {
    return (
      <AgentTaskResultView
        taskId={selectedTaskId}
        brandName={brandName}
        onNavigate={onNavigate}
        onBack={onGoBack ?? (() => onNavigate?.('agent_task_results'))}
      />
    );
  }

  return (
    <div className="geo-page-content max-w-7xl space-y-5 pb-8">
        <PageHeaderWithBrand
          title="任务结果中心"
          titleClassName="text-xl font-bold text-[var(--color-title)]"
          brandName={brandName}
          onBrandChange={onBrandChange}
          actions={
            <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={() => void load()}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
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
                  className={`w-4 h-4 ${id === 'running' && value > 0 ? 'animate-spin' : ''} text-[var(--color-accent)]`}
                />
              </div>
              <p className="geo-stat-value">{value}</p>
            </button>
          ))}
        </div>

        <div className="geo-list-table-panel geo-card overflow-hidden">
          <div
            className="p-4 border-b space-y-3"
            style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-text-03)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索任务名称、品牌或类型"
                  className="geo-input w-full geo-input-with-icon"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--neutral-text-03)] shrink-0">
                任务类型
                <select
                  className="geo-input geo-input-sm min-w-[8rem]"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | AgentTaskType)}
                >
                  <option value="all">全部类型</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {AGENT_TASK_TYPE_LABELS[type] ?? type}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs text-[var(--neutral-text-03)] shrink-0">
                共 {list.length} 条
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--neutral-text-03)] shrink-0">状态</span>
              {FILTER_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    filter === id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)] font-medium'
                      : 'border-[var(--color-border)] text-[var(--neutral-text-03)] hover:border-[var(--color-accent)]'
                  }`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                  <span className="ml-1 opacity-70">({counts[id]})</span>
                </button>
              ))}
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
              <p className="text-sm text-[var(--color-text-secondary)]">调整筛选条件，或发起 Hermes 后台任务后在此查看结果。</p>
            </div>
          ) : (
            <div className="geo-table-wrap border-0 rounded-none">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>任务名称</th>
                    <th>任务类型</th>
                    <th>结果状态</th>
                    <th>执行状态</th>
                    <th>进度</th>
                    <th>更新时间</th>
                    <th className="geo-table__actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((task) => {
                    const display = resolveTaskPillDisplay(task);
                    const confirmStatus = getResultConfirmUiStatus(task);
                    const inProgress = RUNNING.has(task.status);
                    return (
                      <tr
                        key={task.id}
                        className="cursor-pointer"
                        onClick={() => openTaskResult(task)}
                      >
                        <td>
                          <p className="font-medium text-[var(--color-title)] truncate max-w-[16rem]">{task.title}</p>
                          {task.brandName && (
                            <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5 truncate">{task.brandName}</p>
                          )}
                        </td>
                        <td className="text-[var(--neutral-text-02)]">
                          {AGENT_TASK_TYPE_LABELS[task.type] ?? task.type}
                        </td>
                        <td>
                          <span className="text-xs text-[var(--neutral-text-02)]">{resultTone(task)}</span>
                          {confirmStatus && (
                            <span className="block text-[10px] mt-0.5 text-amber-800 font-medium">{confirmStatus}</span>
                          )}
                        </td>
                        <td>
                          <TaskStatusPill status={display.status} title={display.title} size="sm" />
                        </td>
                        <td className="text-[var(--color-title)] font-medium tabular-nums">
                          {inProgress ? `${task.progress ?? 0}%` : '—'}
                        </td>
                        <td className="text-[var(--color-text-secondary)] whitespace-nowrap">
                          {new Date(task.updatedAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="geo-table__actions">
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              className="inline-flex items-center gap-0.5 text-xs text-[var(--color-accent)] font-medium hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskResult(task);
                              }}
                            >
                              查看结果
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            {inProgress && onNavigate && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-0.5 text-xs text-[var(--neutral-text-03)] hover:text-[var(--color-accent)]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToAgentTasks(onNavigate, task.id);
                                }}
                              >
                                执行进度
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
