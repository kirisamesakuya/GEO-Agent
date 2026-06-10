import type { CSSProperties, ReactNode } from 'react';

interface OverlayDrawerProps {
  onClose: () => void;
  children: ReactNode;
  /** 面板宽度，默认 480px */
  width?: number | string;
  className?: string;
  panelClassName?: string;
  closeLabel?: string;
  panelStyle?: CSSProperties;
}

export default function OverlayDrawer({
  onClose,
  children,
  width = 480,
  className = '',
  panelClassName = '',
  closeLabel = '关闭',
  panelStyle,
}: OverlayDrawerProps) {
  const resolvedWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className={className}>
      <button
        type="button"
        className="geo-overlay-drawer-backdrop"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        className={`geo-overlay-drawer-panel ${panelClassName}`}
        style={{ width: resolvedWidth, maxWidth: '100vw', ...panelStyle }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
