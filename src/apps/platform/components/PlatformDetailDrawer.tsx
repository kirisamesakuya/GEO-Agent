import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import PlatformStatusTag from './PlatformStatusTag';
import type { PlatformStatusKind } from '../types';

interface Props {
  title: string;
  statusLabel?: string;
  statusKind?: PlatformStatusKind;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function PlatformDetailDrawer({
  title,
  statusLabel,
  statusKind,
  onClose,
  children,
  footer,
}: Props) {
  return (
    <aside className="flex w-full lg:w-[480px] shrink-0 flex-col border-l border-t lg:border-t-0 border-[var(--platform-border)] bg-white max-h-[50vh] lg:max-h-none">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--platform-border-subtle)] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--platform-text-title)]">{title}</h3>
          {statusLabel && (
            <div className="mt-2">
              <PlatformStatusTag label={statusLabel} kind={statusKind} />
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--platform-surface-subtle)]">
          <X className="h-4 w-4 text-[var(--platform-text-secondary)]" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <div className="border-t border-[var(--platform-border-subtle)] px-5 py-4">{footer}</div>
      )}
    </aside>
  );
}
