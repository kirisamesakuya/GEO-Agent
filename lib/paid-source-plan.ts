import type { PaidSourceTaskBrief } from './paid-source-brief';
import {
  CAMPAIGN_PLAN_PLATFORM_LABELS,
  WEBSITE_PUBLISH_PLATFORM,
  mediaPlatformLabels,
} from './media-platforms';

/** 付费信源默认可选媒体（内容 + 官媒 + 行业媒体 + 网站） */
export const PAID_SOURCE_PLATFORM_OPTIONS = [
  ...mediaPlatformLabels(['content_publish', 'official_media', 'industry_media']),
  WEBSITE_PUBLISH_PLATFORM,
].filter((label, index, all) => all.indexOf(label) === index);

export const PAID_SOURCE_DEFAULT_PLATFORMS = [...CAMPAIGN_PLAN_PLATFORM_LABELS].slice(0, 6);

export type PaidPlanSourceType = 'brand_profile' | 'geo_report' | 'indexing_result';

const SOURCE_LABEL: Record<PaidPlanSourceType, string> = {
  brand_profile: '按品牌资料',
  geo_report: '根据 GEO 报告',
  indexing_result: '根据排名缺口',
};

export interface BuildPaidTaskBriefInput {
  sourceType: PaidPlanSourceType;
  brandName: string;
  brandProfile?: {
    name?: string;
    description?: string;
    keywords?: string[];
    website?: string;
    industry?: string;
    city?: string;
    forbiddenWords?: string[];
  } | null;
  supplementNotes?: string;
  targetPlatforms?: string[];
  hiddenBudgetMaxCents?: number;
  perTaskBudgetCapCents?: number;
  taskName?: string;
}

export function buildPaidSourceTaskBrief(input: BuildPaidTaskBriefInput): PaidSourceTaskBrief {
  const profile = input.brandProfile;
  return {
    taskName: input.taskName?.trim() || `${input.brandName} 付费信源投放`,
    demandSource: SOURCE_LABEL[input.sourceType],
    brandIntro: profile?.description?.trim() || input.brandName,
    targetKeywords: profile?.keywords?.length ? profile.keywords : undefined,
    websiteUrl: profile?.website?.trim() || undefined,
    industryLimit: profile?.industry?.trim() || undefined,
    regionLimit: profile?.city?.trim() || undefined,
    complianceNotes: profile?.forbiddenWords?.length
      ? profile.forbiddenWords.join('、')
      : undefined,
    supplementNotes: input.supplementNotes?.trim() || undefined,
    targetPlatforms: input.targetPlatforms?.length ? input.targetPlatforms : undefined,
    hiddenBudgetMaxCents: input.hiddenBudgetMaxCents,
    perTaskBudgetCapCents: input.perTaskBudgetCapCents,
    requireLink: true,
    requireScreenshot: true,
    requireIndexingProof: false,
  };
}
