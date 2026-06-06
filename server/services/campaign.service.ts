import { prisma } from '../db/client.js';
import { mapGeoReportRow } from './geo-audit.service.js';

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
  },
  overrides?: { platforms?: string[]; budgetMin?: number; budgetMax?: number }
) {
  const gaps = report.gapsFound ?? 5;
  const mention = report.mentionRate ?? 0;
  const gapBrief = report.contentGap.replace(/\s+/g, ' ').slice(0, 160);
  const goal = `根据 GEO 诊断补内容缺口（提及率 ${mention}%，缺口 ${gaps} 项）：${gapBrief}`;
  return {
    geoReportId: report.id,
    goal,
    platforms: overrides?.platforms ?? ['小红书', '知乎'],
    budgetMin: overrides?.budgetMin ?? 3000,
    budgetMax: overrides?.budgetMax ?? 15000,
    gapsFound: gaps,
    mentionRate: mention,
    rank: report.rank ?? undefined,
    brandMentionSummary: report.brandMentionSummary,
    contentGap: report.contentGap,
    optimizationSuggestions: report.optimizationSuggestions,
    source: 'geo_report' as const,
  };
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
