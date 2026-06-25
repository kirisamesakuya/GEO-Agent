import { useEffect, useState } from 'react';
import type { ViewType } from '../types';
import BrandSwitcher from './common/BrandSwitcher';
import DeliveryPlanView from './DeliveryPlanView';
import {
  type CreateOrderMode,
  CUSTOM_PUBLISH_ENABLED,
  VISIBLE_CREATE_ORDER_MODES,
  parseCreateOrderModeFromUrl,
  parseGeoReportIdFromUrl,
  parseGeoReportIdFromHint,
  parseCampaignPlanIdFromHint,
  parseCampaignPlanIdFromUrl,
  resolveCustomTaskKind,
  isWebsiteOrderContext,
} from '../lib/create-order-nav';
import CustomOrderView from './CustomOrderView';
import { resolveIndexingGapHint } from '../lib/article-effect-nav';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  initialMode?: CreateOrderMode;
  initialGeoReportId?: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  viewHint?: string;
}

export default function CreateOrderView({
  brandName,
  onBrandChange,
  initialMode,
  initialGeoReportId,
  onNavigate,
  viewHint,
}: Props) {
  const geoReportId = initialGeoReportId ?? parseGeoReportIdFromUrl() ?? undefined;
  const campaignPlanId =
    parseCampaignPlanIdFromHint(viewHint) ?? parseCampaignPlanIdFromUrl() ?? undefined;
  const [mode, setMode] = useState<CreateOrderMode>(
    () => initialMode ?? parseCreateOrderModeFromUrl() ?? 'ai'
  );
  const websiteFlow =
    CUSTOM_PUBLISH_ENABLED && (resolveCustomTaskKind(viewHint) === 'website' || isWebsiteOrderContext(viewHint));
  const paidQuoteMode = !websiteFlow;
  const [taskKind, setTaskKind] = useState(() => resolveCustomTaskKind(viewHint));

  useEffect(() => {
    if (!CUSTOM_PUBLISH_ENABLED) {
      setMode('ai');
      return;
    }
    if (websiteFlow) {
      setMode('custom');
      return;
    }
    if (initialMode) setMode(initialMode);
  }, [initialMode, websiteFlow]);

  useEffect(() => {
    if (!CUSTOM_PUBLISH_ENABLED) return;
    const kind = resolveCustomTaskKind(viewHint);
    setTaskKind(kind);
    if (kind === 'website') setMode('custom');
  }, [viewHint]);

  const switchMode = (next: CreateOrderMode) => {
    if (!CUSTOM_PUBLISH_ENABLED || websiteFlow) return;
    setMode(next);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'create_order');
    url.searchParams.set('orderMode', next);
    if (next === 'ai') url.searchParams.delete('orderTask');
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div
        className="shrink-0 px-6 pt-4 pb-0 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
      >
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-bold text-[var(--color-title)]">
              {websiteFlow ? '发布网页改装' : '付费信源发单'}
            </h2>
            <BrandSwitcher variant="scope" brandName={brandName} onBrandChange={onBrandChange} />
          </div>
          {!websiteFlow && (
            <p className="text-[10px] text-[var(--neutral-text-03)] mb-2">
              基于品牌资料 / GEO 报告 / 排名缺口生成投放计划 · 按媒体拆分篇数 · 确认报价后冻结
            </p>
          )}
        </div>
        {CUSTOM_PUBLISH_ENABLED && !websiteFlow && VISIBLE_CREATE_ORDER_MODES.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {VISIBLE_CREATE_ORDER_MODES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.desc}
                onClick={() => switchMode(t.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  mode === t.id
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-title)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        {CUSTOM_PUBLISH_ENABLED && mode === 'custom' ? (
          <CustomOrderView
            brandName={brandName}
            onBrandChange={onBrandChange}
            onNavigate={onNavigate}
            initialTaskKind={taskKind}
          />
        ) : (
          <DeliveryPlanView
            brandName={brandName}
            onBrandChange={onBrandChange}
            onNavigate={onNavigate}
            lockedMode="ai"
            embedded
            paidQuoteMode={paidQuoteMode}
            initialGeoReportId={campaignPlanId ? undefined : geoReportId}
            initialCampaignPlanId={campaignPlanId}
            autoGenerateFromGeo={Boolean(geoReportId) && !campaignPlanId}
            indexingGapHint={resolveIndexingGapHint(viewHint)}
          />
        )}
      </div>
    </div>
  );
}
