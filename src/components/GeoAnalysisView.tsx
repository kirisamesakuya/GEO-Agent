import { useState } from 'react';
import type { ViewType } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import GeoReportHistoryView from './GeoReportHistoryView';
import GeoQuickStartView from './geo/GeoQuickStartView';
import GeoAuditView from './geo/GeoAuditView';
import GeoAssetsView from './geo/GeoAssetsView';
import HermesReadinessPanel from './geo/HermesReadinessPanel';
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
          className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
            tab === t.id
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-title)]'
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

  const effectiveBrand = brandName === '__all__' ? '' : brandName;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-0 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[var(--color-title)]">GEO 分析</h2>
          <p className="text-xs mt-0.5 text-[var(--color-text-secondary)]">
            首次体检、专业审计与资产生成均由本机 Hermes 执行；Web 端只负责任务编排与报告展示。
          </p>
        </div>
        <GeoAnalysisTabs tab={pageTab} onTabChange={(t) => switchGeoTab(t)} />
      </div>

      <div className="shrink-0 px-6 pt-3 pb-0 space-y-3">
        <BrandScopeBar label="分析哪个品牌" brandName={brandName} onBrandChange={onBrandChange} allowAll />
        {effectiveBrand && pageTab !== 'history' && (
          <HermesReadinessPanel brandName={effectiveBrand} compact onNavigate={onNavigate} />
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {pageTab === 'smart_check' && (
          <GeoQuickStartView
            brandName={brandName}
            onNavigate={onNavigate}
            onOpenHistory={(id) => switchGeoTab('history', id)}
          />
        )}
        {pageTab === 'audit' && (
          <GeoAuditView
            brandName={brandName}
            onNavigate={onNavigate}
            onOpenHistory={(id) => switchGeoTab('history', id)}
          />
        )}
        {pageTab === 'assets' && <GeoAssetsView brandName={brandName} onNavigate={onNavigate} />}
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
  );
}
