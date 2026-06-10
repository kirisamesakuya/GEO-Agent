/**
 * 全站媒体 / 平台统一数据源（内容发布、网站、官媒、AI 搜索）
 * 各页面请从此模块导入，勿再单独维护平台数组。
 */

export type MediaPlatformCategory =
  | 'content_publish'
  | 'website'
  | 'official_media'
  | 'ai_search';

export interface MediaPlatform {
  id: string;
  /** 业务侧展示与存储用的名称 */
  label: string;
  category: MediaPlatformCategory;
  /** 账号绑定配置中的 platform 字段（如 微信公众号 → 公众号） */
  accountPlatform?: string;
  sortOrder: number;
}

export const MEDIA_PLATFORMS: readonly MediaPlatform[] = [
  { id: 'xiaohongshu', label: '小红书', category: 'content_publish', sortOrder: 10 },
  { id: 'zhihu', label: '知乎', category: 'content_publish', sortOrder: 20 },
  {
    id: 'wechat_mp',
    label: '公众号',
    category: 'content_publish',
    accountPlatform: '微信公众号',
    sortOrder: 30,
  },
  { id: 'douyin', label: '抖音', category: 'content_publish', sortOrder: 40 },
  { id: 'bilibili', label: 'B站', category: 'content_publish', sortOrder: 50 },
  { id: 'weibo', label: '微博', category: 'content_publish', sortOrder: 60 },
  { id: 'dafeng', label: '大风网', category: 'content_publish', sortOrder: 70 },
  { id: 'yidian', label: '一点号', category: 'content_publish', sortOrder: 80 },
  { id: 'website', label: '网站', category: 'website', sortOrder: 100 },
  { id: 'official_media', label: '官媒', category: 'official_media', sortOrder: 110 },
  { id: 'doubao', label: '豆包', category: 'ai_search', sortOrder: 200 },
  { id: 'deepseek', label: 'DeepSeek', category: 'ai_search', sortOrder: 210 },
  { id: 'yuanbao', label: '腾讯元宝', category: 'ai_search', sortOrder: 220 },
  { id: 'kimi', label: 'Kimi', category: 'ai_search', sortOrder: 230 },
  { id: 'wenxin', label: '文心一言', category: 'ai_search', sortOrder: 240 },
  { id: 'tongyi', label: 'Qwen', category: 'ai_search', sortOrder: 250 },
  { id: 'zhipu', label: '智谱', category: 'ai_search', sortOrder: 260 },
  { id: 'minimax', label: 'MiniMax', category: 'ai_search', sortOrder: 270 },
] as const;

function sortedLabels(categories: MediaPlatformCategory[]): string[] {
  return MEDIA_PLATFORMS.filter((p) => categories.includes(p.category))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => p.label);
}

/** 内容库 / 本机发布账号侧栏顺序（与 platform-auth 已接入平台对齐） */
export const CONTENT_PUBLISH_PLATFORM_LABELS = sortedLabels(['content_publish']);

/** 内容库默认展示顺序（不含未接入绑定的平台时可子集筛选） */
export const CONTENT_LIBRARY_PLATFORM_ORDER = [
  '小红书',
  '知乎',
  '公众号',
  '大风网',
  '一点号',
] as const;

/** 文章生成、内容发布目标平台 */
export const ARTICLE_PUBLISH_PLATFORM_LABELS = CONTENT_LIBRARY_PLATFORM_ORDER;

/** 发起订单 / 投放计划多选平台 */
export const CAMPAIGN_PLAN_PLATFORM_LABELS = sortedLabels(['content_publish', 'website']);

/** 接单大厅 / 自定义发单可选平台 */
export const LOBBY_PLATFORM_LABELS = sortedLabels([
  'content_publish',
  'website',
  'official_media',
]);

export const WEBSITE_PUBLISH_PLATFORM = '网站' as const;
export const OFFICIAL_MEDIA_PLATFORM = '官媒' as const;

/** 接单端任务大厅筛选 */
export const PROVIDER_TASK_HALL_FILTER_PLATFORMS = LOBBY_PLATFORM_LABELS;

/** GEO 分析 / 排名监控：AI 搜索平台 */
export const GEO_AI_PLATFORM_LABELS = sortedLabels(['ai_search']);

export const DEFAULT_CAMPAIGN_PLATFORMS = ['小红书', '知乎'] as const;
export const DEFAULT_GEO_AI_PLATFORMS = ['豆包', '腾讯元宝'] as const;
export const DEFAULT_INDEXING_PLATFORMS = ['DeepSeek', '豆包', '千问', 'Kimi', '元宝'] as const;

export type ContentPublishPlatformLabel = (typeof CONTENT_LIBRARY_PLATFORM_ORDER)[number];
export type GeoAiPlatformLabel = (typeof GEO_AI_PLATFORM_LABELS)[number];

export function mediaPlatformLabels(
  categories: MediaPlatformCategory | MediaPlatformCategory[]
): string[] {
  const list = Array.isArray(categories) ? categories : [categories];
  return sortedLabels(list);
}

export function findMediaPlatformByLabel(label: string): MediaPlatform | undefined {
  return MEDIA_PLATFORMS.find((p) => p.label === label);
}

export function accountPlatformToContentFilter(accountPlatform: string): string {
  const hit = MEDIA_PLATFORMS.find(
    (p) => p.accountPlatform === accountPlatform || p.label === accountPlatform
  );
  return hit?.label ?? accountPlatform;
}

export function contentLibraryFilterLabel(filterValue: string): string {
  if (!filterValue) return '全部';
  return findMediaPlatformByLabel(filterValue)?.label ?? filterValue;
}

export function platformMatches(contentPlatform: string, accountPlatform: string): boolean {
  if (contentPlatform === accountPlatform) return true;
  const content = findMediaPlatformByLabel(contentPlatform);
  const account = MEDIA_PLATFORMS.find(
    (p) => p.label === accountPlatform || p.accountPlatform === accountPlatform
  );
  if (content?.accountPlatform && account) {
    return content.accountPlatform === account.accountPlatform || content.label === account.label;
  }
  if (contentPlatform === '公众号' && accountPlatform === '微信公众号') return true;
  return false;
}
