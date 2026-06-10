import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import { useHermesHealth } from '../../hooks/useHermesHealth';
import { updateHermesConcurrencySettings, type HermesConcurrencyMode, type HermesHealth } from '../../lib/hermes-client';
import {
  HERMES_CAPACITY_STATS_ENABLED,
  HERMES_CONCURRENCY_POLICY_UI_ENABLED,
  HERMES_QUEUE_MONITOR_ENABLED,
} from '../../lib/hermes-feature-flags';
import {
  HERMES_MODE_DESCRIPTIONS,
  HERMES_MODE_LABELS,
  hermesUsagePercent,
} from '../../lib/hermes-status-utils';
import HermesSetupSection from './HermesSetupSection';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Gauge,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  onNavigate?: (view: ViewType, hint?: string) => void;
  scrollHint?: string;
}

function parseReturnOnboardingTask(hint?: string): string | null {
  const prefix = 'return:onboarding:';
  if (!hint?.startsWith(prefix)) return null;
  const taskId = hint.slice(prefix.length).trim();
  return taskId || null;
}

function isHermesReady(health: HermesHealth | null) {
  if (!health) return false;
  if (health.apiGatewayOk) return true;
  return Boolean(health.bound);
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

  const returnTaskId = parseReturnOnboardingTask(scrollHint);
  const shouldScrollSetup = scrollHint === 'setup' || Boolean(returnTaskId);
  const hermesReady = isHermesReady(health);
  const isSetupEntry = !hermesReady || scrollHint === 'setup' || Boolean(returnTaskId);

  useEffect(() => {
    if (!shouldScrollSetup) return;
    const el = document.getElementById('hermes-setup');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [shouldScrollSetup, health]);

  const capacity = health?.capacity;
  const policy = capacity?.effectivePolicy;
  const activeTotal = capacity?.occupiedCounts?.total ?? capacity?.runningCounts.total ?? 0;
  const maxTotal = policy?.maxTotalRuns ?? capacity?.geoRecommendedMaxRuns ?? 3;
  const usage = hermesUsagePercent(activeTotal, maxTotal);
  const mode = policy?.mode ?? 'conservative';

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

  const showAdvancedPanels = HERMES_CONCURRENCY_POLICY_UI_ENABLED || HERMES_QUEUE_MONITOR_ENABLED;

  return (
    <div className="h-full overflow-y-auto">
      <div className="geo-page-content max-w-6xl space-y-5 pb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl font-bold text-[var(--color-title)]">本机 Hermes</h2>
            {isSetupEntry && !hermesReady && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-900">
                待连接
              </span>
            )}
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
            {onNavigate && hermesReady && (
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

        {returnTaskId && onNavigate && (
          <div
            className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
              hermesReady
                ? 'border-green-200 bg-green-50'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-title)]">
                {hermesReady ? '本机 Hermes 已就绪' : '先完成 Hermes 连接'}
              </p>
              <p className="text-xs text-[var(--neutral-text-03)] mt-1">
                {hermesReady
                  ? 'GEO 检测任务已创建，可返回继续查看检测进度。'
                  : 'Hermes 是所有 GEO 功能的前置环境。完成下方安装与绑定后，再返回检测任务页。'}
              </p>
            </div>
            {hermesReady && (
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm shrink-0"
                onClick={() => onNavigate('brand_onboarding', returnTaskId)}
              >
                继续 GEO 检测
              </button>
            )}
          </div>
        )}

        <HermesSetupSection
          id="hermes-setup"
          health={health}
          skills={skills}
          approvalPolicy={approvalPolicy}
          onApprovalPolicyChange={setApprovalPolicy}
          onRefresh={refresh}
        />

        {/* 连接状态已合并至 HermesSetupSection；以下为本期隐藏的额度类指标 */}
        {HERMES_CAPACITY_STATS_ENABLED && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        )}

        {showAdvancedPanels && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
            {/* 本期隐藏，见 hermes-feature-flags.ts（HERMES_CONCURRENCY_POLICY_UI_ENABLED） */}
            {HERMES_CONCURRENCY_POLICY_UI_ENABLED && (
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
            )}

            {/* 本期隐藏，见 hermes-feature-flags.ts（HERMES_QUEUE_MONITOR_ENABLED） */}
            {HERMES_QUEUE_MONITOR_ENABLED && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
