import { Loader2, Sparkles } from 'lucide-react';

interface HermesWorkingOverlayProps {
  open: boolean;
  progress: number;
  message: string;
  detail?: string;
}

export default function HermesWorkingOverlay({
  open,
  progress,
  message,
  detail,
}: HermesWorkingOverlayProps) {
  if (!open) return null;

  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-6"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--neutral-divider-02)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--color-primary-light, rgba(59,130,246,0.12))' }}
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--color-primary)' }}
              aria-hidden
            />
            <Sparkles
              className="absolute -top-0.5 -right-0.5 w-4 h-4 animate-pulse"
              style={{ color: 'var(--color-accent, #f59e0b)' }}
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--neutral-text-01)' }}>
              Hermes 工作中
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--neutral-text-02)' }}>
              {message}
            </p>
          </div>
        </div>

        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--neutral-bg-03)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent, #38bdf8))',
            }}
          />
        </div>

        <p className="text-[10px] text-center tabular-nums" style={{ color: 'var(--neutral-text-03)' }}>
          {pct}%
          {detail ? ` · ${detail}` : ''}
        </p>
        <p className="text-[10px] text-center" style={{ color: 'var(--neutral-text-03)' }}>
          本机 Mock 模拟发布，不调用平台官方发帖接口
        </p>
      </div>
    </div>
  );
}
