import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import OverlayDrawer from './OverlayDrawer';

interface RightPreviewPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
  /** 固定宽度（px 或 css 值），默认 360px */
  panelWidth?: number | string;
  className?: string;
}

export default function RightPreviewPanel({
  open,
  onClose,
  title = '预计产物',
  children,
  footer,
  widthClass = '',
  panelWidth = 360,
  className = '',
}: RightPreviewPanelProps) {
  if (!open) return null;

  const width =
    panelWidth !== undefined
      ? typeof panelWidth === 'number'
        ? panelWidth
        : panelWidth
      : widthClass
        ? undefined
        : 360;

  return (
    <OverlayDrawer
      onClose={onClose}
      width={width ?? 360}
      className={className}
      panelClassName="border-l"
      panelStyle={{
        borderColor: 'var(--neutral-divider-02)',
        background: 'var(--color-bg-card)',
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <h3 className="text-sm font-semibold text-[var(--color-title)]">{title}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg)]" aria-label="关闭">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>
      {footer && (
        <div className="shrink-0 p-4 border-t border-[var(--color-border)]">{footer}</div>
      )}
    </OverlayDrawer>
  );
}
