import type { BrandClueInputType } from '../types';

export function detectBrandClueInputType(text: string): BrandClueInputType {
  const trimmed = text.trim();
  if (!trimmed) return 'description';
  if (/^https?:\/\//i.test(trimmed)) {
    if (/xiaohongshu|douyin|weixin|dianping|meituan|taobao|tmall|jd\.com/i.test(trimmed)) {
      return 'social_link';
    }
    return 'website_url';
  }
  if (trimmed.length <= 30 && !/[，。！？,.!?]/.test(trimmed)) {
    return 'brand_name';
  }
  return 'description';
}

export const CLUE_TYPE_CHIPS: Array<{ type: BrandClueInputType; label: string }> = [
  { type: 'brand_name', label: '品牌名' },
  { type: 'website_url', label: '官网' },
  { type: 'file', label: '海报/PPT' },
  { type: 'social_link', label: '小红书/抖音' },
  { type: 'description', label: '描述' },
];

export type BrandClueFormInput = {
  brandName?: string;
  brandUrl?: string;
  website?: string;
  socialLink?: string;
  description?: string;
  files?: Array<{ id: string; name: string; url: string; mimeType?: string }>;
};

/** 根据已填字段推断主线索类型（用于 brand_extract） */
export function resolvePrimaryClueType(input: BrandClueFormInput): BrandClueInputType {
  if (input.files?.length) return 'file';
  const website = (input.brandUrl ?? input.website ?? '').trim();
  if (website) return 'website_url';
  if (input.socialLink?.trim()) return 'social_link';
  if (input.description?.trim()) return 'description';
  if (input.brandName?.trim()) return 'brand_name';
  return 'description';
}

export function buildBrandCluePayload(input: BrandClueFormInput) {
  const brandUrl = (input.brandUrl ?? input.website ?? '').trim();
  const socialLink = input.socialLink?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  const brandName = input.brandName?.trim() ?? '';
  const primaryType = resolvePrimaryClueType(input);
  const legacyText =
    primaryType === 'website_url'
      ? brandUrl
      : primaryType === 'social_link'
        ? socialLink
        : primaryType === 'description'
          ? description
          : primaryType === 'brand_name'
            ? brandName
            : '';

  return {
    brandName: brandName || undefined,
    brandUrl: brandUrl || undefined,
    website: brandUrl || undefined,
    description: description || undefined,
    brandDesc: description || undefined,
    socialLink: socialLink || undefined,
    text: legacyText || undefined,
    inputType: primaryType,
    files: input.files ?? [],
  };
}

export type OnboardingGoal = 'geo_quick_start' | 'geo_audit' | 'article' | 'task_pack';

export const ONBOARDING_GOALS: Array<{ id: OnboardingGoal; title: string; desc: string }> = [
  { id: 'geo_quick_start', title: '首次 AI 可见度体检', desc: '适合新品牌，快速了解 AI 可见度' },
  { id: 'geo_audit', title: '专业审计', desc: '已有较完整资料，做深度 GEO 审计' },
  { id: 'article', title: '生成文章', desc: '基于品牌资料直接产内容' },
  { id: 'task_pack', title: '创建任务包', desc: '已有明确投放或整改目标' },
];
