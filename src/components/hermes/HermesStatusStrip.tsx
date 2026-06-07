import { ChevronRight, RefreshCw } from 'lucide-react';
import type { ViewType } from '../../types';
import { useHermesHealth } from '../../hooks/useHermesHealth';
import {
  HERMES_DOWNLOAD_URL,
  HERMES_MODE_LABELS,
  hermesConnectionStatusLabel,
  hermesReady,
} from '../../lib/hermes-status-utils';

interface Props {
  onNavigate?: (view: ViewType, hint?: string) => void;
  pollMs?: number;
}

export default function HermesStatusStrip({ onNavigate, pollMs = 12_000 }: Props) {
  const { health, loading, refresh } = useHermesHealth({ pollMs });

  const capacity = health?.capacity;
  const policy = capacity?.effectivePolicy;
  const ready = hermesReady(health);
  const modeLabel = policy ? HERMES_MODE_LABELS[policy.mode] : null;
  const activeTotal = capacity?.occupiedCounts?.total ?? capacity?.runningCounts.total ?? 0;
  const maxTotal = policy?.maxTotalRuns ?? capacity?.geoRecommendedMaxRuns ?? 3;

  return (
    <div
      className="rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
      style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-[var(--color-title)]">本机 Hermes</p>
        <p className="text-xs text-[var(--neutral-text-02)]">
          {ready ? '●' : '○'} {hermesConnectionStatusLabel(health)}
          {modeLabel ? ` · ${modeLabel}模式` : ''}
          {policy
            ? ` · 分析 ${capacity?.runningCounts.analysis ?? 0}/${policy.maxAnalysisRuns} · 发布 ${capacity?.runningCounts.publish ?? 0}/${policy.maxPublishRuns}`
            : ''}
          {ready && policy ? ` · 总占用 ${activeTotal}/${maxTotal}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          检测
        </button>
        {!ready && (
          <a
            href={health?.downloadUrl ?? HERMES_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className="geo-btn-secondary geo-btn-xs"
          >
            打开 Hermes
          </a>
        )}
        {onNavigate && (
          <button
            type="button"
            className="geo-btn-primary geo-btn-xs inline-flex items-center gap-0.5"
            onClick={() => onNavigate('hermes_console', ready ? undefined : 'setup')}
          >
            {ready ? '管理本机 Hermes' : '前往配置'}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
