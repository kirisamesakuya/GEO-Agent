import type { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';

export function ArticleDeliveryDetailShell({
  onBack,
  backLabel = '返回文章交付',
  actions,
  title,
  badges,
  metaLine,
  mainContent,
  sidebar,
}: {
  onBack: () => void;
  backLabel?: string;
  actions?: ReactNode;
  title: string;
  badges: ReactNode;
  metaLine: string;
  mainContent: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="geo-page-content h-full overflow-y-auto pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <button
          type="button"
          className="geo-btn-secondary geo-btn-sm flex items-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="geo-card p-5 mb-4 space-y-3">
        <h1 className="text-lg font-bold text-[var(--color-title)]">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
        <p className="text-xs text-[var(--neutral-text-03)]">{metaLine}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="geo-card p-5 min-h-[320px]">{mainContent}</div>
        <div className="space-y-4">{sidebar}</div>
      </div>
    </div>
  );
}

export function ArticleDeliveryDetailPanel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`geo-card p-4 space-y-3 ${className}`}>
      <h2 className="text-sm font-semibold text-[var(--color-title)]">{title}</h2>
      {children}
    </div>
  );
}

export function ArticleDeliveryMainSection({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        <h2 className="text-sm font-semibold text-[var(--color-title)]">{title}</h2>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </>
  );
}

export function ArticleDeliveryChecklist({
  items,
}: {
  items: Array<{ label: string; done: boolean }>;
}) {
  return (
    <ul className="space-y-2 text-xs">
      {items.map((c) => (
        <li key={c.label} className="flex items-center gap-2">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full ${
              c.done
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-03)]'
            }`}
          >
            {c.done ? <Check className="w-3 h-3" /> : null}
          </span>
          {c.label}
        </li>
      ))}
    </ul>
  );
}

export type DeliveryLogStep = { label: string; time: string; done: boolean };

export function ArticleDeliveryLogTimeline({ steps }: { steps: DeliveryLogStep[] }) {
  return (
    <ol className="space-y-3 text-xs">
      {steps.map((step, i) => (
        <li key={step.label} className="flex gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
              step.done
                ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                : 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-03)]'
            }`}
          >
            {i + 1}
          </span>
          <div>
            <p className="font-medium text-[var(--neutral-text-01)]">{step.label}</p>
            <p className="text-[var(--neutral-text-03)] tabular-nums">{step.time}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function platformBadgeClass(platform: string): string {
  if (/小红书|red/i.test(platform)) return 'bg-red-50 text-red-700';
  if (/知乎|zhihu/i.test(platform)) return 'bg-blue-50 text-blue-700';
  if (/公众号|微信/i.test(platform)) return 'bg-emerald-50 text-emerald-700';
  return 'bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]';
}
