import { X } from 'lucide-react';
import type { ViewType } from '../../types';
import BrandClueStartFlow from '../onboarding/BrandClueStartFlow';

interface Props {
  onClose: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onFlowComplete: (result: {
    brandName: string;
    extractTaskId: string;
    goal: string;
    clue?: {
      brandUrl?: string;
      website?: string;
      socialLink?: string;
      description?: string;
    };
  }) => void;
}

export default function QuickStartModal({ onClose, onNavigate, onFlowComplete }: Props) {
  const handleNavigate = (view: ViewType, hint?: string) => {
    onClose();
    onNavigate?.(view, hint);
  };

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
            headline="快速发起项目"
            variant="modal"
            onNavigate={handleNavigate}
            onCancel={onClose}
            onComplete={(result) => onFlowComplete(result)}
          />
        </div>
      </div>
    </div>
  );
}
