import type { HermesConcurrencyMode, HermesHealth } from './hermes-client';

export const HERMES_MODE_LABELS: Record<HermesConcurrencyMode, string> = {
  conservative: '保守',
  balanced: '平衡',
  accelerated: '加速',
  do_not_disturb: '勿打扰',
};

export const HERMES_MODE_DESCRIPTIONS: Record<HermesConcurrencyMode, string> = {
  conservative: '优先保护 Hermes 桌面端使用，发布类任务串行。',
  balanced: '适合轻度多任务，仍为桌面端保留运行空间。',
  accelerated: '优先吞吐，适合用户明确暂不操作桌面端时使用。',
  do_not_disturb: '暂停后台拉取新任务，只保留状态检测。',
};

export const HERMES_DOWNLOAD_URL = 'https://hermes.agentsyun.com/';

export function hermesUsagePercent(used: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export function hermesConnectionStatusLabel(health: HermesHealth | null): string {
  if (!health) return '—';
  if (health.apiGatewayOk) return '已连接';
  if (health.desktopRunning) return health.apiServerEnabled ? '桌面端运行中' : 'API 未启用';
  if (health.bound && health.heartbeat === 'online') return '已绑定 · 在线';
  if (health.bound) return '已绑定 · 离线';
  return '未连接';
}

export function hermesBindingStatusLabel(health: HermesHealth | null): string {
  if (!health) return '—';
  if (health.apiGatewayOk) return '开发直连';
  if (health.bound) return `已绑定 · ${health.boundDevice ?? ''}`;
  return '待绑定';
}

export function hermesTokenCapacityLabel(health: HermesHealth | null): string {
  const tc = health?.tokenCapacity;
  if (!tc) return health?.apiGatewayOk ? '待检测' : '—';
  if (tc.tokenCapacityStatus === 'available' && tc.modelRuntimeStatus === 'available') {
    return '可用';
  }
  return '不可用';
}

export function hermesReady(health: HermesHealth | null): boolean {
  return Boolean(health?.ok || health?.apiGatewayOk || health?.bound);
}

export function hermesConnectionTone(health: HermesHealth | null): 'ready' | 'warn' | 'danger' | 'neutral' {
  if (!health) return 'neutral';
  if (health.apiGatewayOk || health.ok) return 'ready';
  if (health.desktopRunning) return 'warn';
  return 'danger';
}
