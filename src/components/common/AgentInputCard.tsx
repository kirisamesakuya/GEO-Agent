import type { ReactNode } from 'react';

interface AgentInputCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function AgentInputCard({
  title,
  description,
  children,
  footer,
  className = '',
}: AgentInputCardProps) {
  return (
    <section className={`geo-card p-4 sm:p-6 flex flex-col gap-4 ${className}`}>
      <header>
        <h2 className="text-base font-semibold text-[var(--color-title)]">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{description}</p>
        )}
      </header>
      <div className="flex-1">{children}</div>
      {footer && (
        <footer className="pt-4 border-t border-[var(--color-border)] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          {footer}
        </footer>
      )}
    </section>
  );
}
