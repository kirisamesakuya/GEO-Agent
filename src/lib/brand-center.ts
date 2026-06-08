import type { ViewType } from '../types';

export type BrandCenterTab = 'profile' | 'keywords' | 'knowledge' | 'assets';

/** 本期暂不开放品牌中心「图片素材库」Tab，保留路由与 AssetLibraryView 供下一期启用 */
export const BRAND_CENTER_ASSET_LIBRARY_ENABLED = false;

const VIEW_TO_TAB: Partial<Record<ViewType, BrandCenterTab>> = {
  brand_profile: 'profile',
  keyword_library: 'keywords',
  knowledge_base: 'knowledge',
  asset_library: 'assets',
};

const TAB_LABELS: Record<BrandCenterTab, string> = {
  profile: '基础资料',
  keywords: '关键词库',
  knowledge: '企业知识库',
  assets: '图片素材库',
};

const ALL_TABS: BrandCenterTab[] = ['profile', 'keywords', 'knowledge', 'assets'];

export function brandCenterVisibleTabs(): BrandCenterTab[] {
  return ALL_TABS.filter((tab) => tab !== 'assets' || BRAND_CENTER_ASSET_LIBRARY_ENABLED);
}

export function resolveBrandCenterTab(tab: BrandCenterTab): BrandCenterTab {
  if (tab === 'assets' && !BRAND_CENTER_ASSET_LIBRARY_ENABLED) return 'knowledge';
  return tab;
}

export function brandCenterTabToView(tab: BrandCenterTab): ViewType {
  const map: Record<BrandCenterTab, ViewType> = {
    profile: 'brand_profile',
    keywords: 'keyword_library',
    knowledge: 'knowledge_base',
    assets: 'asset_library',
  };
  return map[tab];
}

export function viewToBrandCenterTab(view: ViewType): BrandCenterTab | null {
  return VIEW_TO_TAB[view] ?? null;
}

export function isBrandCenterView(view: ViewType): boolean {
  return viewToBrandCenterTab(view) !== null;
}

export function brandCenterTabLabel(tab: BrandCenterTab): string {
  return TAB_LABELS[tab];
}

export function resolveBrandCenterTabFromUrl(): BrandCenterTab | null {
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'profile' || tab === 'keywords' || tab === 'knowledge' || tab === 'assets') {
    return resolveBrandCenterTab(tab);
  }
  return null;
}

export function viewToBrandCenterTabWithHint(
  view: ViewType,
  urlTab: BrandCenterTab | null
): BrandCenterTab {
  const fromView = viewToBrandCenterTab(view);
  if (fromView) return resolveBrandCenterTab(fromView);
  if (urlTab) return resolveBrandCenterTab(urlTab);
  return 'profile';
}
