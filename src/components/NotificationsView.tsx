import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentTask, ViewType } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import ResultConfirmDrawer from './agent/ResultConfirmDrawer';
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

export default function NotificationsView({ brandName, onBrandChange, onNavigate }: Props) {
  const [items, setItems] = useState<PublisherNotificationItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<AgentTask[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending_confirm'>('all');
  const [drawerTask, setDrawerTask] = useState<AgentTask | null>(null);
  const [drawerTitle, setDrawerTitle] = useState('');

  const pendingTaskIds = useMemo(
    () => new Set(pendingTasks.filter((t) => isResultConfirmPending(t)).map((t) => t.id)),
    [pendingTasks]
  );

  const load = useCallback(async () => {
    if (!brandName || brandName === '__all__') {
      setItems([]);
      setPendingTasks([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [data, pending] = await Promise.all([
        fetchPublisherNotifications(brandName, filter === 'unread'),
        fetchPendingConfirmTasks(brandName),
      ]);
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
      setPendingTasks(pending);
    } finally {
      setLoading(false);
    }
  }, [brandName, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayedItems = useMemo(() => {
    if (filter !== 'pending_confirm') return items;
    return items.filter((item) => item.refId && pendingTaskIds.has(item.refId));
  }, [filter, items, pendingTaskIds]);

  const markRead = async (item: PublisherNotificationItem) => {
    if (!item.read) {
      await markPublisherNotificationRead(item.id, brandName);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const openDrawer = async (item: PublisherNotificationItem, task: AgentTask) => {
    await markRead(item);
    setDrawerTitle(item.title);
    setDrawerTask(task);
  };

  const openDetail = async (item: PublisherNotificationItem) => {
    await markRead(item);
    if (onNavigate) {
      const { view, hint } = resolveNotificationNavigation(item);
      onNavigate(view, hint);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllPublisherNotificationsRead(brandName);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const pendingCount = pendingTasks.filter((t) => isResultConfirmPending(t)).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="geo-page-content max-w-3xl space-y-4">
        <BrandScopeBar label="查看哪个品牌的通知" brandName={brandName} onBrandChange={onBrandChange} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-title)]">消息通知</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              AI 任务、订单交付、发布账号与资金相关站内信
              {unreadCount > 0 ? ` · ${unreadCount} 条未读` : ''}
              {pendingCount > 0 ? ` · ${pendingCount} 条待确认` : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <button type="button" className="geo-btn-secondary text-sm" onClick={() => void handleMarkAllRead()}>
              全部标为已读
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(
            [
              ['all', '全部'],
              ['unread', '未读'],
              ['pending_confirm', '待确认'],
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
                  ? '暂无待确认结果。品牌资料、关键词或知识库 AI 任务完成后会出现在这里。'
                  : '暂无通知。提交 AI 任务、发单或发布内容后，相关动态将在此显示。'}
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {displayedItems.map((item) => {
                  const pending = item.refId ? pendingTaskIds.has(item.refId) : false;
                  const task = pendingTasks.find((t) => t.id === item.refId);
                  const confirmStatus = task ? getResultConfirmUiStatus(task) : null;
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
                                待确认
                              </span>
                            )}
                            {confirmStatus === '已入库' && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                                已入库
                              </span>
                            )}
                            {confirmStatus === '已忽略' && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                已忽略
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
                          {pending && task && (
                            <button
                              type="button"
                              className="geo-btn-primary geo-btn-xs"
                              onClick={() => void openDrawer(item, task)}
                            >
                              预览并确认
                            </button>
                          )}
                          <button
                            type="button"
                            className="geo-btn-secondary geo-btn-xs"
                            onClick={() => void openDetail(item)}
                          >
                            {pending ? '进入详情' : '查看 →'}
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

      {drawerTask && (
        <ResultConfirmDrawer
          task={drawerTask}
          title={drawerTitle}
          onClose={() => setDrawerTask(null)}
          onUpdated={() => {
            void load();
            setDrawerTask(null);
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
