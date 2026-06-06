import { X } from 'lucide-react';
import BrandClueStartFlow from '../onboarding/BrandClueStartFlow';
import { resolveBrandSwitcherLabel } from '../../lib/brand-scope';

interface Props {
  brandName: string;
  displayBrandName: string;
  needsBrandScope: boolean;
  onClose: () => void;
  onFlowComplete: (result: { brandName: string; extractTaskId: string; goal: string }) => void;
}

export default function QuickStartModal({
  brandName,
  displayBrandName,
  needsBrandScope,
  onClose,
  onFlowComplete,
}: Props) {
  if (needsBrandScope) {
    return (
      <div className="geo-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="geo-modal max-w-lg relative" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onClose} className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <div className="geo-modal-body">
            <p className="text-sm rounded-lg border px-3 py-2.5 geo-callout-warning">
              请先在页面顶部选择具体品牌（当前为「{resolveBrandSwitcherLabel(brandName)}」），再发起项目。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="geo-modal max-w-lg relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg z-10"
          style={{ color: 'var(--neutral-text-03)' }}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="geo-modal-body pt-2">
          <BrandClueStartFlow
            brandName={brandName !== '__all__' ? brandName : undefined}
            displayBrandName={displayBrandName}
            variant="modal"
            onCancel={onClose}
            onComplete={(result) => onFlowComplete(result)}
          />
        </div>
      </div>
    </div>
  );
}
