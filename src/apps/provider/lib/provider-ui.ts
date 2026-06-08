export const ORDER_STATUS_LABEL: Record<string, string> = {
  published: '待接单',
  in_progress: '写作中',
  draft_review: '待发布方审稿',
  draft_revision: '审稿返修',
  draft_approved: '待发布',
  pending_review: '待最终验收',
  completed: '已完成',
  revision: '最终返修',
  disputed: '争议中',
};

export const ORDER_STATUS_CHIP: Record<string, string> = {
  published: 'bg-provider-hover text-provider-secondary',
  in_progress: 'bg-blue-50 text-blue-700',
  draft_review: 'bg-purple-50 text-purple-700',
  draft_revision: 'bg-orange-50 text-orange-700',
  draft_approved: 'bg-teal-50 text-teal-700',
  pending_review: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  revision: 'bg-orange-50 text-orange-700',
  disputed: 'bg-red-50 text-red-700',
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  suspended: '已暂停',
  withdrawn: '已撤回',
};

export const SETTLEMENT_LABEL: Record<string, string> = {
  pending_platform: '待平台确认',
  pending_offline: '待线下结算',
  settled: '已结算',
};

export const PLATFORM_SHORT: Record<string, string> = {
  小红书: '小红书',
  xiaohongshu: '小红书',
  知乎: '知乎',
  zhihu: '知乎',
  公众号: '公众号',
  official_account: '公众号',
  抖音: '抖音',
  douyin: '抖音',
  网站: '网站',
  web: '网站',
  大风网: '大风网',
  一点号: '一点号',
  官媒: '官媒',
};

export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function platformPlaceholder(platform: string): string {
  const colors = ['#ff4d4f', '#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96'];
  const i = Math.abs(platform.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
  return colors[i];
}

export function formatMarketplaceSlots(task: {
  claimedCount?: number;
  availableSlots?: number;
  slotTotal?: number;
}): { claimedText: string; availableText: string; isFull: boolean } {
  const claimed = task.claimedCount ?? 0;
  const available = task.availableSlots ?? Math.max(0, (task.slotTotal ?? 1) - claimed);
  const isFull = available <= 0;
  return {
    claimedText: `已接 ${claimed} 人`,
    availableText: isFull ? '已满员' : `剩余 ${available} 名额`,
    isFull,
  };
}

export function formatTaskPublishedAt(iso?: string | null): string {
  if (!iso) return '刚刚发布';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '刚刚发布';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return '刚刚发布';
  if (diffMins < 60) return `${diffMins} 分钟前发布`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前发布`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前发布`;
  return `${d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} 发布`;
}

export const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=geo-provider';

export const PAYOUT_CHANNEL_OPTIONS = [
  { value: 'bank', label: '银行卡' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
] as const;

export type PayoutChannel = (typeof PAYOUT_CHANNEL_OPTIONS)[number]['value'];

export function payoutChannelLabel(channel: string | null | undefined): string {
  return PAYOUT_CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? '未设置';
}

export function payoutLabelFromChannel(channel: string, detail: string): string {
  const name = payoutChannelLabel(channel);
  if (channel === 'bank') return `${name} ${detail}`;
  if (channel === 'alipay') return `支付宝 ${detail}`;
  if (channel === 'wechat') return `微信 ${detail}`;
  return detail;
}
