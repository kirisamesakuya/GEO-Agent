import {
  CONTENT_LIBRARY_PLATFORM_ORDER,
  CONTENT_PUBLISH_PLATFORM_LABELS,
  findMediaPlatformByLabel,
  type MediaPlatform,
} from '../../lib/media-platforms';

export type PlatformVisual = {
  abbr: string;
  gradient: string;
};

/** 平台 id → 图标缩写与品牌色渐变 */
export const MEDIA_PLATFORM_VISUAL: Record<string, PlatformVisual> = {
  xiaohongshu: { abbr: '红', gradient: 'linear-gradient(135deg, #ff2442, #ff6b6b)' },
  zhihu: { abbr: '知', gradient: 'linear-gradient(135deg, #056de8, #79b8ff)' },
  wechat_mp: { abbr: '公', gradient: 'linear-gradient(135deg, #07c160, #2dd4bf)' },
  douyin: { abbr: '抖', gradient: 'linear-gradient(135deg, #1a1a1a, #25f4ee)' },
  bilibili: { abbr: 'B', gradient: 'linear-gradient(135deg, #fb7299, #ff9eb5)' },
  weibo: { abbr: '微', gradient: 'linear-gradient(135deg, #ff8200, #ffb347)' },
  dafeng: { abbr: '风', gradient: 'linear-gradient(135deg, #c41e3a, #ff6b35)' },
  yidian: { abbr: '点', gradient: 'linear-gradient(135deg, #e60012, #ff8a65)' },
  website: { abbr: '网', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
  official_media: { abbr: '媒', gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)' },
  doubao: { abbr: '豆', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
  deepseek: { abbr: 'D', gradient: 'linear-gradient(135deg, #1e293b, #475569)' },
  yuanbao: { abbr: '元', gradient: 'linear-gradient(135deg, #059669, #34d399)' },
  kimi: { abbr: 'K', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  wenxin: { abbr: '文', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  tongyi: { abbr: '通', gradient: 'linear-gradient(135deg, #7c3aed, #c084fc)' },
  zhipu: { abbr: '智', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
  xinghuo: { abbr: '星', gradient: 'linear-gradient(135deg, #dc2626, #f87171)' },
  hunyuan: { abbr: '混', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
};

const FALLBACK_VISUAL: PlatformVisual = {
  abbr: '·',
  gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
};

export function getPlatformVisual(platform: MediaPlatform | string): PlatformVisual {
  const id = typeof platform === 'string' ? platform : platform.id;
  return MEDIA_PLATFORM_VISUAL[id] ?? FALLBACK_VISUAL;
}

export function getPlatformVisualByLabel(label: string): PlatformVisual {
  const platform = findMediaPlatformByLabel(label);
  if (!platform) {
    return { abbr: label.slice(0, 1), gradient: FALLBACK_VISUAL.gradient };
  }
  return getPlatformVisual(platform);
}

/** 文章生成页：快捷 Chip 平台（常用） */
export const ARTICLE_PLATFORM_FEATURED_LABELS = [...CONTENT_LIBRARY_PLATFORM_ORDER] as readonly string[];

/** 文章生成页：Popover 内全部可选平台 */
export const ARTICLE_PLATFORM_ALL_LABELS = [...CONTENT_PUBLISH_PLATFORM_LABELS] as readonly string[];

export function isFeaturedArticlePlatform(label: string): boolean {
  return (ARTICLE_PLATFORM_FEATURED_LABELS as readonly string[]).includes(label);
}
