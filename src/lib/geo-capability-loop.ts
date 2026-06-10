import type { ViewType } from '../types';

export type GeoCapabilityLoopStep =
  | 'mine'
  | 'detect'
  | 'monitor'
  | 'write'
  | 'publish'
  | 'retest'
  | 'assets';

export interface GeoLoopNavigateContext {
  brandName: string;
  geoReportId?: string;
  keywordIds?: string[];
  keywords?: string[];
}

export function buildLoopNavigateHint(
  step: GeoCapabilityLoopStep,
  ctx: GeoLoopNavigateContext
): { view: ViewType; hint?: string; urlParams?: Record<string, string> } {
  switch (step) {
    case 'mine':
      return { view: 'keyword_library', hint: 'mine' };
    case 'detect':
      return { view: 'geo_analysis', hint: 'smart_check' };
    case 'monitor':
      return {
        view: 'indexing_rank',
        hint: ctx.geoReportId ? `geo:${ctx.geoReportId}` : undefined,
        urlParams: ctx.keywordIds?.length
          ? { keywordIds: ctx.keywordIds.join(',') }
          : undefined,
      };
    case 'write':
      return {
        view: 'generate_article',
        hint: ctx.geoReportId ? `geo:${ctx.geoReportId}` : 'quick',
      };
    case 'publish':
      return { view: 'content_delivery', hint: 'self', urlParams: { deliveryChannel: 'self' } };
    case 'retest':
      return { view: 'indexing_rank' };
    case 'assets':
      return { view: 'geo_analysis', hint: 'assets', urlParams: { geoTab: 'assets' } };
    default:
      return { view: 'workbench' };
  }
}

export function applyLoopNavigateUrl(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  window.history.replaceState({}, '', url);
}

export const GEO_LOOP_STEP_LABELS: Record<GeoCapabilityLoopStep, string> = {
  mine: '关键词挖掘',
  detect: 'GEO 检测',
  monitor: '排名监测',
  write: '生成文章',
  publish: '自有账号发布',
  retest: '效果复测',
  assets: '网站 GEO 资产',
};

/** 推荐下一步（能力验证默认链路） */
export function suggestNextLoopStep(opts: {
  keywordCount: number;
  hasGeoReport: boolean;
  hasPublishedContent: boolean;
}): GeoCapabilityLoopStep {
  if (opts.keywordCount === 0) return 'mine';
  if (!opts.hasGeoReport) return 'detect';
  if (!opts.hasPublishedContent) return 'write';
  return 'monitor';
}
