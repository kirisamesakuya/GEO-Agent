import { useEffect, useState } from 'react';
import {
  BRAND_CENTER_ASSET_LIBRARY_ENABLED,
  brandCenterTabLabel,
  brandCenterVisibleTabs,
  resolveBrandCenterTab,
  type BrandCenterTab,
} from '../lib/brand-center';
import type { ViewType } from '../types';
import { ArrowLeft } from 'lucide-react';
import BrandProfileView from './BrandProfileView';
import KeywordLibraryView from './KeywordLibraryView';
import KnowledgeBaseView from './KnowledgeBaseView';
import AssetLibraryView from './AssetLibraryView';

interface Props {
  brandName: string;
  initialTab: BrandCenterTab;
  keywordHint?: string;
  onBrandNameChange: (name: string) => void;
  onBackToBrandManagement?: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

const TABS = brandCenterVisibleTabs();

export default function BrandCenterView({
  brandName,
  initialTab,
  keywordHint,
  onBrandNameChange,
  onBackToBrandManagement,
  onNavigate,
}: Props) {
  const [tab, setTab] = useState<BrandCenterTab>(() => resolveBrandCenterTab(initialTab));

  useEffect(() => {
    setTab(resolveBrandCenterTab(initialTab));
  }, [initialTab, brandName]);

  return (
    <div className="geo-page-frame flex min-h-0 h-full flex-col">
      <div
        className="shrink-0 flex flex-col gap-2 px-6 pt-4 pb-2 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
      >
        {onBackToBrandManagement && (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs self-start flex items-center gap-1"
            onClick={onBackToBrandManagement}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回品牌管理
          </button>
        )}
        <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
          品牌管理 / <span className="font-semibold text-[var(--color-title)]">{brandName}</span>
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                tab === t ? 'geo-nav-active' : 'geo-nav-item'
              }`}
            >
              {brandCenterTabLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="geo-page-frame__body flex min-h-0 flex-col min-w-0">
        {tab === 'profile' && (
          <BrandProfileView
            brandName={brandName}
            onBrandNameChange={onBrandNameChange}
            onNavigate={onNavigate}
          />
        )}
        {tab === 'keywords' && (
          <KeywordLibraryView
            brandName={brandName}
            initialTab={keywordHint === 'mine' ? 'mine' : undefined}
            embedded
            onNavigate={onNavigate}
          />
        )}
        {tab === 'knowledge' && (
          <KnowledgeBaseView brandName={brandName} embedded onNavigate={onNavigate} />
        )}
        {/* 本期隐藏图片素材库 Tab；BRAND_CENTER_ASSET_LIBRARY_ENABLED 开启后恢复 */}
        {tab === 'assets' && BRAND_CENTER_ASSET_LIBRARY_ENABLED && (
          <AssetLibraryView brandName={brandName} embedded />
        )}
      </div>
    </div>
  );
}
