import {
  INDUSTRY_MEDIA_SUGGESTIONS,
  INDUSTRY_MEDIA_PLATFORM,
  isIndustryMediaOutlet,
  findMediaPlatformByLabel,
} from './media-platforms.js';

/** 接单大厅「行业媒体」大类筛选值 */
export { INDUSTRY_MEDIA_PLATFORM };

const EXACT_MATCH_SCORE = 90;
const CATEGORY_MATCH_SCORE = 78;
const DEFAULT_MATCH_SCORE = 50;
const LOW_MATCH_SCORE = 40;

/** 订单 platform 是否命中大厅筛选（含「行业媒体」大类） */
export function orderMatchesHallPlatformFilter(orderPlatform: string, filter: string): boolean {
  const order = String(orderPlatform ?? '').trim();
  const hall = String(filter ?? '').trim();
  if (!hall) return true;
  if (order === hall) return true;
  if (hall === INDUSTRY_MEDIA_PLATFORM && isIndustryMediaOutlet(order)) return true;
  return false;
}

/** 服务商擅长平台 vs 订单 platform 匹配分 */
export function scoreProviderPlatformMatch(providerPlatforms: string[], orderPlatform: string): number {
  const order = String(orderPlatform ?? '').trim();
  if (!providerPlatforms.length) return DEFAULT_MATCH_SCORE;

  const normalized = providerPlatforms.map((p) => String(p).trim()).filter(Boolean);
  if (normalized.includes(order)) return EXACT_MATCH_SCORE;

  const orderIsIndustry = isIndustryMediaOutlet(order);
  if (orderIsIndustry && normalized.includes(INDUSTRY_MEDIA_PLATFORM)) {
    return CATEGORY_MATCH_SCORE;
  }

  const orderCategory = findMediaPlatformByLabel(order)?.category;
  if (orderCategory && normalized.some((p) => findMediaPlatformByLabel(p)?.category === orderCategory)) {
    return CATEGORY_MATCH_SCORE;
  }

  return LOW_MATCH_SCORE;
}

/** Prisma 可用的行业媒体子项列表（精确命中推荐子项） */
export function industryMediaOutletWhereValues(): string[] {
  return [...INDUSTRY_MEDIA_SUGGESTIONS];
}

/** 筛选「行业媒体」大类时是否需内存二次过滤（含自定义媒体名） */
export function hallFilterNeedsInMemoryPlatformMatch(filter: string): boolean {
  return String(filter ?? '').trim() === INDUSTRY_MEDIA_PLATFORM;
}
