import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import type { ViewType } from '../../types';
import {
  fetchPublisherNotifications,
  markAllPublisherNotificationsRead,
  markPublisherNotificationRead,
  resolveNotificationNavigation,
  type PublisherNotificationItem,
} from '../../lib/publisher-notifications';

interface Props {
  brandName: string;
  onNavigate: (view: ViewType, hint?: string) => void;
}

export default function PublisherNotificationBell({ brandName, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PublisherNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!brandName || brandName === '__all__') {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    try {
      const data = await fetchPublisherNotifications(brandName);
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setItems([]);
      setUnreadCount(0);
    }
  }, [brandName]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const openItem = async (item: PublisherNotificationItem) => {
    if (!item.read) {
      await markPublisherNotificationRead(item.id, brandName);
      setUnreadCount((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    }
    setOpen(false);
    const { view, hint } = resolveNotificationNavigation(item);
    onNavigate(view, hint);
  };

  const markAllRead = async () => {
    await markAllPublisherNotificationsRead(brandName);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setOpen(false);
  };

  const disabled = !brandName || brandName === '__all__';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? '请选择具体品牌后查看通知' : '消息通知'}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full geo-nav-item disabled:opacity-50"
        style={{ color: 'var(--neutral-text-03)' }}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl border shadow-xl z-50 overflow-hidden"
          style={{
            borderColor: 'var(--neutral-divider-02)',
            background: 'var(--color-bg-card)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--neutral-text-01)' }}>
              通知中心
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-medium geo-link"
                onClick={() => void markAllRead()}
              >
                全部已读
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                暂无通知
              </p>
            ) : (
              items.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-[var(--color-primary-light)] ${
                    item.read ? '' : 'bg-[var(--color-accent-light)]/30'
                  }`}
                  style={{ borderColor: 'var(--neutral-divider-02)' }}
                >
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--neutral-text-01)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--neutral-text-02)' }}>
                    {item.body}
                  </p>
                  <span className="text-[10px] mt-1 block" style={{ color: 'var(--neutral-text-03)' }}>
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            className="w-full py-3 text-xs font-semibold border-t geo-link"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
            onClick={() => {
              setOpen(false);
              onNavigate('notifications');
            }}
          >
            查看全部消息
          </button>
        </div>
      )}
    </div>
  );
}
