import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

export default function PlatformFilterBar({ children, onReset }: Props) {
  return (
    <div className="platform-filter-bar">
      {children}
      {onReset && (
        <button type="button" onClick={onReset} className="platform-filter-input text-[var(--platform-text-secondary)]">
          重置
        </button>
      )}
    </div>
  );
}
