import type { ReactNode } from 'react';
import PageHeaderWithBrand from './PageHeaderWithBrand';

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
  hidePageHeader?: boolean;
  children: ReactNode;
}

export default function GeoListPageShell({
  brandLabel: _brandLabel,
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
  hidePageHeader,
  children,
}: Props) {
  return (
    <div className="geo-page-content geo-page-content--flush flex min-h-0 flex-col">
      <div className={`shrink-0 space-y-4 geo-page-content-section ${hidePageHeader ? 'pt-2' : 'pt-4'}`}>
        {!hidePageHeader && (
        <PageHeaderWithBrand
          title={title}
          description={description}
          brandName={brandName}
          onBrandChange={onBrandChange}
          allowAll={allowAllBrands}
          actions={
            (primaryAction || secondaryActions) ? (
              <>
                {secondaryActions}
                {primaryAction}
              </>
            ) : undefined
          }
        />
        )}

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
            className="flex flex-col gap-2 rounded-lg border bg-white px-3 py-2"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusChange?.(tab.id)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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
            </div>
            {toolbar && (
              <div
                className="flex min-w-0 flex-wrap items-center gap-2 border-t pt-2"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              >
                {toolbar}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 geo-page-content-section pb-[var(--geo-content-block)] pt-3">
        {children}
      </div>
    </div>
  );
}
