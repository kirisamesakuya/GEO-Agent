import { useCallback, useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import type { ViewType } from '../../types';
import { fetchHermesHealth, type HermesHealth } from '../../lib/hermes-client';

interface Props {
  onNavigate?: (view: ViewType, hint?: string) => void;
}

type ConnectionState = 'ready' | 'running_unbound' | 'bound_offline' | 'desktop_only' | 'offline';

function resolveConnectionState(health: HermesHealth): ConnectionState {
  if (health.bound && (health.heartbeat === 'online' || health.apiGatewayOk)) return 'ready';
  if (health.ok && health.bound) return 'bound_offline';
  if (health.ok && !health.bound) return 'running_unbound';
  if (!health.ok && health.bound) return 'bound_offline';
  if (health.desktopRunning || health.mode === 'desktop_only') return 'desktop_only';
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
  running_unbound: {
    label: 'Hermes 运行中 · 待绑定',
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
  const tooltip = [
    meta.label,
    health.clientVersion ? `版本：${health.clientVersion}` : null,
    health.boundDevice ? `设备：${health.boundDevice}` : null,
    health.apiServerEnabled === false ? 'API 服务（8642）未开启' : null,
    health.detail,
    health.url ? `探测：${health.url}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handleClick = () => {
    if (state !== 'ready' && onNavigate) {
      onNavigate('onboarding_console');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'ready' || !onNavigate}
      title={tooltip}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium transition-opacity disabled:cursor-default"
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
      <span className="max-w-[7rem] truncate">{meta.label}</span>
    </button>
  );
}
