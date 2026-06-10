import type { ViewType } from '../types';
import { appendBrandQuery } from './publisher-context';

export interface PublisherNotificationItem {
  id: string;
  brandName: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  refId: string | null;
  actionView: string | null;
  createdAt: string;
}

export const PUBLISHER_NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  agent_task: 'AI 任务',
  geo_report: 'GEO 报告',
  order: '订单交付',
  publish: '发布',
  account: '发布账号',
  funds: '资金',
  cert: '认证',
  system: '系统',
};

export async function fetchPublisherNotifications(
  brandName: string,
  unreadOnly = false
): Promise<{ notifications: PublisherNotificationItem[]; unreadCount: number }> {
  const res = await fetch(appendBrandQuery('/api/notifications', brandName, { unreadOnly }));
  const data = await res.json();
  return {
    notifications: (data.notifications ?? []) as PublisherNotificationItem[],
    unreadCount: Number(data.unreadCount ?? 0),
  };
}

export async function markPublisherNotificationRead(id: string, brandName: string) {
  await fetch(`/api/notifications/${id}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandName }),
  });
}

export async function markAllPublisherNotificationsRead(brandName: string) {
  await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandName }),
  });
}

export function resolveNotificationNavigation(
  item: PublisherNotificationItem
): { view: ViewType; hint?: string } {
  let view = (item.actionView as ViewType) || 'notifications';
  if (!item.refId) return { view };

  if (view === 'agent_tasks' && item.type === 'agent_task') {
    view = 'agent_task_result';
  }

  if (view === 'content_library' || view === 'order_delivery') {
    view = 'content_delivery';
  }

  if (view === 'geo_analysis') {
    return { view, hint: `report:${item.refId}` };
  }
  if (
    view === 'content_delivery' ||
    view === 'agent_tasks' ||
    view === 'agent_task_result'
  ) {
    return { view, hint: item.refId };
  }
  return { view, hint: item.refId };
}
