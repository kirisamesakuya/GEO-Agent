import { useEffect, useState } from 'react';
import type { ViewType } from '../types';
import BrandScopeBar from './common/BrandScopeBar';
import CustomOrderView from './CustomOrderView';
import DeliveryPlanView from './DeliveryPlanView';
import {
  type CreateOrderMode,
  CREATE_ORDER_MODES,
  createOrderModeFromHint,
  parseCreateOrderModeFromUrl,
  parseGeoReportIdFromUrl,
  parseGeoReportIdFromHint,
  resolveCustomTaskKind,
  isWebsiteOrderContext,
} from '../lib/create-order-nav';

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
  const [mode, setMode] = useState<CreateOrderMode>(
    () => initialMode ?? parseCreateOrderModeFromUrl() ?? 'ai'
  );
  const [taskKind, setTaskKind] = useState(() => resolveCustomTaskKind(viewHint));
  const websiteFlow = taskKind === 'website' || isWebsiteOrderContext(viewHint);

  useEffect(() => {
    if (websiteFlow) {
      setMode('custom');
      return;
    }
    if (initialMode) setMode(initialMode);
  }, [initialMode, websiteFlow]);

  useEffect(() => {
    const kind = resolveCustomTaskKind(viewHint);
    setTaskKind(kind);
    if (kind === 'website') setMode('custom');
  }, [viewHint]);

  const switchMode = (next: CreateOrderMode) => {
    if (websiteFlow) return;
    setMode(next);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'create_order');
    url.searchParams.set('orderMode', next);
    if (next === 'ai') url.searchParams.delete('orderTask');
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="shrink-0 px-6 pt-4 pb-0 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
      >
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[var(--color-title)]">
            {websiteFlow ? '发布网页改装' : '发布任务'}
          </h2>
          <p className="text-xs mt-0.5 text-[var(--color-text-secondary)]">
            {websiteFlow
              ? '填写页面需求后可提交网页改装需求，在「任务交付 · 网页需求」查看处理进度。'
              : '从发布文章、网页改装或 AI 拆包开始，任务执行与验收在「任务交付」查看。'}
          </p>
        </div>
        {!websiteFlow && (
          <div className="flex gap-1 flex-wrap">
            {CREATE_ORDER_MODES.map((t) => (
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

      <div className="shrink-0 px-6 pt-3 pb-0">
        <BrandScopeBar
          label="为哪个品牌发布任务"
          brandName={brandName}
          onBrandChange={onBrandChange}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'custom' ? (
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
            initialGeoReportId={geoReportId}
            autoGenerateFromGeo={Boolean(geoReportId)}
          />
        )}
      </div>
    </div>
  );
}
