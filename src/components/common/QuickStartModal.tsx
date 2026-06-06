import { Sparkles, X } from 'lucide-react';
import type { ViewType } from '../../types';
import { resolveBrandSwitcherLabel } from '../../lib/brand-scope';
import {
  QUICK_START_ENTRIES,
  readQuickStartLastEntry,
  saveQuickStartLastEntry,
  type QuickStartEntryId,
} from '../../lib/quick-start-nav';

interface Props {
  brandName: string;
  displayBrandName: string;
  needsBrandScope: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType, hint?: string) => void;
}

export default function QuickStartModal({
  brandName,
  displayBrandName,
  needsBrandScope,
  onClose,
  onNavigate,
}: Props) {
  const lastEntryId = readQuickStartLastEntry();

  const handleSelect = (id: QuickStartEntryId, view: ViewType, hint?: string) => {
    if (needsBrandScope) return;
    saveQuickStartLastEntry(id);
    onNavigate(view, hint);
  };

  return (
    <div
      className="geo-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-modal-title"
      onClick={onClose}
    >
      <div className="geo-modal max-w-lg relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg"
          style={{ color: 'var(--neutral-text-03)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="geo-modal-head">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="new-task-modal-title" className="font-bold text-sm" style={{ color: 'var(--neutral-text-01)' }}>
                快速发起项目
              </h3>
              <span className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
                选择起点进入对应功能，不会创建单独的项目档案
              </span>
            </div>
          </div>
        </div>

        <div className="geo-modal-body">
          {needsBrandScope ? (
            <p className="text-sm mb-4 rounded-lg border px-3 py-2.5 geo-callout-warning">
              请先在页面顶部或各功能页的品牌筛选中选择具体品牌（当前为「
              {resolveBrandSwitcherLabel(brandName)}」），再选择起点。
            </p>
          ) : (
            <p className="text-sm mb-4" style={{ color: 'var(--neutral-text-02)' }}>
              为「{displayBrandName}」选择下一步要做的功能：
            </p>
          )}

          <div className="space-y-3">
            {QUICK_START_ENTRIES.map((item) => {
              const isLast = lastEntryId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={needsBrandScope}
                  onClick={() => handleSelect(item.id, item.view, item.hint)}
                  className={`w-full text-left border rounded-xl p-3.5 transition-colors ${
                    needsBrandScope
                      ? 'opacity-50 cursor-not-allowed border-[var(--color-border)]'
                      : 'hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] border-[var(--color-border)]'
                  } ${isLast && !needsBrandScope ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent-light)]/40' : ''}`}
                >
                  <span className="font-semibold text-sm text-[var(--color-title)] block">
                    {item.title}
                    {isLast && !needsBrandScope && (
                      <span className="ml-2 text-[10px] font-normal text-[var(--color-accent)]">上次使用</span>
                    )}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{item.desc}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] mt-4 text-[var(--neutral-text-03)]">
            进度与结果请在 GEO 分析、文章结果、任务交付、排名监控中分别查看，无需单独项目工作台。
          </p>
        </div>
      </div>
    </div>
  );
}
