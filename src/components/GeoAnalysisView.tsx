import { useState } from 'react';
import type { ViewType } from '../types';
import BrandSwitcher from './common/BrandSwitcher';
import GeoReportHistoryView from './GeoReportHistoryView';
import GeoQuickStartView from './geo/GeoQuickStartView';
import GeoAssetsView from './geo/GeoAssetsView';
import { HermesSubmitGuardProvider } from './hermes/HermesSubmitGuard';
import {
  type GeoAnalysisTab,
  GEO_ANALYSIS_TABS,
  parseGeoAnalysisTabFromUrl,
  parseGeoReportIdFromHistoryUrl,
} from '../lib/geo-analysis-nav';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

function GeoAnalysisTabs({
  tab,
  onTabChange,
}: {
  tab: GeoAnalysisTab;
  onTabChange: (t: GeoAnalysisTab) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap border-b -mb-px" style={{ borderColor: 'var(--neutral-divider-02)' }}>
      {GEO_ANALYSIS_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTabChange(t.id)}
          className={`px-4 py-2 text-xs border-b-2 -mb-px transition-colors ${
            tab === t.id
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
              : 'border-transparent text-[var(--color-text-secondary)] font-medium hover:text-[var(--color-title)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function GeoAnalysisView({ brandName, onBrandChange, onNavigate }: Props) {
  const [pageTab, setPageTab] = useState<GeoAnalysisTab>(() => parseGeoAnalysisTabFromUrl());
  const [historyReportId, setHistoryReportId] = useState<string | undefined>(
    () => parseGeoReportIdFromHistoryUrl() ?? undefined
  );

  const switchGeoTab = (tab: GeoAnalysisTab, reportId?: string) => {
    setPageTab(tab);
    if (reportId) setHistoryReportId(reportId);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'geo_analysis');
    url.searchParams.set('geoTab', tab);
    if (tab === 'history' && reportId) url.searchParams.set('reportId', reportId);
    else url.searchParams.delete('reportId');
    window.history.replaceState({}, '', url);
  };

  return (
    <HermesSubmitGuardProvider onNavigate={onNavigate}>
      <div className="flex flex-col min-h-0">
        <div
          className="geo-page-tab-sticky shrink-0 px-6 pt-4 pb-0 border-b"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
        >
          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-sm font-bold text-[var(--color-title)]">GEO 分析</h2>
              <BrandSwitcher
                variant="scope"
                brandName={brandName}
                onBrandChange={onBrandChange}
                allowAll
              />
            </div>
          </div>
          <GeoAnalysisTabs tab={pageTab} onTabChange={(t) => switchGeoTab(t)} />
        </div>

        <div className="flex flex-col min-w-0">
          {pageTab === 'smart_check' && (
            <GeoQuickStartView
              brandName={brandName}
              onNavigate={onNavigate}
              onOpenHistory={(id) => switchGeoTab('history', id)}
            />
          )}
          {pageTab === 'assets' && (
            <GeoAssetsView brandName={brandName} onNavigate={onNavigate} />
          )}
          {pageTab === 'history' && (
            <GeoReportHistoryView
              brandName={brandName}
              onBrandChange={onBrandChange}
              onNavigate={onNavigate}
              initialReportId={historyReportId ?? parseGeoReportIdFromHistoryUrl() ?? undefined}
              embedded
            />
          )}
        </div>
      </div>
    </HermesSubmitGuardProvider>
  );
}
