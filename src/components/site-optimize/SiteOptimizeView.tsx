import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import AgentInputCard from '../common/AgentInputCard';
import PageHeaderWithBrand from '../common/PageHeaderWithBrand';
import WebsiteLeadIntakeForm from '../delivery/WebsiteLeadIntakeForm';
import WebsiteRequestsHistoryView, { type WebsiteRequest } from '../WebsiteRequestsHistoryView';
import { ArrowRight, History, ChevronRight } from 'lucide-react';
import { resolveWebsiteLeadFields } from '../../../lib/website-lead-intake';
import { consumeGeoAssetWebsitePrefill } from '../../lib/geo-asset-website-prefill';
import {
  SITE_OPTIMIZE_DESCRIPTION,
  SITE_OPTIMIZE_NOTE,
  SITE_OPTIMIZE_PAGE_TYPES,
  SITE_OPTIMIZE_TITLE,
} from '../../../lib/website-order-flow';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate: (view: ViewType, hint?: string) => void;
}

type PageMode = 'create' | 'history';

function syncSiteOptimizeHistoryUrl(showHistory: boolean) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'site_optimize');
  if (showHistory) url.searchParams.set('websiteHistory', '1');
  else url.searchParams.delete('websiteHistory');
  window.history.pushState({}, '', url);
}

export default function SiteOptimizeView({ brandName, onBrandChange, onNavigate }: Props) {
  const [pageMode, setPageMode] = useState<PageMode>(() =>
    new URLSearchParams(window.location.search).get('websiteHistory') === '1' ? 'history' : 'create'
  );
  const [draftKey, setDraftKey] = useState(0);
  const [prefill, setPrefill] = useState<ReturnType<typeof resolveWebsiteLeadFields> | undefined>();

  useEffect(() => {
    const geoPrefill = consumeGeoAssetWebsitePrefill(brandName);
    if (geoPrefill) {
      setPrefill(geoPrefill);
      setDraftKey((k) => k + 1);
      return;
    }
    if (!brandName || brandName === '__all__') {
      setPrefill(undefined);
      return;
    }
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (!profile?.website) return;
        setPrefill((prev) => ({
          ...prev,
          referenceUrl: prev?.referenceUrl?.trim() || (profile.website as string),
        }));
        setDraftKey((k) => k + 1);
      })
      .catch(() => {});
  }, [brandName]);

  const openHistory = () => {
    setPageMode('history');
    syncSiteOptimizeHistoryUrl(true);
  };

  const closeHistory = () => {
    setPageMode('create');
    syncSiteOptimizeHistoryUrl(false);
  };

  const loadRequest = (req: WebsiteRequest) => {
    setPrefill(resolveWebsiteLeadFields(req));
    setDraftKey((k) => k + 1);
    setPageMode('create');
    syncSiteOptimizeHistoryUrl(false);
  };

  if (pageMode === 'history') {
    return (
      <WebsiteRequestsHistoryView brandName={brandName} onBack={closeHistory} onSelect={loadRequest} />
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 px-6 pt-4 pb-3 geo-page-content-section">
        <PageHeaderWithBrand
          title="自有网站优化"
          description="针对已有官网/品牌站，由 Hermes 输出页面优化建议，品牌确认后提交工程师处理。"
          brandName={brandName}
          onBrandChange={onBrandChange}
          actions={
            <button
              type="button"
              className="geo-btn-secondary geo-btn-xs flex items-center gap-1 shrink-0"
              onClick={openHistory}
            >
              <History className="w-3.5 h-3.5" />
              历史需求
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          }
        />
      </div>

      <div className="geo-page-content max-w-2xl pb-8 space-y-4">
        <AgentInputCard title={SITE_OPTIMIZE_TITLE} description={SITE_OPTIMIZE_DESCRIPTION}>
          <WebsiteLeadIntakeForm
            key={draftKey}
            brandName={brandName}
            initialValues={prefill}
            pageTypes={SITE_OPTIMIZE_PAGE_TYPES}
            introNote={SITE_OPTIMIZE_NOTE}
            requireReferenceUrl
            submitLabel="提交优化需求"
            onSuccess={() => onNavigate('content_delivery', 'website')}
          />
        </AgentInputCard>

        <div className="geo-card p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--neutral-text-03)]">
            也可从 GEO 分析导入网站诊断结果，自动带入链接与优化摘要
          </p>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1"
            onClick={() => onNavigate('geo_analysis')}
          >
            从 GEO 分析开始
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
