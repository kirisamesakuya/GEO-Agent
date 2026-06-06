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

export type OnboardingGoal = 'geo_quick_start' | 'geo_audit' | 'article' | 'task_pack';

export const ONBOARDING_GOALS: Array<{ id: OnboardingGoal; title: string; desc: string }> = [
  { id: 'geo_quick_start', title: '首次 AI 可见度体检', desc: '适合新品牌，快速了解 AI 可见度' },
  { id: 'geo_audit', title: '专业审计', desc: '已有较完整资料，做深度 GEO 审计' },
  { id: 'article', title: '生成文章', desc: '基于品牌资料直接产内容' },
  { id: 'task_pack', title: '创建任务包', desc: '已有明确投放或整改目标' },
];
