import { useCallback, useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import type { ViewType } from '../../types';
import { fetchHermesHealth, type HermesHealth } from '../../lib/hermes-client';

interface Props {
  onNavigate?: (view: ViewType, hint?: string) => void;
}

type ConnectionState =
  | 'ready'
  | 'api_server_off'
  | 'await_bind_or_gateway'
  | 'bound_offline'
  | 'desktop_only'
  | 'offline';

function resolveConnectionState(health: HermesHealth): ConnectionState {
  if (health.apiGatewayOk) return 'ready';
  if (health.bound && health.heartbeat === 'online') return 'ready';
  if (health.ok && health.bound) return 'bound_offline';
  if (health.desktopRunning && !health.apiGatewayOk && !health.bound) return 'api_server_off';
  if (health.desktopRunning || health.mode === 'desktop_only') return 'desktop_only';
  if (health.ok && !health.bound) return 'await_bind_or_gateway';
  if (!health.ok && health.bound) return 'bound_offline';
  return 'offline';
}

const STATE_META: Record<
  ConnectionState,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  ready: {
    label: 'Hermes 已连接',
    dot: '#10b981',
    text: 'var(--color-accent)',
    bg: 'var(--color-accent-light)',
    border: '#99f6e4',
  },
  api_server_off: {
    label: 'API Server 未开启',
    dot: '#f59e0b',
    text: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  await_bind_or_gateway: {
    label: '待绑定或开启 API',
    dot: '#f59e0b',
    text: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  desktop_only: {
    label: 'Hermes 桌面端运行中',
    dot: '#f59e0b',
    text: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  bound_offline: {
    label: 'Hermes 已绑定 · 离线',
    dot: '#ef4444',
    text: '#b91c1c',
    bg: '#fef2f2',
    border: '#fecaca',
  },
  offline: {
    label: 'Hermes 未连接',
    dot: '#9ca3af',
    text: 'var(--neutral-text-03)',
    bg: 'var(--color-bg)',
    border: 'var(--neutral-divider-02)',
  },
};

export default function HermesConnectionIndicator({ onNavigate }: Props) {
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchHermesHealth();
      setHealth(data);
    } catch {
      setHealth({ ok: false, url: '', detail: '检测失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (loading && !health) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px]"
        style={{ borderColor: 'var(--neutral-divider-02)', color: 'var(--neutral-text-03)' }}
        title="检测 Hermes 连接状态"
      >
        <Cpu className="w-3 h-3 animate-pulse" />
        Hermes…
      </span>
    );
  }

  if (!health) return null;

  const state = resolveConnectionState(health);
  const meta = STATE_META[state];
  const capacity = health.capacity;
  const modeLabel =
    capacity?.effectivePolicy.mode === 'conservative'
      ? '保守模式'
      : capacity?.effectivePolicy.mode === 'balanced'
        ? '平衡模式'
        : capacity?.effectivePolicy.mode === 'accelerated'
          ? '加速模式'
          : capacity?.effectivePolicy.mode === 'do_not_disturb'
            ? '勿打扰'
            : null;
  const displayLabel =
    state === 'ready' && modeLabel ? `Hermes 已就绪 · ${modeLabel}` : meta.label;
  const versionLabel = health.desktopAppVersion
    ? `桌面 v${health.desktopAppVersion}`
    : health.clientVersion
      ? `v${health.clientVersion}`
      : null;

  const tooltip = [
    meta.label,
    onNavigate ? (state === 'ready' ? '点击打开本机 Hermes 控制台' : '点击完成安装与绑定') : null,
    versionLabel,
    health.agentVersion && health.desktopAppVersion && health.agentVersion !== health.desktopAppVersion
      ? `Agent 内核 v${health.agentVersion}`
      : null,
    health.boundDevice ? `设备：${health.boundDevice}` : null,
    health.connectionMode ? `模式：${health.connectionMode}` : null,
    health.apiServerEnabled === false ? 'API Server 未开启' : null,
    capacity?.userSummary,
    health.detail,
    health.url ? `探测：${health.url}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handleClick = () => {
    if (!onNavigate) return;
    if (state === 'ready') {
      onNavigate('hermes_console');
      return;
    }
    onNavigate('hermes_console', 'setup');
  };

  const clickable = Boolean(onNavigate);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      title={tooltip}
      aria-label={state === 'ready' ? '本机 Hermes 已连接，打开控制台' : '本机 Hermes 未就绪，前往安装与绑定'}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium transition-opacity ${
        clickable ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
      }`}
      style={{
        borderColor: meta.border,
        color: meta.text,
        background: meta.bg,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: meta.dot }}
        aria-hidden
      />
      <Cpu className="w-3 h-3 shrink-0 opacity-70" />
      <span className="max-w-[10rem] truncate">{displayLabel}</span>
    </button>
  );
}
