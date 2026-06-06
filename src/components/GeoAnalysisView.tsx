import { useState } from 'react';
import type { ViewType } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import GeoReportHistoryView from './GeoReportHistoryView';
import GeoQuickStartView from './geo/GeoQuickStartView';
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

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-0 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[var(--color-title)]">GEO 分析</h2>
          <p className="text-xs mt-0.5 text-[var(--color-text-secondary)]">
            上传图片、文档或链接后，AI 先拆解检测方案；你确认范围后再提交 Hermes 执行。
          </p>
        </div>
        <GeoAnalysisTabs tab={pageTab} onTabChange={(t) => switchGeoTab(t)} />
      </div>

      <div className="shrink-0 px-6 pt-3 pb-0">
        <BrandScopeBar label="分析哪个品牌" brandName={brandName} onBrandChange={onBrandChange} allowAll />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {pageTab === 'smart_check' && (
          <GeoQuickStartView
            brandName={brandName}
            onNavigate={onNavigate}
            onOpenHistory={(id) => switchGeoTab('history', id)}
          />
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
  );
}
