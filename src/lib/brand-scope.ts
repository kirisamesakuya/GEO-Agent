/** localStorage 中保存的当前工作区品牌（Demo 多品牌切换） */
export const BRAND_STORAGE_KEY = 'geo_selected_brand';

/** 功能页数据范围：自定义客户（未入库，仅 GEO 分析等场景） */
export const PROSPECT_BRAND_SCOPE = '__prospect__';

/** 品牌切换器主文案 */
export const PROSPECT_BRAND_LABEL = '自定义';

/** 品牌切换器下拉副文案 */
export const PROSPECT_BRAND_HINT = '手动填写客户资料';

export function isProspectBrandScope(brandName: string): boolean {
  return brandName === PROSPECT_BRAND_SCOPE;
}

export function resolveBrandSwitcherLabel(brandName: string): string {
  if (brandName === '__all__') return '全部品牌';
  if (isProspectBrandScope(brandName)) return PROSPECT_BRAND_LABEL;
  return brandName;
}

/** 提交自定义客户分析时关联的工作区品牌（localStorage 中上次已维护品牌） */
export function resolveWorkspaceBrandForProspect(fallback = '云杉口腔'): string {
  const saved = localStorage.getItem(BRAND_STORAGE_KEY);
  if (saved && saved !== '__all__' && !isProspectBrandScope(saved)) return saved;
  return fallback;
}

/** GEO 分析 · 卡片说明 */
export const PROSPECT_GEO_CARD_DESCRIPTION =
  '未入库客户可手动填写资料，生成 GEO 基础诊断报告';

/** GEO 分析 · 资料不完整时引导 */
export const PROSPECT_GEO_INCOMPLETE_HINT = '也可在顶部选择「自定义」分析其他客户';

/** GEO 分析 · 报告标题角标 */
export const PROSPECT_GEO_REPORT_BADGE = PROSPECT_BRAND_LABEL;

/** GEO 分析 · 配置助手摘要（未填客户名） */
export const PROSPECT_GEO_ASSISTANT_EMPTY =
  '填写目标客户与关键词后，可生成 GEO 基础报告';

export function prospectGeoAssistantSummary(targetName: string, platforms: string[]): string {
  return `将为「${targetName}」生成 ${platforms.join('、')} 等平台 GEO 诊断报告`;
}

/** GEO 分析 · 历史报告空态 */
export const PROSPECT_GEO_HISTORY_EMPTY = '填写目标客户名称后，将显示该客户的历史报告';
