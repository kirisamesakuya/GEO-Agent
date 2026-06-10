import { createBrand, getBrandProfile, updateBrandProfile } from './brand.service.js';
import { createAgentTask } from './agent-task.service.js';
import { maybeEnqueueAgentTask } from '../agent/worker.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { getTaskQueueHint } from './hermes-concurrency.service.js';
import { detectBrandClueInputType } from './brand-source-material.service.js';
import { normalizeGeoSkillInput } from '../lib/hermes-geo-input.js';
import type { BrandProfileDto } from './brand.service.js';

export type FirstAuditProfileInput = {
  name: string;
  industry?: string;
  city?: string;
  website?: string;
  description?: string;
  keywords?: string[];
  competitors?: string[];
  socialLink?: string;
  sourceMaterials?: BrandProfileDto['sourceMaterials'];
};

export type FirstAuditClueInput = {
  brandUrl?: string;
  website?: string;
  socialLink?: string;
  description?: string;
  text?: string;
  inputType?: string;
  files?: Array<{ id: string; name: string; url: string; mimeType?: string }>;
};

export type SubmitFirstGeoAuditInput = {
  /** 线索阶段解析出的品牌 key（可能尚未入库） */
  draftBrandName?: string;
  profile: FirstAuditProfileInput;
  clue?: FirstAuditClueInput;
  goal?: 'geo_quick_start' | 'geo_audit';
  /** 是否在后台创建 brand_extract；默认 false，首检原子路径不阻塞 */
  runExtract?: boolean;
};

function resolveClueText(clue?: FirstAuditClueInput): string {
  if (!clue) return '';
  const brandUrl = String(clue.brandUrl ?? clue.website ?? '').trim();
  const socialLink = String(clue.socialLink ?? '').trim();
  const description = String(clue.description ?? '').trim();
  const text = String(clue.text ?? '').trim();
  return text || brandUrl || socialLink || description;
}

function resolveDraftName(input: SubmitFirstGeoAuditInput): string {
  const fromProfile = input.profile.name?.trim();
  const fromDraft = input.draftBrandName?.trim();
  const clue = input.clue;
  const brandUrl = String(clue?.brandUrl ?? clue?.website ?? '').trim();
  const clueText = resolveClueText(clue);

  if (fromDraft) return fromDraft;
  if (fromProfile) return fromProfile;
  if (brandUrl) {
    try {
      return new URL(brandUrl).hostname.replace(/^www\./, '');
    } catch {
      return brandUrl.slice(0, 30);
    }
  }
  return clueText.slice(0, 20) || '新品牌';
}

/**
 * 原子首检：创建/更新品牌档案 + 发起 geo_quick_start（可选 brand_extract）。
 * 返回最终 workspace 品牌名（profile 确认后的 name）。
 */
export async function submitFirstGeoAudit(input: SubmitFirstGeoAuditInput) {
  const profileName = input.profile.name?.trim();
  if (!profileName) throw new Error('请填写品牌名称');

  const lookupKey = resolveDraftName(input);
  let brand = await getBrandProfile(lookupKey);

  const website =
    String(input.profile.website ?? input.clue?.brandUrl ?? input.clue?.website ?? '').trim();
  const socialLink = String(input.profile.socialLink ?? input.clue?.socialLink ?? '').trim();
  const description = String(
    input.profile.description ?? input.clue?.description ?? ''
  ).trim();

  if (!brand) {
    brand = await createBrand({
      name: profileName,
      website: website || undefined,
      industry: input.profile.industry,
      city: input.profile.city,
    });
    if (description || input.profile.keywords?.length) {
      brand = await updateBrandProfile(
        {
          name: profileName,
          industry: input.profile.industry ?? brand.industry,
          city: input.profile.city ?? brand.city,
          website: website || brand.website,
          description: description || brand.description,
          keywords: input.profile.keywords ?? brand.keywords,
          competitors: input.profile.competitors ?? brand.competitors,
          sourceMaterials: input.profile.sourceMaterials,
        },
        brand.name
      );
    }
  } else {
    brand = await updateBrandProfile(
      {
        name: profileName,
        industry: String(input.profile.industry ?? brand.industry ?? ''),
        city: String(input.profile.city ?? brand.city ?? ''),
        website: website || brand.website,
        description: description || brand.description,
        keywords: Array.isArray(input.profile.keywords)
          ? input.profile.keywords.map(String)
          : brand.keywords,
        competitors: Array.isArray(input.profile.competitors)
          ? input.profile.competitors.map(String)
          : brand.competitors,
        sourceMaterials: input.profile.sourceMaterials ?? brand.sourceMaterials,
      },
      brand.name
    );
  }

  let extractTask: Awaited<ReturnType<typeof createAgentTask>> | null = null;
  if (input.runExtract && input.clue) {
    const clueText = resolveClueText(input.clue);
    const brandUrl = String(input.clue.brandUrl ?? input.clue.website ?? '').trim();
    const detectedType =
      input.clue.inputType ??
      (brandUrl
        ? 'website_url'
        : socialLink
          ? 'social_link'
          : description
            ? 'description'
            : clueText
              ? detectBrandClueInputType(clueText)
              : 'brand_name');
    const sourceMaterials = Array.isArray(input.clue.files) ? input.clue.files : [];

    extractTask = await createAgentTask({
      type: 'brand_extract',
      title: `${brand.name} · 品牌资料整理`,
      brandName: brand.name,
      executor: await resolveExecutorKindForTask('brand_extract'),
      input: normalizeGeoSkillInput(
        'brand_extract',
        {
          brandName: brand.name,
          inputType: detectedType,
          text: clueText || brandUrl || socialLink || description,
          brandUrl: brandUrl || undefined,
          brandDesc: description || brand.description,
          socialLink: socialLink || undefined,
          sourceMaterials,
          outputContract: { format: 'json', requiredFields: ['profile'] },
        },
        brand.name
      ),
    });
    maybeEnqueueAgentTask(extractTask);
  }

  const taskType = input.goal === 'geo_audit' ? 'geo_audit' : 'geo_quick_start';
  const taskTitle =
    taskType === 'geo_audit'
      ? `${brand.name} · GEO 深度分析`
      : `${brand.name} · GEO 快速检测`;

  const geoTask = await createAgentTask({
    type: taskType,
    title: taskTitle,
    brandName: brand.name,
    executor: await resolveExecutorKindForTask(taskType),
    input: normalizeGeoSkillInput(
      taskType,
      {
        brandName: brand.name,
        brandCity: brand.city,
        industry: brand.industry,
        productNames: brand.keywords,
        competitors: brand.competitors,
        brandUrl: brand.website,
        socialLink: socialLink || undefined,
        brandDesc: brand.description,
        sourceMaterials: [
          ...(brand.website ? [{ kind: 'link' as const, name: '官网 URL', value: brand.website }] : []),
          ...(brand.sourceMaterials ?? []),
        ],
        platforms: ['DeepSeek', '豆包', 'Kimi'],
      },
      brand.name
    ),
  });
  maybeEnqueueAgentTask(geoTask);
  const queueHint = await getTaskQueueHint(geoTask);

  return {
    brand,
    geoTask,
    extractTask,
    workspaceBrand: brand.name,
    queueHint,
    nextStep: 'onboarding_console' as const,
  };
}
