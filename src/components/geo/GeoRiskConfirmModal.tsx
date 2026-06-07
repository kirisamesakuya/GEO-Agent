import { ShieldAlert } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  detail: string;
  riskLevel?: 'medium' | 'high';
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function GeoRiskConfirmModal({
  open,
  title,
  detail,
  riskLevel = 'medium',
  confirmLabel = '我已了解风险，继续执行',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="geo-modal max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <div className="geo-modal-head">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{title}</h3>
              <p className="text-[10px] text-[var(--neutral-text-03)]">
                {riskLevel === 'high' ? '高风险动作' : '中风险动作'} · 需人工确认
              </p>
            </div>
          </div>
        </div>
        <div className="geo-modal-body space-y-4">
          <p className="text-sm text-[var(--neutral-text-02)] leading-relaxed">{detail}</p>
          <p className="text-[10px] text-[var(--neutral-text-03)]">
            确认后将记录到报告操作日志，并由本机 Hermes 执行；Web 端不会直接修改你的官网或发布内容。
          </p>
          <div className="flex gap-2 justify-end">
            <button type="button" className="geo-btn-secondary" disabled={loading} onClick={onCancel}>
              取消
            </button>
            <button type="button" className="geo-btn-primary" disabled={loading} onClick={onConfirm}>
              {loading ? '提交中…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
