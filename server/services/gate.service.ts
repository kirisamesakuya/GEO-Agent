import { prisma } from '../db/client.js';
import { getBrandProfile, checkBrandCompleteness, listAccounts, isBrandDisabled } from './brand.service.js';
import { getAiCredits } from './ai-credits.service.js';
import { getBudgetAccount } from './budget.service.js';

const AUTO_PUBLISH_PLATFORMS = new Set([
  '小红书',
  '知乎',
  '公众号',
  '微信公众号',
  '大风网',
  '一点号',
]);

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x).trim()).filter(Boolean);
}

export type ProspectGeoTarget = {
  name?: string;
  industry?: string;
  city?: string;
  description?: string;
  website?: string;
};

/** GEO 售前探店 / 自定义上下文：不依赖品牌中心完整资料 */
export function validateProspectGeoAnalysis(input: {
  prospectMode?: boolean;
  targetBrand?: ProspectGeoTarget;
  platforms?: unknown;
  keywords?: unknown;
  industry?: string;
  description?: string;
}): { ok: boolean; error?: string; analysisBrandName?: string } {
  const platforms = asStringList(input.platforms);
  const keywords = asStringList(input.keywords);
  if (platforms.length === 0) return { ok: false, error: '请至少选择一个目标 AI 平台' };
  if (keywords.length === 0) return { ok: false, error: '请至少填写一个分析关键词' };

  if (input.prospectMode) {
    const name = String(input.targetBrand?.name ?? '').trim();
    if (!name) return { ok: false, error: '请填写目标客户品牌名称' };
    const industry = String(input.targetBrand?.industry ?? '').trim();
    const description = String(input.targetBrand?.description ?? '').trim();
    if (!industry && !description) {
      return { ok: false, error: '请填写目标客户的行业或业务简介' };
    }
    return { ok: true, analysisBrandName: name };
  }

  const industry = String(input.industry ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (!industry && !description) {
    return { ok: false, error: '品牌资料不完整时，请补充行业或业务简介后再分析' };
  }
  return { ok: true };
}

export async function validateGeoAnalysisSubmission(
  workspaceBrandName: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; analysisBrandName?: string }> {
  if (await isBrandDisabled(workspaceBrandName)) {
    return { ok: false, error: '商家账号已禁用，请联系平台运营' };
  }

  if (input.prospectMode) {
    return validateProspectGeoAnalysis({
      prospectMode: true,
      targetBrand: input.targetBrand as ProspectGeoTarget | undefined,
      platforms: input.platforms,
      keywords: input.keywords,
    });
  }

  const profile = await getBrandProfile(workspaceBrandName);
  if (!profile) return { ok: false, error: '请先选择或创建品牌' };

  const { complete } = checkBrandCompleteness(profile);
  if (complete) {
    return { ok: true, analysisBrandName: profile.name };
  }

  const custom = validateProspectGeoAnalysis({
    prospectMode: false,
    platforms: input.platforms,
    keywords: input.keywords,
    industry: String(input.industry ?? profile.industry ?? ''),
    description: String(input.description ?? profile.description ?? ''),
  });
  if (!custom.ok) return custom;
  return { ok: true, analysisBrandName: profile.name };
}

export async function validateAgentTaskSubmission(
  brandName: string,
  taskType: string,
  creditCost = 10
): Promise<{ ok: boolean; error?: string }> {
  if (await isBrandDisabled(brandName)) {
    return { ok: false, error: '商家账号已禁用，请联系平台运营' };
  }

  const profile = await getBrandProfile(brandName);
  if (!profile) return { ok: false, error: '请先选择或创建品牌' };

  const { complete, missing } = checkBrandCompleteness(profile);
  if (
    !complete &&
    (taskType === 'geo_analysis' ||
      taskType === 'geo_quick_start' ||
      taskType === 'geo_audit' ||
      taskType === 'article_generation')
  ) {
    return { ok: false, error: `品牌资料不完整，缺少：${missing.join('、')}` };
  }

  void creditCost;

  return { ok: true };
}

/** 自动发布到官方平台前校验账号绑定 */
export async function validateAutoPublish(
  platform: string,
  brandName?: string
): Promise<{ ok: boolean; error?: string }> {
  const accounts = await listAccounts(brandName);
  const acc = accounts.find((a) => a.platform === platform);
  if (!acc || acc.status !== '已授权') {
    return {
      ok: false,
      error: `${platform} 官方账号未授权。账号绑定仅用于自动发布与数据回传，请前往「发布账号」在本机登录并检测账号`,
    };
  }
  return { ok: true };
}

export async function validatePublish(platform: string, brandName?: string) {
  return validateAutoPublish(platform, brandName);
}

/** 发布任务包到接单端：仅校验品牌与投放余额 */
export async function validateTaskLobbyPublish(
  brandName: string,
  budgetAmount: number
): Promise<{ ok: boolean; error?: string }> {
  if (await isBrandDisabled(brandName)) {
    return { ok: false, error: '商家账号已禁用，请联系平台运营' };
  }
  const row = await prisma.brand.findFirst({ where: { name: brandName } });
  if (!row) return { ok: false, error: '请先选择或创建品牌' };

  const budget = await getBudgetAccount(brandName);
  if (budget.available < budgetAmount) {
    return {
      ok: false,
      error: `投放余额不足（可用 ¥${budget.available}），请前往「投放余额」充值后再发布`,
    };
  }
  return { ok: true };
}

export async function getGateStatus(brandName: string) {
  const profile = await getBrandProfile(brandName);
  const completeness = profile
    ? checkBrandCompleteness(profile)
    : { complete: false, missing: ['品牌资料'] as string[] };
  const credits = await getAiCredits(brandName);
  const budget = await getBudgetAccount(brandName);
  const accounts = await listAccounts(brandName);
  const autoPublishBlocked = accounts
    .filter((a) => AUTO_PUBLISH_PLATFORMS.has(a.platform) && a.status !== '已授权')
    .map((a) => a.platform);

  const disabled = await isBrandDisabled(brandName);

  return {
    brandName,
    merchantDisabled: disabled,
    brandComplete: completeness.complete,
    missingFields: completeness.missing,
    aiCredits: credits.balance,
    budgetAvailable: budget.available,
    budgetFrozen: budget.frozen,
    autoPublishBlockedPlatforms: autoPublishBlocked,
    canSubmitArticle: !disabled && completeness.complete,
    canSubmitGeo: !disabled && completeness.complete,
    canSubmitGeoProspect: !disabled,
    brandProfileIncomplete: !completeness.complete,
    canPublishToLobby: !disabled && budget.available > 0,
    canAutoPublish: !disabled && autoPublishBlocked.length === 0,
    /** @deprecated 使用 canPublishToLobby / canAutoPublish */
    canPublish: !disabled && budget.available > 0,
    unauthorizedPlatforms: autoPublishBlocked,
  };
}
