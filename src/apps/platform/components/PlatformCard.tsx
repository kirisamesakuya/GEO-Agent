import type { ReactNode } from 'react';

interface Props {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PlatformCard({ title, action, children, className = '' }: Props) {
  return (
    <section className={`platform-card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-bold text-[var(--platform-text-title)]">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
