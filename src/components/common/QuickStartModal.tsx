import { X, ChevronRight, Sparkles } from 'lucide-react';
import type { ViewType } from '../../types';
import {
  QUICK_START_ENTRIES,
  readQuickStartLastEntry,
  saveQuickStartLastEntry,
  type QuickStartEntryId,
} from '../../lib/quick-start-nav';

interface Props {
  brandName: string;
  onClose: () => void;
  onNavigate: (view: ViewType, hint?: string) => void;
}

export default function QuickStartModal({ brandName, onClose, onNavigate }: Props) {
  const lastEntry = readQuickStartLastEntry();
  const needsBrand = !brandName || brandName === '__all__';

  const handlePick = (entry: (typeof QUICK_START_ENTRIES)[number]) => {
    if (needsBrand) return;
    saveQuickStartLastEntry(entry.id as QuickStartEntryId);
    onClose();
    onNavigate(entry.view, entry.hint);
  };

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="geo-modal max-w-lg relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg z-10"
          style={{ color: 'var(--neutral-text-03)' }}
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="geo-modal-body pt-2 space-y-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--neutral-text-01)' }}>
                快速发起
              </h3>
              <p className="text-xs text-[var(--neutral-text-03)] mt-1 leading-relaxed">
                选择功能起点，进入对应能力页。不会创建品牌或项目档案。
              </p>
              {!needsBrand ? (
                <p className="text-xs text-[var(--color-accent)] mt-2 font-medium">
                  当前品牌：{brandName}
                </p>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-2">
                  请先在顶栏选择具体品牌，再使用快速发起。
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {QUICK_START_ENTRIES.map((entry) => {
              const highlighted = lastEntry === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={needsBrand}
                  className={`w-full text-left border rounded-xl p-3 transition-colors flex items-center justify-between gap-3 ${
                    needsBrand
                      ? 'opacity-50 cursor-not-allowed border-[var(--color-border)]'
                      : highlighted
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/40 hover:border-[var(--color-accent)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}
                  onClick={() => handlePick(entry)}
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-sm block text-[var(--color-title)]">
                      {entry.title}
                      {highlighted && (
                        <span className="ml-2 text-[10px] font-normal text-[var(--color-accent)]">
                          上次使用
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] mt-0.5 block">
                      {entry.desc}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[var(--neutral-text-03)]" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
