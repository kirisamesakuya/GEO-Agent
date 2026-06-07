import WebsiteLeadIntakeForm from './WebsiteLeadIntakeForm';

interface Props {
  brandName: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function WebPageRequirementSubmitModal({
  brandName,
  open,
  onClose,
  onSubmitted,
}: Props) {
  if (!open) return null;

  return (
    <div className="geo-modal-backdrop" onClick={onClose}>
      <div className="geo-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="geo-modal-head">
          <h3 className="font-bold text-sm">提交网页需求</h3>
          <p className="text-xs text-[var(--neutral-text-03)] mt-1">
            一期仅收集页面优化诉求与联系方式，由后台跟进处理。
          </p>
        </div>
        <div className="geo-modal-body">
          <div className="mb-3">
            <label className="geo-label">品牌</label>
            <input className="geo-input w-full mt-1 text-sm" value={brandName} disabled />
          </div>
          <WebsiteLeadIntakeForm
            brandName={brandName}
            onSuccess={() => {
              onSubmitted();
              onClose();
            }}
          />
        </div>
        <div className="geo-modal-foot flex justify-end">
          <button type="button" className="geo-btn-secondary text-sm" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
