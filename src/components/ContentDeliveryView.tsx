import type { ViewType } from '../types';import BrandIdentityRow from './common/BrandIdentityRow';
import ArticleDeliveryUnifiedView from './delivery/ArticleDeliveryUnifiedView';
import OrderDispatchManageView from './delivery/OrderDispatchManageView';
import OrderDeliveryView from './OrderDeliveryView';
import {
  parseContentDeliveryTabFromUrl,
  type ContentDeliveryTab,
} from '../lib/content-delivery-nav';
import { parseArticleDeliveryStatusFromUrl, parseArticleDeliveryOrderHint } from '../lib/article-delivery-unified';
import { parsePaidSourceDispatchStageFromUrl } from '../lib/paid-source-dispatch-filters';
import { parseTaskOrderIdFromHint } from '../lib/website-requirement-nav';
import QuoteCompareView from './paid-source/QuoteCompareView';
import ArticleDeliveryOrderDetailView from './delivery/ArticleDeliveryOrderDetailView';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialTab?: ContentDeliveryTab;
  initialProjectId?: string;
  viewHint?: string;
}

export default function ContentDeliveryView({
  brandName,
  onBrandChange,
  onNavigate,
  initialTab,
  viewHint,
}: Props) {
  const pageTab = initialTab ?? parseContentDeliveryTabFromUrl();  const articleStage = parseArticleDeliveryStatusFromUrl();
  const orderDispatchStage = parsePaidSourceDispatchStageFromUrl();
  const quoteOrderId = parseTaskOrderIdFromHint(viewHint);
  const execOrderId = parseArticleDeliveryOrderHint(viewHint);
  const showQuoteCompare = pageTab === 'order_manage' && Boolean(quoteOrderId);
  const showOrderExecDetail = pageTab === 'order_manage' && Boolean(execOrderId) && !showQuoteCompare;

  return (
    <div className="flex flex-col min-h-0">
      <div
        className="geo-page-tab-sticky shrink-0 px-6 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        <BrandIdentityRow brandName={brandName} onBrandChange={onBrandChange} allowAll />
      </div>
      <div className="flex flex-col min-w-0">
        {pageTab === 'order_manage' && showQuoteCompare && quoteOrderId && onNavigate && (
          <QuoteCompareView
            brandName={brandName}
            orderHint={`order:${quoteOrderId}`}
            onNavigate={onNavigate}
            embedded
          />
        )}
        {pageTab === 'order_manage' && showOrderExecDetail && execOrderId && onNavigate && (
          <ArticleDeliveryOrderDetailView
            orderId={execOrderId}
            onNavigate={onNavigate}
            detailContext="order_manage"
          />
        )}
        {pageTab === 'order_manage' && !showQuoteCompare && !showOrderExecDetail && (
          <OrderDispatchManageView
            brandName={brandName}
            onBrandChange={onBrandChange}
            onNavigate={onNavigate}
            initialStatusFilter={orderDispatchStage}
          />
        )}
        {pageTab === 'article' && (
          <ArticleDeliveryUnifiedView
            brandName={brandName}
            onBrandChange={onBrandChange}
            onNavigate={onNavigate}
            initialStatusFilter={articleStage}
          />
        )}
        {pageTab === 'website' && (
          <OrderDeliveryView
            brandName={brandName}
            onBrandChange={onBrandChange}
            initialMainTab="website"
            embeddedTab="website"
            pageTitle="网页需求"
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}
