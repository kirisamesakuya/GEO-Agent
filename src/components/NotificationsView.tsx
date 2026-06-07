import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentTask, ViewType } from '../types';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import { navigateToAgentTaskResult } from '../lib/agent-task-result-nav';
import {
  fetchPublisherNotifications,
  markAllPublisherNotificationsRead,
  markPublisherNotificationRead,
  PUBLISHER_NOTIFICATION_TYPE_LABELS,
  resolveNotificationNavigation,
  type PublisherNotificationItem,
} from '../lib/publisher-notifications';
import { getResultConfirmUiStatus, isResultConfirmPending, fetchPendingConfirmTasks } from '../lib/agent-result-confirmation';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

function isAgentTaskNotification(item: PublisherNotificationItem) {
  return item.type === 'agent_task' && Boolean(item.refId);
}

export default function NotificationsView({ brandName, onBrandChange, onNavigate }: Props) {
  const [items, setItems] = useState<PublisherNotificationItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<AgentTask[]>([]);
  const [failedTasks, setFailedTasks] = useState<AgentTask[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending_confirm' | 'failed'>('all');

  const pendingTaskIds = useMemo(
    () => new Set(pendingTasks.filter((t) => isResultConfirmPending(t)).map((t) => t.id)),
    [pendingTasks]
  );

  const failedTaskIds = useMemo(
    () => new Set(failedTasks.map((t) => t.id)),
    [failedTasks]
  );

  const load = useCallback(async () => {
    if (!brandName || brandName === '__all__') {
      setItems([]);
      setPendingTasks([]);
      setFailedTasks([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [data, pending, failedRes] = await Promise.all([
        fetchPublisherNotifications(brandName, filter === 'unread'),
        fetchPendingConfirmTasks(brandName),
        fetch(`/api/agent-tasks?brandName=${encodeURIComponent(brandName)}&status=failed&limit=30`).then((r) =>
          r.ok ? r.json() : { tasks: [] }
        ),
      ]);
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
      setPendingTasks(pending);
      setFailedTasks(failedRes.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [brandName, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayedItems = useMemo(() => {
    if (filter === 'pending_confirm') {
      return items.filter((item) => item.refId && pendingTaskIds.has(item.refId));
    }
    if (filter === 'failed') {
      return items.filter(
        (item) =>
          (item.refId && failedTaskIds.has(item.refId)) ||
          (isAgentTaskNotification(item) &&
            (item.title.includes('失败') || item.title.includes('需人工')))
      );
    }
    return items;
  }, [filter, items, pendingTaskIds, failedTaskIds]);

  const markRead = async (item: PublisherNotificationItem) => {
    if (!item.read) {
      await markPublisherNotificationRead(item.id, brandName);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const openResult = async (item: PublisherNotificationItem) => {
    await markRead(item);
    if (!onNavigate || !item.refId) return;
    if (item.actionView === 'agent_task_result' || isAgentTaskNotification(item)) {
      navigateToAgentTaskResult(onNavigate, item.refId);
      return;
    }
    const { view, hint } = resolveNotificationNavigation(item);
    onNavigate(view, hint);
  };

  const openDetail = async (item: PublisherNotificationItem) => {
    await markRead(item);
    if (!onNavigate) return;
    const { view, hint } = resolveNotificationNavigation(item);
    onNavigate(view, hint);
  };

  const handleMarkAllRead = async () => {
    await markAllPublisherNotificationsRead(brandName);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const pendingCount = pendingTasks.filter((t) => isResultConfirmPending(t)).length;
  const failedCount = failedTasks.length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="geo-page-content max-w-3xl space-y-4">
        <PageHeaderWithBrand
          title="消息通知"
          brandName={brandName}
          onBrandChange={onBrandChange}
          actions={
            <>
              {unreadCount > 0 && (
                <button type="button" className="geo-btn-secondary text-sm" onClick={() => void handleMarkAllRead()}>
                  全部标为已读
                </button>
              )}
              {onNavigate && (
                <button type="button" className="geo-btn-primary text-sm" onClick={() => onNavigate('agent_task_results')}>
                  进入结果中心
                </button>
              )}
            </>
          }
        />

        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['all', '全部'],
              ['unread', '未读'],
              ['pending_confirm', '待处理结果'],
              ['failed', '执行异常'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`text-xs px-3 py-1.5 rounded-md ${filter === id ? 'geo-nav-active' : 'geo-nav-item'}`}
            >
              {label}
              {id === 'pending_confirm' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              {id === 'failed' && failedCount > 0 ? ` (${failedCount})` : ''}
            </button>
          ))}
        </div>

        {brandName === '__all__' ? (
          <div className="geo-card p-6 text-sm text-[var(--color-text-secondary)]">
            请选择具体品牌以查看通知。
          </div>
        ) : (
          <div className="geo-card overflow-hidden">
            {loading && displayedItems.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-text-secondary)]">加载中…</p>
            ) : displayedItems.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-text-secondary)]">
                {filter === 'pending_confirm'
                  ? '暂无待处理结果。Hermes 任务完成后会出现在这里，点击可进入统一结果页确认应用。'
                  : filter === 'failed'
                    ? '暂无执行异常。任务失败或需人工处理时会出现在这里。'
                    : '暂无通知。提交 AI 任务、发单或发布内容后，相关动态将在此显示。'}
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {displayedItems.map((item) => {
                  const pending = item.refId ? pendingTaskIds.has(item.refId) : false;
                  const task = pendingTasks.find((t) => t.id === item.refId);
                  const confirmStatus = task ? getResultConfirmUiStatus(task) : null;
                  const isFailed = item.title.includes('失败') || item.title.includes('需人工');
                  const isAgent = isAgentTaskNotification(item);
                  return (
                    <li
                      key={item.id}
                      className={`px-4 py-4 ${item.read ? '' : 'bg-[var(--color-accent-light)]/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] px-2 py-0.5 rounded geo-nav-item font-medium">
                              {PUBLISHER_NOTIFICATION_TYPE_LABELS[item.type] ?? item.type}
                            </span>
                            {!item.read && (
                              <span className="text-[10px] text-[var(--color-accent)] font-semibold">未读</span>
                            )}
                            {confirmStatus === '待确认入库' && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                                待确认应用
                              </span>
                            )}
                            {confirmStatus === '已入库' && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                                已应用
                              </span>
                            )}
                            {confirmStatus === '已忽略' && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--neutral-bg-02)] text-[var(--neutral-text-02)] font-medium">
                                已忽略
                              </span>
                            )}
                            {isFailed && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">
                                需要手动处理
                              </span>
                            )}
                            {isAgent && !confirmStatus && !isFailed && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-medium">
                                本机 Hermes
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-title)]">{item.title}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-3">{item.body}</p>
                          <p className="text-xs text-[var(--color-text-placeholder)] mt-2">
                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      {onNavigate && item.actionView && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(isAgent || item.actionView === 'agent_task_result') && item.refId ? (
                            <button
                              type="button"
                              className="geo-btn-primary geo-btn-xs"
                              onClick={() => void openResult(item)}
                            >
                              查看结果
                            </button>
                          ) : pending && item.refId ? (
                            <button
                              type="button"
                              className="geo-btn-primary geo-btn-xs"
                              onClick={() => void openResult(item)}
                            >
                              查看结果
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs"
                            onClick={() => void openDetail(item)}
                          >
                            {isAgent ? '查看详情' : '查看 →'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
