import type { ReactNode } from 'react';

interface RightPreviewPanelProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
  /** 固定宽度（px 或 css 值），默认 --layout-panel-width */
  panelWidth?: number | string;
  className?: string;
}

export default function RightPreviewPanel({
  title = '预计产物',
  children,
  footer,
  widthClass = '',
  panelWidth,
  className = '',
}: RightPreviewPanelProps) {
  const width =
    panelWidth !== undefined
      ? typeof panelWidth === 'number'
        ? `${panelWidth}px`
        : panelWidth
      : widthClass
        ? undefined
        : 'var(--layout-panel-width)';

  return (
    <aside
      className={`shrink-0 border-l flex flex-col h-full min-h-0 ${widthClass} ${className}`}
      style={{
        width,
        borderColor: 'var(--neutral-divider-02)',
        background: 'var(--color-bg-card)',
      }}
    >
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-title)]">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
      {footer && (
        <div className="p-4 border-t border-[var(--color-border)]">{footer}</div>
      )}
    </aside>
  );
}
