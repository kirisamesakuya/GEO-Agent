interface Props {
  open: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  loading?: boolean;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function OrderRevisionRequestDialog({
  open,
  title = '要求返修',
  description = '请填写返修需求，提交后将通知接单方并按你的要求重新交付。',
  placeholder = '例如：标题需体现品牌名；发布链接截图不清晰，请重新上传；正文需补充 FAQ 段落…',
  confirmLabel = '发送返修要求',
  loading = false,
  value,
  onChange,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="order-revision-dialog-title">
      <div className="geo-modal max-w-lg">
        <div className="geo-modal-head">
          <h3 id="order-revision-dialog-title" className="text-base font-bold text-[var(--color-title)]">
            {title}
          </h3>
          {description ? (
            <p className="text-xs text-[var(--neutral-text-03)] mt-1 leading-relaxed">{description}</p>
          ) : null}
        </div>
        <div className="geo-modal-body space-y-2">
          <label className="text-xs font-medium text-[var(--neutral-text-02)]" htmlFor="order-revision-reason">
            返修需求
          </label>
          <textarea
            id="order-revision-reason"
            className="geo-input w-full min-h-[140px] text-sm leading-relaxed"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        <div className="geo-modal-foot">
          <button type="button" className="geo-btn-secondary geo-btn-sm" disabled={loading} onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm"
            disabled={loading || !value.trim()}
            onClick={onConfirm}
          >
            {loading ? '发送中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
