import { useEffect, useState } from 'react';
import type { ViewType } from '../types';
import BrandSwitcher from './common/BrandSwitcher';
import ArticleDeliveryUnifiedView from './delivery/ArticleDeliveryUnifiedView';
import OrderDeliveryView from './OrderDeliveryView';
import {
  CONTENT_DELIVERY_TABS,
  parseContentDeliveryTabFromUrl,
  syncContentDeliveryUrl,
  type ContentDeliveryTab,
} from '../lib/content-delivery-nav';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialTab?: ContentDeliveryTab;
  initialProjectId?: string;
}

function ContentDeliveryTabs({
  tab,
  onTabChange,
}: {
  tab: ContentDeliveryTab;
  onTabChange: (t: ContentDeliveryTab) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap border-b -mb-px" style={{ borderColor: 'var(--neutral-divider-02)' }}>
      {CONTENT_DELIVERY_TABS.map((t) => (
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

export default function ContentDeliveryView({
  brandName,
  onBrandChange,
  onNavigate,
  initialTab,
}: Props) {
  const [pageTab, setPageTab] = useState<ContentDeliveryTab>(
    initialTab ?? parseContentDeliveryTabFromUrl()
  );

  useEffect(() => {
    if (initialTab) setPageTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: ContentDeliveryTab) => {
    setPageTab(tab);
    syncContentDeliveryUrl(tab);
  };

  const activeMeta = CONTENT_DELIVERY_TABS.find((t) => t.id === pageTab);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-0 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-bold text-[var(--color-title)]">内容交付</h2>
            <BrandSwitcher variant="scope" brandName={brandName} onBrandChange={onBrandChange} allowAll />
          </div>
          {activeMeta && (
            <p className="text-[11px] mt-1 text-[var(--neutral-text-03)]">{activeMeta.desc}</p>
          )}
        </div>
        <ContentDeliveryTabs tab={pageTab} onTabChange={switchTab} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {pageTab === 'article' && (
          <ArticleDeliveryUnifiedView
            brandName={brandName}
            onBrandChange={onBrandChange}
            onNavigate={onNavigate}
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
