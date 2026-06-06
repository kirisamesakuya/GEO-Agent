import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentTask, ViewType } from '../types';
import { AGENT_TASK_TYPE_LABELS } from '../types';
import TaskStatusPill from './common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../lib/agent-task-display';
import AgentTaskDetailView from './AgentTaskDetailView';
import { RefreshCw, ChevronRight, Activity } from 'lucide-react';
import BrandScopeBar from './common/BrandScopeBar';

function readTaskIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('taskId');
}

function syncTaskIdInUrl(taskId: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'agent_tasks');
  if (taskId) url.searchParams.set('taskId', taskId);
  else url.searchParams.delete('taskId');
  window.history.pushState({}, '', url);
}

interface AgentTasksViewProps {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  /** 从 GEO 分析等页跳转时打开任务详情 */
  initialSelectedTaskId?: string;
}

export default function AgentTasksView({
  brandName,
  onBrandChange,
  onNavigate,
  initialSelectedTaskId,
}: AgentTasksViewProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [detailTaskId, setDetailTaskId] = useState<string | null>(
    () => initialSelectedTaskId ?? readTaskIdFromUrl()
  );
  const [hermesHealth, setHermesHealth] = useState<{ ok: boolean; url: string; executor?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(1);

  const openDetail = useCallback((id: string) => {
    setDetailTaskId(id);
    syncTaskIdInUrl(id);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTaskId(null);
    syncTaskIdInUrl(null);
  }, []);

  const loadTasks = async (nextPage = 1, append = false) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(nextPage), pageSize: '20' });
      if (brandName && brandName !== '__all__') q.set('brandName', brandName);
      const [tasksRes, statsRes, healthRes] = await Promise.all([
        fetch(`/api/agent-tasks?${q}`),
        fetch('/api/agent-tasks/stats'),
        fetch('/api/hermes/health'),
      ]);
      const tasksData = await tasksRes.json();
      const statsData = await statsRes.json();
      const healthData = await healthRes.json();
      const list = tasksData.tasks ?? [];
      setTasks(append ? (prev) => [...prev, ...list] : list);
      setHasMore(Boolean(tasksData.hasMore));
      setTotal(tasksData.total ?? list.length);
      setPage(nextPage);
      pageRef.current = nextPage;
      setStats(statsData);
      setHermesHealth(healthData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pageRef.current = 1;
    void loadTasks(1, false);
    const timer = setInterval(() => {
      if (detailTaskId) return;
      const p = pageRef.current;
      void loadTasks(p, p > 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [brandName, detailTaskId]);

  useEffect(() => {
    if (initialSelectedTaskId) openDetail(initialSelectedTaskId);
  }, [initialSelectedTaskId, openDetail]);

  if (detailTaskId) {
    return (
      <AgentTaskDetailView taskId={detailTaskId} onBack={closeDetail} onNavigate={onNavigate} />
    );
  }

  return (
    <div className="flex h-full overflow-hidden geo-page-content gap-4 flex-col">
      <BrandScopeBar
        label="查看哪个品牌的任务"
        brandName={brandName}
        onBrandChange={onBrandChange}
        allowAll
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-title)]">运行日志</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {brandName === '__all__'
              ? '全部品牌的本机 Hermes / Agent 任务执行记录'
              : `查看 ${brandName} 的任务是否真实由本机 Hermes 执行、产物与错误信息`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTasks()}
          className="geo-btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部', value: stats.total ?? 0, tone: '' },
          { label: '执行中', value: stats.running ?? 0, tone: 'geo-stat-value--accent' },
          { label: '已完成', value: stats.succeeded ?? 0, tone: 'geo-stat-value--success' },
          { label: '失败', value: stats.failed ?? 0, tone: 'geo-stat-value--danger' },
        ].map((item) => (
          <div key={item.label} className="geo-card p-4">
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
              {item.label}
            </p>
            <p className={`geo-stat-value ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {hermesHealth && (
        <div className={hermesHealth.ok ? 'geo-callout-success' : 'geo-callout-warning'}>
          <Activity className="w-5 h-5 shrink-0" />
          <div className="flex-1 text-sm min-w-0">
            <span className="font-medium">Hermes API：</span>
            <span>{hermesHealth.ok ? '已连接' : '未连接'}</span>
            <span className="ml-2 opacity-80">{hermesHealth.url}</span>
            {hermesHealth.executor && (
              <span className="text-[var(--color-text-secondary)] ml-2">· 执行器：{hermesHealth.executor}</span>
            )}
          </div>
        </div>
      )}

      <div className="geo-card overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm geo-table">
            <thead>
              <tr>
                <th>任务</th>
                <th>类型</th>
                <th>品牌</th>
                <th>状态</th>
                <th>进度</th>
                <th>创建时间</th>
                <th style={{ textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="geo-table-empty">
                    暂无运行记录。在「生成文章」或「GEO 分析」等页提交任务后将在此显示。
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(task.id)}
                  >
                    <td className="font-medium text-[var(--color-title)]">{task.title}</td>
                    <td>{AGENT_TASK_TYPE_LABELS[task.type] ?? task.type}</td>
                    <td>{task.brandName ?? '—'}</td>
                    <td>
                      <TaskStatusPill
                        status={resolveTaskPillDisplay(task).status}
                        size="sm"
                        title={resolveTaskPillDisplay(task).title}
                      />
                    </td>
                    <td>{task.progress}%</td>
                    <td className="text-[var(--color-text-secondary)]">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-xs text-[var(--color-accent)] font-medium hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(task.id);
                        }}
                      >
                        查看
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div
          className="px-4 py-3 border-t flex justify-between items-center text-xs"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>共 {total} 条</span>
          {hasMore && (
            <button
              type="button"
              className="geo-btn-secondary text-xs"
              disabled={loading}
              onClick={() => void loadTasks(page + 1, true)}
            >
              加载更多
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
