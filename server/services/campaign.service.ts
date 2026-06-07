import { prisma } from '../db/client.js';
import { mapGeoReportRow } from './geo-audit.service.js';
import { CAMPAIGN_PLAN_PLATFORM_LABELS } from '../../lib/media-platforms.js';

function buildGeoReportTitle(input: {
  id: string;
  brandName: string;
  createdAt: Date;
  mentionRate?: number | null;
  rank?: number | null;
  gapsFound?: number | null;
  platforms?: string[];
  keywords?: string[];
  prospectMode?: boolean;
}): string {
  const timePart = input.createdAt.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const platforms = input.platforms ?? [];
  const keywords = input.keywords ?? [];
  const platPart = platforms.length
    ? platforms.length <= 2
      ? platforms.join('·')
      : `${platforms[0]}等${platforms.length}个AI平台`
    : '默认AI平台';
  const kwPart = keywords.length
    ? keywords.length === 1
      ? `词「${keywords[0]}」`
      : `词「${keywords[0]}」等${keywords.length}个`
    : '未指定关键词';
  const metricParts = [
    input.mentionRate != null ? `提及${input.mentionRate}%` : null,
    input.rank != null ? `排名#${input.rank}` : null,
    input.gapsFound != null ? `缺口${input.gapsFound}项` : null,
  ].filter(Boolean);
  const modePart = input.prospectMode ? '售前探店' : null;
  const idPart = input.id.slice(0, 8);
  return [
    input.brandName,
    'GEO分析',
    timePart,
    modePart,
    platPart,
    kwPart,
    metricParts.length ? metricParts.join(' ') : null,
    `#${idPart}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function toStoredText(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

export async function createGeoReport(input: {
  brandName: string;
  taskId?: string;
  mentionRate?: number;
  rank?: number;
  gapsFound?: number;
  platforms?: string[];
  keywords?: string[];
  prospectMode?: boolean;
  brandMentionSummary: unknown;
  competitorAnalysis: unknown;
  contentGap: unknown;
  optimizationSuggestions: unknown;
}) {
  const platforms = input.platforms ?? [];
  const keywords = input.keywords ?? [];
  const createdAt = new Date();
  const id = crypto.randomUUID();
  const title = buildGeoReportTitle({
    id,
    brandName: input.brandName,
    createdAt,
    mentionRate: input.mentionRate,
    rank: input.rank,
    gapsFound: input.gapsFound,
    platforms,
    keywords,
    prospectMode: input.prospectMode,
  });

  return prisma.geoReport.create({
    data: {
      id,
      brandName: input.brandName,
      title,
      taskId: input.taskId,
      mentionRate: input.mentionRate,
      rank: input.rank,
      gapsFound: input.gapsFound,
      platformsJson: platforms.length ? JSON.stringify(platforms) : null,
      keywordsJson: keywords.length ? JSON.stringify(keywords) : null,
      prospectMode: Boolean(input.prospectMode),
      brandMentionSummary: toStoredText(input.brandMentionSummary),
      competitorAnalysis: toStoredText(input.competitorAnalysis),
      contentGap: toStoredText(input.contentGap),
      optimizationSuggestions: toStoredText(input.optimizationSuggestions),
      createdAt,
    },
  });
}

export async function getGeoReport(id: string) {
  const row = await prisma.geoReport.findUnique({ where: { id } });
  return row ? mapGeoReportRow(row) : null;
}

export async function listGeoReports(brandName?: string, limit = 20) {
  const rows = await prisma.geoReport.findMany({
    where: brandName ? { brandName } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(mapGeoReportRow);
}

export function buildCampaignInputFromGeoReport(
  report: {
    id: string;
    mentionRate?: number | null;
    rank?: number | null;
    gapsFound?: number | null;
    brandMentionSummary: string;
    contentGap: string;
    optimizationSuggestions: string;
    findings?: Array<{ level?: string; title?: string; suggestion?: string }>;
    actionPlan?: Array<{ horizon?: string; title?: string; detail?: string }>;
  },
  overrides?: { platforms?: string[]; budgetMin?: number; budgetMax?: number }
) {
  const gaps = report.gapsFound ?? 5;
  const mention = report.mentionRate ?? 0;
  const topFindings = (report.findings ?? [])
    .slice(0, 3)
    .map((f) => `${f.level ?? 'P1'} ${f.title ?? ''}`)
    .filter(Boolean)
    .join('；');
  const topActions = (report.actionPlan ?? [])
    .filter((a) => a.horizon === '7d')
    .slice(0, 3)
    .map((a) => a.title)
    .filter(Boolean)
    .join('、');
  const gapBrief = report.contentGap.replace(/\s+/g, ' ').slice(0, 120);
  const goalParts = [
    `根据 GEO 诊断补内容缺口（提及率 ${mention}%，缺口 ${gaps} 项）`,
    topFindings ? `优先问题：${topFindings}` : null,
    topActions ? `7天行动：${topActions}` : null,
    gapBrief ? `内容缺口：${gapBrief}` : null,
  ].filter(Boolean);
  const goal = goalParts.join('；');
  return {
    geoReportId: report.id,
    goal,
    platforms: overrides?.platforms ?? [...CAMPAIGN_PLAN_PLATFORM_LABELS],
    budgetMin: overrides?.budgetMin ?? 3000,
    budgetMax: overrides?.budgetMax ?? 15000,
    gapsFound: gaps,
    mentionRate: mention,
    rank: report.rank ?? undefined,
    brandMentionSummary: report.brandMentionSummary,
    contentGap: report.contentGap,
    optimizationSuggestions: report.optimizationSuggestions,
    findings: report.findings ?? [],
    actionPlan: report.actionPlan ?? [],
    source: 'geo_report' as const,
  };
}

export function buildCampaignInputFromBrandProfile(
  brandName: string,
  overrides?: { budgetMin?: number; budgetMax?: number; supplementNotes?: string }
) {
  const supplement = overrides?.supplementNotes?.trim();
  const goal = supplement
    ? `${brandName} 品牌资料驱动投放：${supplement}`
    : `${brandName} 基于品牌资料制定多平台 GEO 内容投放方案`;
  return {
    source: 'brand_profile' as const,
    goal,
    platforms: [...CAMPAIGN_PLAN_PLATFORM_LABELS],
    budgetMin: overrides?.budgetMin ?? 5000,
    budgetMax: overrides?.budgetMax ?? 20000,
  };
}

export function buildCampaignInputFromIndexingGap(
  brandName: string,
  input: {
    sourceIndexPlanId: string;
    sourceIndexResultIds: string[];
    budgetMin?: number;
    budgetMax?: number;
    supplementNotes?: string;
  }
) {
  const sampleCount = input.sourceIndexResultIds.length;
  const supplement = input.supplementNotes?.trim();
  const goalParts = [
    `${brandName} 根据排名缺口制定补位投放（${sampleCount} 条采样）`,
    supplement,
  ].filter(Boolean);
  return {
    source: 'indexing_result' as const,
    sourceIndexPlanId: input.sourceIndexPlanId,
    sourceIndexResultIds: input.sourceIndexResultIds,
    goal: goalParts.join('；'),
    platforms: [...CAMPAIGN_PLAN_PLATFORM_LABELS],
    budgetMin: input.budgetMin ?? 5000,
    budgetMax: input.budgetMax ?? 20000,
  };
}

export async function updateCampaignPlanPackages(
  planId: string,
  packages: Array<{
    id: string;
    name?: string;
    platform?: string;
    quantity?: number;
    unitPrice?: number | null;
    budget?: number;
    deliverable?: string;
    acceptance?: string;
  }>
) {
  for (const pkg of packages) {
    const quantity = Math.max(1, Math.round(pkg.quantity ?? 1));
    const budget =
      pkg.budget != null
        ? Math.max(0, Math.round(pkg.budget))
        : pkg.unitPrice != null
          ? Math.round(Number(pkg.unitPrice) * quantity)
          : undefined;
    const unitPrice =
      pkg.unitPrice != null
        ? Number(pkg.unitPrice)
        : budget != null && quantity > 0
          ? Math.round(budget / quantity)
          : undefined;
    await prisma.taskPackageDraft.update({
      where: { id: pkg.id },
      data: {
        ...(pkg.name != null ? { name: pkg.name } : {}),
        ...(pkg.platform != null ? { platform: pkg.platform } : {}),
        quantity,
        ...(unitPrice != null ? { unitPrice } : {}),
        ...(budget != null ? { budget } : {}),
        ...(pkg.deliverable != null ? { deliverable: pkg.deliverable } : {}),
        ...(pkg.acceptance != null ? { acceptance: pkg.acceptance } : {}),
      },
    });
  }
  return getCampaignPlan(planId);
}

export async function createCampaignPlan(input: {
  brandName: string;
  goal: string;
  platforms: string[];
  budgetMin: number;
  budgetMax: number;
  taskId?: string;
  packages?: Array<{
    name: string;
    platform: string;
    payeeType: string;
    quantity?: number;
    unitPrice?: number;
    budget: number;
    deliverable: string;
    acceptance: string;
    publishToLobby?: boolean;
  }>;
}) {
  return prisma.campaignPlan.create({
    data: {
      brandName: input.brandName,
      goal: input.goal,
      platforms: JSON.stringify(input.platforms),
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      taskId: input.taskId,
      status: 'draft',
      packages: input.packages
        ? {
            create: input.packages.map((p) => {
              const quantity = Math.max(1, Math.round(p.quantity ?? 1));
              const unitPrice =
                p.unitPrice != null
                  ? p.unitPrice
                  : quantity > 0
                    ? Math.round(p.budget / quantity)
                    : p.budget;
              const budget = Math.round(unitPrice * quantity);
              return {
                name: p.name,
                platform: p.platform,
                payeeType: p.payeeType,
                quantity,
                unitPrice,
                budget,
                deliverable: p.deliverable,
                acceptance: p.acceptance,
                publishToLobby: p.publishToLobby ?? true,
              };
            }),
          }
        : undefined,
    },
    include: { packages: true },
  });
}

export async function getCampaignPlan(id: string) {
  return prisma.campaignPlan.findUnique({ where: { id }, include: { packages: true } });
}

export async function listCampaignPlans(brandName?: string) {
  return prisma.campaignPlan.findMany({
    where: brandName ? { brandName } : {},
    include: { packages: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function publishCampaignPlan(planId: string, brandName: string) {
  const plan = await prisma.campaignPlan.findUnique({
    where: { id: planId },
    include: { packages: true },
  });
  if (!plan) throw new Error('计划不存在');

  const totalBudget = plan.packages.reduce((s, p) => s + p.budget, 0);
  const orders = [];
  for (const pkg of plan.packages.filter((p) => p.publishToLobby)) {
    const order = await prisma.taskOrder.create({
      data: {
        brandName,
        title: pkg.name,
        type: pkg.payeeType,
        platform: pkg.platform,
        budget: pkg.budget,
        deliverable: pkg.deliverable,
        acceptance: pkg.acceptance,
        status: 'published',
      },
    });
    orders.push(order);
  }

  await prisma.campaignPlan.update({ where: { id: planId }, data: { status: 'published' } });
  return { plan, orders, totalBudget };
}
