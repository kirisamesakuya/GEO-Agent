import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  type ProviderNotificationItem,
  resolveProviderNotifications,
  isMockNotificationId,
  markNotificationReadLocal,
  markAllNotificationsReadLocal,
  countUnreadNotifications,
} from './lib/provider-mock-notifications';

const TYPE_LABEL: Record<string, string> = {
  revision: '返修',
  assignment: '任务',
  task_hall: '任务大厅',
  order: '我的订单',
  onboarding: '入驻',
  system: '系统',
};

interface Props {
  providerId: string;
  embedded?: boolean;
}

export default function ProviderMessages({ providerId, embedded }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<ProviderNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyResolved = useCallback((resolved: ReturnType<typeof resolveProviderNotifications>) => {
    setItems(resolved.notifications);
    setUnreadCount(resolved.unreadCount);
    setIsDemo(resolved.isDemo);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/provider/notifications?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => applyResolved(resolveProviderNotifications(d)))
      .catch(() => applyResolved(resolveProviderNotifications({})))
      .finally(() => setLoading(false));
  }, [providerId, applyResolved]);

  useEffect(() => {
    load();
  }, [load]);

  const displayedItems = filterUnread ? items.filter((n) => !n.read) : items;

  const markRead = async (id: string) => {
    if (isDemo || isMockNotificationId(id)) {
      const next = markNotificationReadLocal(items, id);
      setItems(next);
      setUnreadCount(countUnreadNotifications(next));
      return;
    }
    await fetch(`/api/provider/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId }),
    });
    load();
  };

  const markAll = async () => {
    if (isDemo) {
      const next = markAllNotificationsReadLocal(items);
      setItems(next);
      setUnreadCount(0);
      toast('已全部标为已读', 'success');
      return;
    }
    await fetch('/api/provider/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId }),
    });
    toast('已全部标为已读', 'success');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className={`font-bold text-provider-title flex items-center gap-2 ${embedded ? 'text-xl' : 'text-lg'}`}>
            <Bell className="w-5 h-5 text-brand" /> 消息通知
          </h1>
          {!embedded && (
            <p className="text-xs text-provider-muted mt-1">任务大厅、报价结果、订单履约与平台系统通知</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className={`text-xs px-3 py-1.5 rounded-xl font-medium ${
              !filterUnread ? 'provider-nav-active' : 'provider-nav-item border border-provider'
            }`}
            onClick={() => setFilterUnread(false)}
          >
            全部
          </button>
          <button
            type="button"
            className={`text-xs px-3 py-1.5 rounded-xl font-medium ${
              filterUnread ? 'provider-nav-active' : 'provider-nav-item border border-provider'
            }`}
            onClick={() => setFilterUnread(true)}
          >
            未读 ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button type="button" className="provider-btn-secondary text-xs" onClick={() => void markAll()}>
              全部已读
            </button>
          )}
        </div>
      </div>

      {isDemo && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs py-2.5 px-4 rounded-xl">
          当前为演示通知，不含「品牌邀请接单」类消息。真实通知来自任务上架、报价结果、返修与结算等。
        </div>
      )}

      {loading ? (
        <p className="text-sm text-provider-muted py-8 text-center">加载中…</p>
      ) : displayedItems.length === 0 ? (
        <p className="text-sm text-provider-muted py-8 text-center provider-card">
          {filterUnread ? '暂无未读消息' : '暂无消息'}
        </p>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((n) => (
            <div
              key={n.id}
              className={`provider-card p-4 shadow-sm ${
                !n.read ? 'border-brand-light bg-brand-light/20' : ''
              }`}
            >
              <div className="flex justify-between gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-lg bg-brand-light text-brand font-medium">
                  {TYPE_LABEL[n.type] ?? n.type}
                </span>
                <span className="text-[10px] text-provider-muted shrink-0">
                  {new Date(n.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-provider-title">{n.title}</h3>
              <p className="text-sm mt-1 text-provider-secondary">{n.body}</p>
              {!n.read && (
                <button
                  type="button"
                  className="provider-btn-secondary text-xs mt-3"
                  onClick={() => void markRead(n.id)}
                >
                  标为已读
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
