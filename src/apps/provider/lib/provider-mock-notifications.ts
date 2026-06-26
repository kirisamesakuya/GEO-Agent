export interface ProviderNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

/**
 * 演示通知：接单人从任务大厅提交报价；无「品牌方向达人发起邀请」场景。
 * 真实通知由报价结果、订单履约、返修、结算、入驻审核等事件产生。
 */
export const MOCK_PROVIDER_NOTIFICATIONS: ProviderNotificationItem[] = [
  {
    id: 'mock-notif-1',
    type: 'task_hall',
    title: '任务大厅有新任务',
    body: '「小红书种草笔记 | 青岚咖啡新品推广」已开放报价，与您的擅长领域匹配，可前往任务大厅提交 P0 方案。',
    read: false,
    createdAt: hoursAgo(0.15),
  },
  {
    id: 'mock-notif-2',
    type: 'order',
    title: '已接订单有新动态',
    body: '您已中标的「青岚咖啡」相关订单有新的沟通或状态更新，请前往「我的订单」查看。',
    read: false,
    createdAt: hoursAgo(1),
  },
  {
    id: 'mock-notif-3',
    type: 'revision',
    title: '订单需返修',
    body: '订单「成都火锅探店短视频」发布方提出修改意见，请补充交付物后重新提交验收。',
    read: false,
    createdAt: hoursAgo(5),
  },
  {
    id: 'mock-notif-4',
    type: 'system',
    title: '结算收益已到账',
    body: '订单「官网内容优化任务」结算 ¥3,180 已计入可提现余额，可在收益中心查看。',
    read: true,
    createdAt: daysAgo(1),
  },
  {
    id: 'mock-notif-5',
    type: 'task_hall',
    title: '任务匹配推荐',
    body: '系统根据您的服务类型与区域，推荐了 3 条高匹配度任务，建议前往任务大厅浏览并提交报价。',
    read: true,
    createdAt: daysAgo(2),
  },
  {
    id: 'mock-notif-6',
    type: 'onboarding',
    title: '入驻审核已通过',
    body: '您已通过平台入驻审核，可在任务大厅浏览任务并提交报价方案。',
    read: true,
    createdAt: daysAgo(5),
  },
];

export function hasRealNotifications(
  notifications: ProviderNotificationItem[] | undefined
): boolean {
  return Array.isArray(notifications) && notifications.length > 0;
}

export function countUnreadNotifications(items: ProviderNotificationItem[]): number {
  return items.filter((n) => !n.read).length;
}

export function resolveProviderNotifications(api: {
  notifications?: ProviderNotificationItem[];
  unreadCount?: number;
}): {
  notifications: ProviderNotificationItem[];
  unreadCount: number;
  isDemo: boolean;
} {
  if (hasRealNotifications(api.notifications)) {
    const notifications = api.notifications!;
    return {
      notifications,
      unreadCount: api.unreadCount ?? countUnreadNotifications(notifications),
      isDemo: false,
    };
  }
  const notifications = MOCK_PROVIDER_NOTIFICATIONS.map((n) => ({ ...n }));
  return {
    notifications,
    unreadCount: countUnreadNotifications(notifications),
    isDemo: true,
  };
}

export function isMockNotificationId(id: string): boolean {
  return id.startsWith('mock-notif-');
}

export function markNotificationReadLocal(
  items: ProviderNotificationItem[],
  id: string
): ProviderNotificationItem[] {
  return items.map((n) => (n.id === id ? { ...n, read: true } : n));
}

export function markAllNotificationsReadLocal(
  items: ProviderNotificationItem[]
): ProviderNotificationItem[] {
  return items.map((n) => ({ ...n, read: true }));
}
