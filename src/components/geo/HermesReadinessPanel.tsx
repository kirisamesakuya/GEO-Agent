import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ViewType } from '../../types';
import { fetchOnboardingStatus, type OnboardingStatus } from '../../lib/onboarding-client';

interface Props {
  brandName?: string;
  compact?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onNeedSetup?: () => void;
}

export default function HermesReadinessPanel({
  brandName,
  compact = false,
  onNavigate,
  onNeedSetup,
}: Props) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchOnboardingStatus(brandName)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
    const t = setInterval(() => {
      void fetchOnboardingStatus(brandName).then(setStatus).catch(() => setStatus(null));
    }, 8000);
    return () => clearInterval(t);
  }, [brandName]);

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--neutral-text-03)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        检测本机 Hermes 状态…
      </div>
    );
  }

  if (!status) return null;

  if (status.hermesReady) {
    return (
      <div
        className={`flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-900 ${
          compact ? 'p-2 text-xs' : 'p-3 text-sm'
        }`}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">本机 Hermes 已就绪</p>
          {!compact && status.device && (
            <p className="text-xs mt-0.5 opacity-80">
              设备 {status.device.deviceName}
              {status.device.hermesVersion ? ` · v${status.device.hermesVersion}` : ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-950 ${
        compact ? 'p-2 text-xs' : 'p-3 text-sm'
      }`}
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">本机 Hermes 尚未就绪</p>
        <p className="text-xs mt-0.5 opacity-90">
          任务将等待你的电脑完成安装、绑定和词元能力检测后再执行，不会伪造结果。
        </p>
        {onNavigate && (
          <button
            type="button"
            className="geo-link text-xs font-medium mt-1.5"
            onClick={() => {
              onNeedSetup?.();
              onNavigate('onboarding_console');
            }}
          >
            去完成 Hermes 设置 →
          </button>
        )}
      </div>
    </div>
  );
}

/** 提交 GEO 任务前检查 Hermes；未就绪时返回 false */
export async function ensureHermesReadyForSubmit(brandName?: string): Promise<boolean> {
  const status = await fetchOnboardingStatus(brandName);
  return status.hermesReady;
}
