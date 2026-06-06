import { useCallback, useEffect, useState } from 'react';
import type { ViewType } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import {
  fetchPublisherNotifications,
  markAllPublisherNotificationsRead,
  markPublisherNotificationRead,
  PUBLISHER_NOTIFICATION_TYPE_LABELS,
  resolveNotificationNavigation,
  type PublisherNotificationItem,
} from '../lib/publisher-notifications';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function NotificationsView({ brandName, onBrandChange, onNavigate }: Props) {
  const [items, setItems] = useState<PublisherNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    if (!brandName || brandName === '__all__') {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPublisherNotifications(brandName, filter === 'unread');
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [brandName, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openItem = async (item: PublisherNotificationItem) => {
    if (!item.read) {
      await markPublisherNotificationRead(item.id, brandName);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
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
            </p>
          </div>
          {unreadCount > 0 && (
            <button type="button" className="geo-btn-secondary text-sm" onClick={() => void handleMarkAllRead()}>
              全部标为已读
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`text-xs px-3 py-1.5 rounded-md ${filter === id ? 'geo-nav-active' : 'geo-nav-item'}`}
            >
              {id === 'all' ? '全部' : '未读'}
            </button>
          ))}
        </div>

        {brandName === '__all__' ? (
          <div className="geo-card p-6 text-sm text-[var(--color-text-secondary)]">
            请选择具体品牌以查看通知。
          </div>
        ) : (
          <div className="geo-card overflow-hidden">
            {loading && items.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-text-secondary)]">加载中…</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-text-secondary)]">
                暂无通知。提交 AI 任务、发单或发布内容后，相关动态将在此显示。
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openItem(item)}
                      className={`w-full text-left px-4 py-4 transition-colors hover:bg-[var(--color-primary-light)] ${
                        item.read ? '' : 'bg-[var(--color-accent-light)]/40'
                      }`}
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
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-title)]">{item.title}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-3">{item.body}</p>
                          <p className="text-xs text-[var(--color-text-placeholder)] mt-2">
                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        {onNavigate && item.actionView && (
                          <span className="text-xs text-[var(--color-accent)] shrink-0">查看 →</span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
