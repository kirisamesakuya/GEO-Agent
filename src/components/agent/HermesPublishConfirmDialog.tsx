import { ShieldAlert } from 'lucide-react';

export type HermesPublishConfirmPayload = {
  articleCount: number;
  platformLabels: string[];
  accountLabel: string;
};

interface Props {
  open: boolean;
  payload: HermesPublishConfirmPayload | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function HermesPublishConfirmDialog({
  open,
  payload,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open || !payload) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/30"
        aria-label="关闭"
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-xl p-6 space-y-4"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--neutral-divider-02)' }}
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[var(--color-title)]">确认 Hermes 自动发布</h3>
            <p className="text-xs text-[var(--neutral-text-03)] mt-1">
              高风险动作：将由本机 Hermes 打开创作后台并提交内容，平台不会收到你的密码。
            </p>
          </div>
        </div>

        <ul className="text-xs space-y-1.5 rounded-lg bg-[var(--neutral-bg-03)] p-3">
          <li>
            <span className="text-[var(--neutral-text-03)]">发布篇数：</span>
            <span className="font-medium">{payload.articleCount} 篇</span>
          </li>
          <li>
            <span className="text-[var(--neutral-text-03)]">目标平台：</span>
            <span className="font-medium">{payload.platformLabels.join('、')}</span>
          </li>
          <li>
            <span className="text-[var(--neutral-text-03)]">发布账号：</span>
            <span className="font-medium">{payload.accountLabel}</span>
          </li>
        </ul>

        <p className="text-[10px] text-[var(--neutral-text-03)]">
          确认后将创建 Hermes 发布任务。若部分失败，可在运行日志查看截图与平台反馈，并改用手动发布。
        </p>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="geo-btn-secondary geo-btn-sm" disabled={loading} onClick={onCancel}>
            取消
          </button>
          <button type="button" className="geo-btn-primary geo-btn-sm" disabled={loading} onClick={onConfirm}>
            {loading ? '提交中…' : '我确认，开始发布'}
          </button>
        </div>
      </div>
    </>
  );
}
