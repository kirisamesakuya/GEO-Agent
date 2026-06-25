import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, PanelRight, X } from 'lucide-react';
import OverlayDrawer from '../common/OverlayDrawer';

export function ArticleDeliveryDetailShell({
  onBack,
  backLabel = '返回文章交付',
  layout = 'drawer',
  actions,
  title,
  badges,
  metaLine,
  mainContent,
  sidebar,
  sidebarTitle = '交付信息',
}: {
  onBack: () => void;
  backLabel?: string;
  /** drawer：侧滑交付信息；inline：主内容 + 侧栏同屏（发单管理执行详情） */
  layout?: 'drawer' | 'inline';
  actions?: ReactNode;
  title: string;
  badges: ReactNode;
  metaLine: string;
  mainContent: ReactNode;
  sidebar: ReactNode;
  sidebarTitle?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (layout === 'drawer' && sidebar) setSidebarOpen(true);
  }, [sidebar, layout]);

  const headerBlock = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <button
          type="button"
          className="geo-btn-secondary geo-btn-sm flex items-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        <div className="flex flex-wrap gap-2">
          {layout === 'drawer' && sidebar ? (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelRight className="w-4 h-4" />
              {sidebarTitle}
            </button>
          ) : null}
          {actions}
        </div>
      </div>

      <div className="geo-card p-5 mb-4 space-y-3">
        <h1 className="text-lg font-bold text-[var(--color-title)]">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
        <p className="text-xs text-[var(--neutral-text-03)]">{metaLine}</p>
      </div>
    </>
  );

  if (layout === 'inline') {
    return (
      <div className="px-6 pb-8">
        {headerBlock}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 geo-card p-5 min-h-[320px]">{mainContent}</div>
          {sidebar ? <div className="space-y-4">{sidebar}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="geo-page-content pb-8">
      {headerBlock}

      <div className="geo-card p-5 min-h-[320px]">{mainContent}</div>

      {sidebarOpen && sidebar ? (
        <OverlayDrawer
          onClose={() => setSidebarOpen(false)}
          width={360}
          panelClassName="border-l"
          panelStyle={{ background: 'var(--color-bg-card)', borderColor: 'var(--neutral-divider-02)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <h3 className="text-sm font-semibold text-[var(--color-title)]">{sidebarTitle}</h3>
            <button type="button" onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-[var(--color-bg)]" aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">{sidebar}</div>
        </OverlayDrawer>
      ) : null}
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
