import { useState } from 'react';
import AgentInputCard from './common/AgentInputCard';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import WebsiteLeadIntakeForm from './delivery/WebsiteLeadIntakeForm';
import WebsiteRequestsHistoryView, { type WebsiteRequest } from './WebsiteRequestsHistoryView';
import { History, ChevronRight } from 'lucide-react';
import type { ViewType } from '../types';
import { resolveWebsiteLeadFields } from '../../lib/website-lead-intake';
import { consumeGeoAssetWebsitePrefill } from '../lib/geo-asset-website-prefill';
import { WEBSITE_PHASE1_DESCRIPTION, WEBSITE_PHASE1_TITLE } from '../../lib/website-order-flow';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  /** 嵌入「发布任务 · 网页改装」时隐藏品牌栏并改为纵向布局 */
  embedded?: boolean;
}

type PageMode = 'create' | 'history';

function syncWebsiteHistoryUrl(showHistory: boolean, embedded: boolean) {
  const url = new URL(window.location.href);
  if (!embedded) url.searchParams.set('view', 'create_website');
  if (showHistory) url.searchParams.set('websiteHistory', '1');
  else url.searchParams.delete('websiteHistory');
  window.history.pushState({}, '', url);
}

export default function CreateWebsiteView({
  brandName,
  onBrandChange,
  onNavigate,
  embedded = false,
}: Props) {
  const [pageMode, setPageMode] = useState<PageMode>(() =>
    new URLSearchParams(window.location.search).get('websiteHistory') === '1' ? 'history' : 'create'
  );
  const [draftKey, setDraftKey] = useState(0);
  const [prefill, setPrefill] = useState<ReturnType<typeof resolveWebsiteLeadFields> | undefined>(
    () => consumeGeoAssetWebsitePrefill(brandName)
  );

  const openHistory = () => {
    setPageMode('history');
    syncWebsiteHistoryUrl(true, embedded);
  };

  const closeHistory = () => {
    setPageMode('create');
    syncWebsiteHistoryUrl(false, embedded);
  };

  const loadRequest = (req: WebsiteRequest) => {
    setPrefill(resolveWebsiteLeadFields(req));
    setDraftKey((k) => k + 1);
    closeHistory();
  };

  if (pageMode === 'history') {
    return (
      <WebsiteRequestsHistoryView brandName={brandName} onBack={closeHistory} onSelect={loadRequest} />
    );
  }

  const historyButton = (
    <button
      type="button"
      className="geo-btn-secondary geo-btn-xs flex items-center gap-1 shrink-0"
      onClick={openHistory}
    >
      <History className="w-3.5 h-3.5" />
      历史需求
      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
    </button>
  );

  const formCard = (
    <AgentInputCard
      title={embedded ? WEBSITE_PHASE1_TITLE : '创建网页需求'}
      description={WEBSITE_PHASE1_DESCRIPTION}
    >
      <WebsiteLeadIntakeForm
        key={draftKey}
        brandName={brandName}
        initialValues={prefill}
        onSuccess={() => onNavigate?.('content_delivery', 'website')}
      />
    </AgentInputCard>
  );

  if (embedded) {
    return (
      <div className="geo-page-content space-y-4 max-w-3xl">
        <div className="flex justify-end">{historyButton}</div>
        <div className="geo-card p-4">{formCard}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 px-6 pt-4 pb-3 geo-page-content-section">
        <PageHeaderWithBrand
          title="创建网页需求"
          brandName={brandName}
          onBrandChange={onBrandChange}
          actions={historyButton}
        />
      </div>
      <div className="geo-page-content max-w-2xl pb-8">
        {formCard}
      </div>
    </div>
  );
}
