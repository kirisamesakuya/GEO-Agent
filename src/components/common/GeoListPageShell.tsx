import type { ReactNode } from 'react';
import BrandScopeBar from './BrandScopeBar';

export interface GeoListStatusTab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  brandLabel: string;
  brandName: string;
  onBrandChange: (name: string) => void;
  allowAllBrands?: boolean;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  sectionTabs?: Array<{ id: string; label: string }>;
  activeSection?: string;
  onSectionChange?: (id: string) => void;
  statusTabs?: GeoListStatusTab[];
  activeStatus?: string;
  onStatusChange?: (id: string) => void;
  toolbar?: ReactNode;
  children: ReactNode;
}

export default function GeoListPageShell({
  brandLabel,
  brandName,
  onBrandChange,
  allowAllBrands,
  title,
  description,
  primaryAction,
  secondaryActions,
  sectionTabs,
  activeSection,
  onSectionChange,
  statusTabs,
  activeStatus,
  onStatusChange,
  toolbar,
  children,
}: Props) {
  return (
    <div className="geo-page-content flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 space-y-4 px-6 pt-4">
        <BrandScopeBar
          label={brandLabel}
          brandName={brandName}
          onBrandChange={onBrandChange}
          allowAll={allowAllBrands}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--color-title)]">{title}</h2>
            {description && (
              <p className="text-xs text-[var(--neutral-text-03)] mt-0.5 max-w-2xl">{description}</p>
            )}
          </div>
          {(primaryAction || secondaryActions) && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {secondaryActions}
              {primaryAction}
            </div>
          )}
        </div>

        {sectionTabs && sectionTabs.length > 0 && (
          <div
            className="flex gap-1 flex-wrap border-b -mb-px"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSectionChange?.(tab.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  activeSection === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-title)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {statusTabs && statusTabs.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusChange?.(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeStatus === tab.id
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                    : 'text-[var(--neutral-text-02)] hover:bg-[var(--neutral-bg-03)]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="tabular-nums ml-1">{tab.count}</span>
                )}
              </button>
            ))}
            {toolbar && <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 pt-3">{children}</div>
    </div>
  );
}
