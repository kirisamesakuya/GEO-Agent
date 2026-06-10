import type { AgentTask } from '../agent/types.js';
import type { AgentTaskType } from '../agent/types.js';

const DEFAULT_PLATFORMS = ['DeepSeek', '豆包', '千问', 'Kimi', '元宝'];

/** 旧字段 → geo-quick-start 标准字段 */
export const GEO_SKILL_FIELD_ALIASES: Record<string, string> = {
  city: 'brandCity',
  targetMarket: 'brandCity',
  services: 'productNames',
  keywords: 'productNames',
  description: 'brandDesc',
  website: 'brandUrl',
  websiteUrl: 'brandUrl',
  url: 'brandUrl',
};

const URL_ONLY_TASK_TYPES = new Set<AgentTaskType>([
  'geo_schema',
  'geo_llmstxt',
  'geo_citability',
]);

function extractUrlFromSourceMaterials(sourceMaterials: unknown): string | undefined {
  if (!Array.isArray(sourceMaterials)) return undefined;
  for (const item of sourceMaterials) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const kind = String(row.kind ?? '').toLowerCase();
    const name = String(row.name ?? '').toLowerCase();
    const value = String(row.value ?? row.url ?? '').trim();
    if (!value) continue;
    if (
      kind === 'link' ||
      kind === 'website' ||
      kind === 'website_url' ||
      name.includes('官网') ||
      name.includes('网站') ||
      name.includes('url') ||
      name.includes('社媒')
    ) {
      if (/^https?:\/\//i.test(value)) return value;
    }
  }
  return undefined;
}

function resolveBrandUrl(input: Record<string, unknown>): string {
  return [
    input.brandUrl,
    input.websiteUrl,
    input.website,
    input.url,
    extractUrlFromSourceMaterials(input.sourceMaterials),
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean) ?? '';
}

function resolveBrandName(input: Record<string, unknown>, brandName?: string): string {
  return (
    brandName ??
    ((typeof input.brandName === 'string' ? input.brandName.trim() : '') ||
      (typeof input.brand === 'string' ? input.brand.trim() : ''))
  );
}

function toProductNames(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (Array.isArray(value)) {
    const list = value.map((v) => String(v).trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}

function mergeSocialIntoSourceMaterials(
  input: Record<string, unknown>
): Array<Record<string, unknown>> | undefined {
  const existing = Array.isArray(input.sourceMaterials)
    ? (input.sourceMaterials as Array<Record<string, unknown>>).map((m) => ({ ...m }))
    : [];
  const socialLink =
    typeof input.socialLink === 'string' ? input.socialLink.trim() : '';
  if (socialLink) {
    const hasSocial = existing.some(
      (m) =>
        String(m.name ?? '').includes('社媒') ||
        String(m.value ?? m.url ?? '') === socialLink
    );
    if (!hasSocial) {
      existing.push({ kind: 'link', name: '社媒链接', value: socialLink });
    }
  }
  return existing.length ? existing : undefined;
}

function applyAliasReads(input: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...input };
  for (const [legacy, standard] of Object.entries(GEO_SKILL_FIELD_ALIASES)) {
    const legacyVal = merged[legacy];
    const standardVal = merged[standard];
    if (legacyVal !== undefined && legacyVal !== '' && (standardVal === undefined || standardVal === '')) {
      merged[standard] = legacyVal;
    }
  }
  return merged;
}

function stripLegacyUrlFields(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  delete next.website;
  delete next.websiteUrl;
  delete next.url;
  delete next.city;
  delete next.targetMarket;
  delete next.services;
  delete next.keywords;
  delete next.description;
  delete next.socialLink;
  return next;
}

/** 按 taskType 输出 Hermes 技能标准 JSON（仅标准字段 + 任务扩展） */
export function normalizeGeoSkillInput(
  taskType: string,
  input: Record<string, unknown>,
  brandName?: string
): Record<string, unknown> {
  const raw = applyAliasReads(input);
  const resolvedBrand = resolveBrandName(raw, brandName);
  const brandUrl = resolveBrandUrl(raw);
  const brandCity = String(raw.brandCity ?? '').trim() || undefined;
  const productNames = toProductNames(raw.productNames);
  const brandDesc = String(raw.brandDesc ?? '').trim() || undefined;
  const platforms = Array.isArray(raw.platforms)
    ? (raw.platforms as unknown[]).map(String).filter(Boolean)
    : DEFAULT_PLATFORMS;
  const sourceMaterials = mergeSocialIntoSourceMaterials(raw);

  const base: Record<string, unknown> = {
    ...(resolvedBrand ? { brandName: resolvedBrand } : {}),
    ...(brandUrl ? { brandUrl } : {}),
  };

  if (URL_ONLY_TASK_TYPES.has(taskType as AgentTaskType)) {
    return stripLegacyUrlFields({
      ...base,
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.sourceReportId ? { sourceReportId: raw.sourceReportId } : {}),
      ...(raw.userConfirmedExecution !== undefined
        ? { userConfirmedExecution: raw.userConfirmedExecution }
        : {}),
      ...(raw.riskLevel ? { riskLevel: raw.riskLevel } : {}),
    });
  }

  if (taskType === 'geo_audit') {
    return stripLegacyUrlFields({
      ...base,
      ...(brandCity ? { brandCity } : {}),
      ...(productNames ? { productNames } : {}),
      ...(brandDesc ? { brandDesc } : {}),
      ...(raw.industry ? { industry: String(raw.industry) } : {}),
      ...(Array.isArray(raw.competitors) && raw.competitors.length
        ? { competitors: (raw.competitors as unknown[]).map(String) }
        : {}),
      platforms,
      ...(Array.isArray(raw.pageUrls) && raw.pageUrls.length
        ? { pageUrls: (raw.pageUrls as unknown[]).map(String).slice(0, 50) }
        : {}),
      ...(Array.isArray(raw.modules) && raw.modules.length
        ? { modules: (raw.modules as unknown[]).map(String) }
        : {}),
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
      ...(raw.analysisDepth ? { analysisDepth: raw.analysisDepth } : {}),
      ...(raw.requestedOutputs ? { requestedOutputs: raw.requestedOutputs } : {}),
      ...(raw.preCrawlSnapshot ? { preCrawlSnapshot: raw.preCrawlSnapshot } : {}),
      ...(raw.ruleScorePreview ? { ruleScorePreview: raw.ruleScorePreview } : {}),
      ...(Array.isArray(raw.plannedQuestions) && raw.plannedQuestions.length
        ? { plannedQuestions: raw.plannedQuestions }
        : {}),
    });
  }

  if (taskType === 'brand_extract') {
    return stripLegacyUrlFields({
      ...base,
      ...(brandCity ? { brandCity } : {}),
      ...(productNames ? { productNames } : {}),
      ...(brandDesc ? { brandDesc } : {}),
      ...(raw.industry ? { industry: String(raw.industry) } : {}),
      ...(raw.inputType ? { inputType: raw.inputType } : {}),
      ...(raw.text ? { text: String(raw.text) } : {}),
      platforms,
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  if (taskType === 'geo_technical') {
    return stripLegacyUrlFields({
      ...base,
      ...(Array.isArray(raw.pageUrls) && raw.pageUrls.length
        ? { pageUrls: (raw.pageUrls as unknown[]).map(String).slice(0, 50) }
        : {}),
      ...(Array.isArray(raw.modules) && raw.modules.length
        ? { modules: (raw.modules as unknown[]).map(String) }
        : {}),
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  if (taskType === 'geo_crawlers') {
    return stripLegacyUrlFields({
      ...base,
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  if (taskType === 'geo_content') {
    return stripLegacyUrlFields({
      ...base,
      ...(Array.isArray(raw.pageUrls) && raw.pageUrls.length
        ? { pageUrls: (raw.pageUrls as unknown[]).map(String).slice(0, 50) }
        : {}),
      ...(Array.isArray(raw.contentItems) && raw.contentItems.length
        ? {
            contentItems: (raw.contentItems as unknown[])
              .filter((item) => item && typeof item === 'object')
              .map((item) => {
                const row = item as Record<string, unknown>;
                return {
                  ...(row.id ? { id: String(row.id) } : {}),
                  ...(row.title ? { title: String(row.title) } : {}),
                  ...(row.body ? { body: String(row.body) } : {}),
                  ...(row.url ? { url: String(row.url) } : {}),
                };
              }),
          }
        : {}),
      ...(Array.isArray(raw.targetQuestions) && raw.targetQuestions.length
        ? { targetQuestions: (raw.targetQuestions as unknown[]).map(String) }
        : {}),
      ...(raw.contentItemId ? { contentItemId: String(raw.contentItemId) } : {}),
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  if (taskType === 'geo_compare') {
    return stripLegacyUrlFields({
      ...base,
      ...(raw.baselineReportId ? { baselineReportId: String(raw.baselineReportId) } : {}),
      ...(raw.currentReportId ? { currentReportId: String(raw.currentReportId) } : {}),
      ...(raw.baselineReport && typeof raw.baselineReport === 'object'
        ? { baselineReport: raw.baselineReport }
        : {}),
      ...(raw.currentReport && typeof raw.currentReport === 'object'
        ? { currentReport: raw.currentReport }
        : {}),
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  if (taskType === 'index_sampling') {
    const keywords = Array.isArray(raw.keywords)
      ? (raw.keywords as unknown[]).map(String).filter(Boolean)
      : [];
    const monitoringPrompts = Array.isArray(raw.monitoringPrompts)
      ? raw.monitoringPrompts
      : undefined;

    return stripLegacyUrlFields({
      ...base,
      ...(brandCity ? { brandCity } : {}),
      ...(productNames ? { productNames } : {}),
      ...(brandDesc ? { brandDesc } : {}),
      ...(raw.industry ? { industry: String(raw.industry) } : {}),
      ...(Array.isArray(raw.competitors) && raw.competitors.length
        ? { competitors: (raw.competitors as unknown[]).map(String) }
        : {}),
      platforms,
      ...(keywords.length ? { keywords } : {}),
      ...(monitoringPrompts ? { monitoringPrompts } : {}),
      ...(raw.planId ? { planId: String(raw.planId) } : {}),
      ...(raw.queryAt ? { queryAt: String(raw.queryAt) } : {}),
      ...(raw.scheduledAt ? { scheduledAt: String(raw.scheduledAt) } : {}),
      region: String(raw.region ?? 'CN'),
      language: String(raw.language ?? 'zh-Hans'),
      geoMarket: String(raw.geoMarket ?? 'domestic'),
      samplingMode: String(raw.samplingMode ?? 'live_browser'),
      ...(raw.probe === true ? { probe: true } : {}),
      ...(raw.brandId ? { brandId: String(raw.brandId) } : {}),
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  if (taskType === 'geo_platform_optimizer') {
    const queries = Array.isArray(raw.queries)
      ? (raw.queries as unknown[]).map(String).filter(Boolean)
      : Array.isArray(raw.targetQuestions)
        ? (raw.targetQuestions as unknown[]).map(String).filter(Boolean)
        : undefined;

    return stripLegacyUrlFields({
      ...base,
      ...(brandCity ? { brandCity } : {}),
      ...(productNames ? { productNames } : {}),
      ...(brandDesc ? { brandDesc } : {}),
      platforms,
      ...(queries?.length ? { queries } : {}),
      ...(sourceMaterials ? { sourceMaterials } : {}),
      ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
    });
  }

  // geo_quick_start 及默认 GEO 任务
  return stripLegacyUrlFields({
    ...base,
    ...(brandCity ? { brandCity } : {}),
    ...(productNames ? { productNames } : {}),
    ...(brandDesc ? { brandDesc } : {}),
    ...(raw.industry ? { industry: String(raw.industry) } : {}),
    ...(Array.isArray(raw.competitors) && raw.competitors.length
      ? { competitors: (raw.competitors as unknown[]).map(String) }
      : {}),
    platforms,
    ...(sourceMaterials ? { sourceMaterials } : {}),
    ...(raw.analysisDepth ? { analysisDepth: raw.analysisDepth } : {}),
    ...(raw.requestedOutputs ? { requestedOutputs: raw.requestedOutputs } : {}),
    ...(raw.plannedQuestions ? { plannedQuestions: raw.plannedQuestions } : {}),
    ...(raw.plannedModules ? { plannedModules: raw.plannedModules } : {}),
    ...(raw.preCrawlSnapshot ? { preCrawlSnapshot: raw.preCrawlSnapshot } : {}),
    ...(raw.ruleScorePreview ? { ruleScorePreview: raw.ruleScorePreview } : {}),
    ...(raw.outputContract ? { outputContract: raw.outputContract } : {}),
  });
}

/** @deprecated 请使用 normalizeGeoSkillInput；保留读取兼容 */
export function normalizeGeoTaskInput(
  input: Record<string, unknown>,
  brandName?: string,
  taskType = 'geo_quick_start'
): Record<string, unknown> {
  return normalizeGeoSkillInput(taskType, input, brandName);
}

export function resolveCanonicalWebsite(input: Record<string, unknown>): string {
  return resolveBrandUrl(applyAliasReads(input));
}

export function buildGeoWebsiteConstraint(input: Record<string, unknown>): string {
  const website = resolveCanonicalWebsite(input);
  if (!website) {
    return '【注意】用户未提供官网 URL。可做品牌可见度分析，但不得伪造「官网技术审计」结果，也不要擅自搜索并分析其他域名。';
  }
  return [
    '【硬性约束 · 官网 URL】',
    `- 用户指定的唯一目标官网：${website}`,
    '- Hermes 技能标准字段：brandUrl（已写入结构化参数）',
    '- 所有网页抓取、技术审计、Schema/llms.txt 检查必须基于上述 URL',
    '- 禁止根据品牌名搜索、猜测或替换为其他域名',
    '- 若该 URL 无法访问，在报告中明确说明失败原因，不要改用其他网站',
  ].join('\n');
}

export function normalizeGeoAgentTaskInput(task: AgentTask): Record<string, unknown> {
  return normalizeGeoSkillInput(task.type, task.input, task.brandName);
}

export function buildSkillPayloadForHermes(task: AgentTask): Record<string, unknown> {
  return normalizeGeoAgentTaskInput(task);
}
