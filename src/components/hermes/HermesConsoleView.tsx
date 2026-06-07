import { useEffect, useMemo, useState } from 'react';
import type { ViewType } from '../../types';
import { useHermesHealth } from '../../hooks/useHermesHealth';
import { updateHermesConcurrencySettings, type HermesConcurrencyMode } from '../../lib/hermes-client';
import {
  HERMES_MODE_DESCRIPTIONS,
  HERMES_MODE_LABELS,
  hermesConnectionTone,
  hermesConnectionStatusLabel,
  hermesUsagePercent,
} from '../../lib/hermes-status-utils';
import HermesSetupSection from './HermesSetupSection';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Gauge,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  onNavigate?: (view: ViewType, hint?: string) => void;
  scrollHint?: string;
}

export default function HermesConsoleView({ onNavigate, scrollHint }: Props) {
  const {
    health,
    skills,
    approvalPolicy,
    setApprovalPolicy,
    loading,
    error,
    refresh,
    patchCapacity,
  } = useHermesHealth({
    pollMs: 8000,
    includeSkills: true,
    includeApprovalPolicy: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (scrollHint !== 'setup') return;
    const el = document.getElementById('hermes-setup');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollHint, health]);

  const capacity = health?.capacity;
  const policy = capacity?.effectivePolicy;
  const activeTotal = capacity?.occupiedCounts?.total ?? capacity?.runningCounts.total ?? 0;
  const maxTotal = policy?.maxTotalRuns ?? capacity?.geoRecommendedMaxRuns ?? 3;
  const usage = hermesUsagePercent(activeTotal, maxTotal);
  const mode = policy?.mode ?? 'conservative';

  const status = useMemo(() => {
    const tone = hermesConnectionTone(health);
    return {
      label: hermesConnectionStatusLabel(health),
      tone,
    };
  }, [health]);

  const saveMode = async (nextMode: HermesConcurrencyMode) => {
    setSaving(true);
    try {
      const data = await updateHermesConcurrencySettings({ mode: nextMode });
      patchCapacity(data.capacity);
    } finally {
      setSaving(false);
    }
  };

  const toggleProtection = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      const data = await updateHermesConcurrencySettings({
        desktopProtectionEnabled: !capacity?.desktopProtection,
      });
      patchCapacity(data.capacity);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="geo-page-content max-w-6xl space-y-5 pb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl font-bold text-[var(--color-title)]">本机 Hermes</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="geo-btn-secondary text-sm flex items-center gap-2"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新状态
            </button>
            {onNavigate && (
              <button
                type="button"
                className="geo-btn-primary text-sm flex items-center gap-2"
                onClick={() => onNavigate('agent_task_results')}
              >
                <Bell className="w-4 h-4" />
                查看结果中心
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="geo-callout-warning">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="geo-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--neutral-text-03)]">连接状态</span>
              <Cpu className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <p
              className={`geo-stat-value ${
                status.tone === 'danger'
                  ? 'geo-stat-value--danger'
                  : status.tone === 'warn'
                    ? 'geo-stat-value--warning'
                    : status.tone === 'ready'
                      ? 'geo-stat-value--success'
                      : ''
              }`}
            >
              {status.label}
            </p>
            <p className="text-xs text-[var(--neutral-text-03)] truncate">{health?.url || '等待检测'}</p>
          </div>
          <div className="geo-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--neutral-text-03)]">后台额度</span>
              <Gauge className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <p className="geo-stat-value">
              {activeTotal}/{maxTotal}
            </p>
            <div className="h-1.5 rounded-full bg-[var(--neutral-bg-02)] overflow-hidden mt-2">
              <div className="h-full bg-[var(--color-primary)]" style={{ width: `${usage}%` }} />
            </div>
          </div>
          <div className="geo-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--neutral-text-03)]">发布任务</span>
              <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <p className="geo-stat-value">{policy?.maxPublishRuns ?? 1}</p>
            <p className="text-xs text-[var(--neutral-text-03)]">
              运行 {capacity?.runningCounts.publish ?? 0} · 队列 {capacity?.queuedCounts.publish ?? 0}
            </p>
          </div>
          <div className="geo-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--neutral-text-03)]">桌面端保护</span>
              <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <p className="geo-stat-value">{capacity?.desktopProtection === false ? '关闭' : '开启'}</p>
            <p className="text-xs text-[var(--neutral-text-03)]">
              {capacity?.desktopActive ? '桌面端使用中' : '桌面端空闲'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div className="geo-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[var(--color-accent)]" />
              <h3 className="text-base font-semibold text-[var(--color-title)]">后台任务策略</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(HERMES_MODE_LABELS) as HermesConcurrencyMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={saving}
                  onClick={() => void saveMode(item)}
                  className={`text-left rounded-lg border p-3 transition ${
                    mode === item ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'geo-nav-item'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--color-title)]">
                      {HERMES_MODE_LABELS[item]}
                    </span>
                    {mode === item && <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" />}
                  </div>
                  <p className="text-xs text-[var(--neutral-text-03)] mt-1 leading-relaxed">
                    {HERMES_MODE_DESCRIPTIONS[item]}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="geo-btn-secondary text-sm"
              disabled={!policy || saving}
              onClick={() => void toggleProtection()}
            >
              {capacity?.desktopProtection === false ? '开启桌面端保护' : '关闭桌面端保护'}
            </button>
          </div>

          <div className="geo-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-accent)]" />
              <h3 className="text-base font-semibold text-[var(--color-title)]">当前队列</h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: '分析类',
                  running: capacity?.runningCounts.analysis ?? 0,
                  queued: capacity?.queuedCounts.analysis ?? 0,
                  max: policy?.maxAnalysisRuns ?? 2,
                },
                {
                  label: '发布类',
                  running: capacity?.runningCounts.publish ?? 0,
                  queued: capacity?.queuedCounts.publish ?? 0,
                  max: policy?.maxPublishRuns ?? 1,
                },
                {
                  label: '账号类',
                  running: capacity?.runningCounts.account ?? 0,
                  queued: capacity?.queuedCounts.account ?? 0,
                  max: policy?.maxAccountRuns ?? 1,
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[var(--neutral-text-02)]">{row.label}</span>
                    <span className="text-[var(--neutral-text-03)]">
                      运行 {row.running} / 队列 {row.queued}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--neutral-bg-02)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)]"
                      style={{ width: `${hermesUsagePercent(row.running, row.max)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {capacity?.capacityHint && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                {capacity.capacityHint}
              </p>
            )}
            {onNavigate && (
              <button
                type="button"
                className="geo-btn-secondary text-sm w-full"
                onClick={() => onNavigate('agent_tasks')}
              >
                打开诊断日志
              </button>
            )}
          </div>
        </div>

        <HermesSetupSection
          health={health}
          skills={skills}
          approvalPolicy={approvalPolicy}
          onApprovalPolicyChange={setApprovalPolicy}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
