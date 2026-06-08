import type { ReactNode } from 'react';

type ActionVariant = 'primary' | 'danger' | 'default';

interface ActionProps {
  label: string;
  onClick: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
}

/** 表格行内操作按钮，自动阻止触发行点击 */
export function PlatformTableAction({ label, onClick, variant = 'default', disabled }: ActionProps) {
  return (
    <button
      type="button"
      className={`platform-table-action platform-table-action--${variant}`}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}

export function PlatformTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="platform-table-actions" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
