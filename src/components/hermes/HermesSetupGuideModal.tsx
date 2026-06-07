import { AlertCircle, Settings } from 'lucide-react';
import type { ViewType } from '../../types';
import type { OnboardingStatus } from '../../lib/onboarding-client';
import { buildHermesSetupGuideCopy } from '../../lib/hermes-readiness-guard';

interface Props {
  open: boolean;
  status: OnboardingStatus | null;
  loading?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onRetry?: () => void;
  onClose: () => void;
}

export default function HermesSetupGuideModal({
  open,
  status,
  loading = false,
  onNavigate,
  onRetry,
  onClose,
}: Props) {
  if (!open || !status) return null;

  const { title, lines } = buildHermesSetupGuideCopy(status);

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="geo-modal max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <div className="geo-modal-head">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{title}</h3>
              <p className="text-[10px] text-[var(--neutral-text-03)]">提交 GEO 任务前需完成本机执行环境</p>
            </div>
          </div>
        </div>
        <div className="geo-modal-body space-y-3">
          {lines.map((line) => (
            <p key={line} className="text-sm text-[var(--neutral-text-02)] leading-relaxed">
              {line}
            </p>
          ))}
        </div>
        <div className="geo-modal-foot flex flex-wrap gap-2 justify-end">
          <button type="button" className="geo-btn-secondary text-sm" onClick={onClose}>
            稍后再说
          </button>
          {onRetry && (
            <button
              type="button"
              className="geo-btn-secondary text-sm"
              disabled={loading}
              onClick={() => void onRetry()}
            >
              {loading ? '检测中…' : '重新检测'}
            </button>
          )}
          {onNavigate && (
            <button
              type="button"
              className="geo-btn-primary text-sm inline-flex items-center gap-1"
              onClick={() => {
                onClose();
                onNavigate('hermes_console', 'setup');
              }}
            >
              <Settings className="w-3.5 h-3.5" />
              打开本机 Hermes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
