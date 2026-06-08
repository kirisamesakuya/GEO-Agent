import type { ReactNode } from 'react';

interface AgentInputCardProps {
  title: string;
  description?: string;
  /** 标题左侧区域（如模式切换） */
  headerLeading?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function AgentInputCard({
  title,
  description,
  headerLeading,
  children,
  footer,
  className = '',
}: AgentInputCardProps) {
  return (
    <section className={`geo-card p-4 sm:p-6 flex flex-col gap-4 ${className}`}>
      <header>
        <div className="flex items-stretch gap-3">
          {headerLeading && (
            <div className="flex items-stretch shrink-0">{headerLeading}</div>
          )}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h2 className="text-base font-semibold leading-6 text-[var(--color-title)]">{title}</h2>
            {description && (
              <p className="text-sm leading-5 text-[var(--color-text-secondary)] mt-1">{description}</p>
            )}
          </div>
        </div>
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
