import { parseIndexCitationUrls, type IndexCitationLink } from '../../lib/index-result-payload.js';
import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';
import { extractMonitoringPrompts } from '../lib/task-business-output.js';
import { createAndEnqueueTask } from '../agent/worker.js';

export type { IndexCitationLink };

export interface IndexPlanDto {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  platforms: string[];
  keywordIds: string[];
  keywords: string[];
  status: string;
  taskId?: string;
  createdAt: string;
  updatedAt?: string;
  queryAt: string;
  scheduledAt?: string;
  scheduleFrequency?: string;
  scheduleRunTime?: string;
  scheduleWeekday?: number;
  scheduleMonthDay?: number;
  resultCount?: number;
  hitCount?: number;
}

export interface IndexResultDto {
  id: string;
  planId: string;
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant: boolean;
  citationSnippet?: string;
  aiResponse?: string;
  citationUrls: IndexCitationLink[];
  sampledAt: string;
}

function mapPlan(
  row: {
    id: string;
    brandId: string;
    name: string;
    platforms: string;
    keywordIds: string;
    status: string;
    taskId: string | null;
    queryAt: Date;
    scheduledAt: Date | null;
    scheduleFrequency: string | null;
    scheduleRunTime: string | null;
    scheduleWeekday: number | null;
    scheduleMonthDay: number | null;
    createdAt: Date;
    updatedAt?: Date;
    brand?: { name: string };
    _count?: { results: number };
  },
  keywords: string[] = []
): IndexPlanDto {
  return {
    id: row.id,
    brandId: row.brandId,
    brandName: row.brand?.name ?? '',
    name: row.name,
    platforms: JSON.parse(row.platforms || '[]') as string[],
    keywordIds: JSON.parse(row.keywordIds || '[]') as string[],
    keywords,
    status: row.status,
    taskId: row.taskId ?? undefined,
    queryAt: row.queryAt.toISOString(),
    scheduledAt: row.scheduledAt?.toISOString(),
    scheduleFrequency: row.scheduleFrequency ?? undefined,
    scheduleRunTime: row.scheduleRunTime ?? undefined,
    scheduleWeekday: row.scheduleWeekday ?? undefined,
    scheduleMonthDay: row.scheduleMonthDay ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
    resultCount: row._count?.results,
  };
}

function mapResult(row: {
  id: string;
  planId: string;
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant: boolean;
  citationSnippet: string | null;
  aiResponse: string | null;
  citationUrls: string | null;
  sampledAt: Date;
}): IndexResultDto {
  const citationUrls = parseIndexCitationUrls(row.citationUrls);
  return {
    id: row.id,
    planId: row.planId,
    keyword: row.keyword,
    platform: row.platform,
    hit: row.hit,
    citedMerchant: row.citedMerchant,
    citationSnippet: row.citationSnippet ?? undefined,
    aiResponse: row.aiResponse ?? row.citationSnippet ?? undefined,
    citationUrls,
    sampledAt: row.sampledAt.toISOString(),
  };
}

export async function listIndexPlans(brandName: string): Promise<IndexPlanDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];

  const { ensureDemoPublisherSnapshot } = await import('../db/demo-publisher-snapshot.js');
  await ensureDemoPublisherSnapshot(brandName);
  const rows = await prisma.indexQueryPlan.findMany({
    where: { brandId: brand.id },
    include: { brand: true, _count: { select: { results: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const plans: IndexPlanDto[] = [];
  for (const row of rows) {
    const kwIds = JSON.parse(row.keywordIds || '[]') as string[];
    let keywords: string[] = [];
    if (kwIds.length) {
      const entries = await prisma.keywordEntry.findMany({
        where: { id: { in: kwIds } },
      });
      keywords = entries.map((e) => e.term);
      if (!keywords.length) keywords = kwIds;
    }
    const hits = await prisma.indexResult.count({
      where: { planId: row.id, hit: true },
    });
    plans.push({ ...mapPlan(row, keywords), hitCount: hits });
  }
  return plans;
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value == null || value === '') return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseScheduleWeekday(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) return undefined;
  return n;
}

function parseScheduleMonthDay(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 28) return undefined;
  return n;
}

/** 根据周期与时间点推算下一次计划执行（本地日历近似） */
function computeNextScheduledAt(
  frequency: string,
  runTime: string,
  weekday?: number,
  monthDay?: number
): Date | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(runTime.trim());
  if (!m) return undefined;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return undefined;

  const next = new Date();
  next.setSeconds(0, 0);

  if (frequency === 'hourly') {
    next.setMinutes(minute, 0, 0);
    if (next <= new Date()) next.setHours(next.getHours() + 1);
    return next;
  }

  next.setHours(hour, minute, 0, 0);

  if (frequency === 'daily') {
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    return next;
  }

  if (frequency === 'weekly' && weekday !== undefined) {
    const current = next.getDay();
    let delta = (weekday - current + 7) % 7;
    if (delta === 0 && next <= new Date()) delta = 7;
    next.setDate(next.getDate() + delta);
    return next;
  }

  if (frequency === 'monthly' && monthDay !== undefined) {
    next.setDate(monthDay);
    if (next <= new Date()) next.setMonth(next.getMonth() + 1);
    return next;
  }

  return undefined;
}

export async function createIndexPlan(
  brandName: string,
  data: {
    name: string;
    platforms: string[];
    keywordIds: string[];
    queryAt?: string;
    scheduleFrequency?: string;
    scheduleRunTime?: string;
    scheduleWeekday?: number;
    scheduleMonthDay?: number;
  }
): Promise<IndexPlanDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const queryAt = parseOptionalDate(data.queryAt) ?? new Date();
  const freq = typeof data.scheduleFrequency === 'string' ? data.scheduleFrequency.trim() : '';
  const runTime = typeof data.scheduleRunTime === 'string' ? data.scheduleRunTime.trim() : '';
  const weekday = parseScheduleWeekday(data.scheduleWeekday);
  const monthDay = parseScheduleMonthDay(data.scheduleMonthDay);

  let scheduledAt: Date | undefined;
  let scheduleFrequency: string | null = null;
  let scheduleRunTime: string | null = null;
  let scheduleWeekday: number | null = null;
  let scheduleMonthDay: number | null = null;

  if (freq && runTime) {
    if (freq === 'weekly' && weekday === undefined) {
      throw new Error('每周执行需选择星期');
    }
    if (freq === 'monthly' && monthDay === undefined) {
      throw new Error('每月执行需选择日期');
    }
    scheduledAt = computeNextScheduledAt(freq, runTime, weekday, monthDay);
    scheduleFrequency = freq;
    scheduleRunTime = runTime;
    scheduleWeekday = freq === 'weekly' ? (weekday ?? null) : null;
    scheduleMonthDay = freq === 'monthly' ? (monthDay ?? null) : null;
  }

  const row = await prisma.indexQueryPlan.create({
    data: {
      brandId: brand.id,
      name: data.name,
      platforms: JSON.stringify(data.platforms),
      keywordIds: JSON.stringify(data.keywordIds),
      status: 'draft',
      queryAt,
      scheduledAt: scheduledAt ?? null,
      scheduleFrequency,
      scheduleRunTime,
      scheduleWeekday,
      scheduleMonthDay,
    },
    include: { brand: true },
  });
  return mapPlan(row);
}

export async function runIndexPlan(planId: string, brandName: string): Promise<IndexPlanDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const plan = await prisma.indexQueryPlan.findFirst({
    where: { id: planId, brandId: brand.id },
    include: { brand: true },
  });
  if (!plan) throw new Error('计划不存在');

  const kwIds = JSON.parse(plan.keywordIds || '[]') as string[];
  const entries = await prisma.keywordEntry.findMany({ where: { id: { in: kwIds } } });
  const keywords = entries.length ? entries.map((e) => e.term) : kwIds;
  const platforms = JSON.parse(plan.platforms || '[]') as string[];
  let monitoringPrompts: string[] = [];
  if (kwIds.length) {
    const miningTask = await prisma.agentTask.findFirst({
      where: {
        brandName: brand.name,
        type: 'keyword_mining',
        status: { in: ['succeeded', 'partial'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (miningTask?.output) {
      try {
        monitoringPrompts = extractMonitoringPrompts(
          JSON.parse(miningTask.output) as Record<string, unknown>
        );
      } catch {
        monitoringPrompts = [];
      }
    }
  }
  let competitors: string[] = [];
  try {
    competitors = JSON.parse(brand.competitors || '[]') as string[];
  } catch {
    competitors = [];
  }

  const task = await createAndEnqueueTask({
    type: 'index_sampling',
    title: `AI 监测采样：${plan.name}`,
    brandName: brand.name,
    input: {
      planId: plan.id,
      keywords,
      ...(monitoringPrompts.length ? { monitoringPrompts } : {}),
      platforms,
      brandUrl: brand.website?.trim() || undefined,
      industry: brand.industry || undefined,
      brandCity: brand.city || undefined,
      brandDesc: brand.description || undefined,
      competitors: competitors.length ? competitors : undefined,
      queryAt: plan.queryAt.toISOString(),
      scheduledAt: plan.scheduledAt?.toISOString(),
      region: 'CN',
      language: 'zh-Hans',
      geoMarket: 'domestic',
      samplingMode: 'live_browser',
    },
    businessRef: plan.id,
  });

  const updated = await prisma.indexQueryPlan.update({
    where: { id: planId },
    data: { status: 'running', taskId: task.id },
    include: { brand: true },
  });
  return mapPlan(updated, keywords);
}

function serializeCitationUrls(
  urls?: IndexCitationLink[] | string
): string | null {
  if (!urls) return null;
  if (typeof urls === 'string') return urls;
  return urls.length ? JSON.stringify(urls) : null;
}

export async function saveIndexResults(
  planId: string,
  results: Array<{
    keyword: string;
    platform: string;
    hit: boolean;
    citedMerchant?: boolean;
    citationSnippet?: string;
    aiResponse?: string;
    citationUrls?: IndexCitationLink[] | string;
  }>
): Promise<void> {
  await prisma.indexResult.deleteMany({ where: { planId } });
  if (results.length) {
    await prisma.indexResult.createMany({
      data: results.map((r) => ({
        planId,
        keyword: r.keyword,
        platform: r.platform,
        hit: r.hit,
        citedMerchant: r.citedMerchant ?? false,
        citationSnippet: r.citationSnippet ?? null,
        aiResponse: r.aiResponse ?? null,
        citationUrls: serializeCitationUrls(r.citationUrls),
      })),
    });
  }
  await prisma.indexQueryPlan.update({
    where: { id: planId },
    data: { status: 'done' },
  });
}

export async function listIndexResults(opts?: {
  brandName?: string;
  planId?: string;
  platform?: string;
  hit?: boolean;
  limit?: number;
}): Promise<IndexResultDto[]> {
  const where: Record<string, unknown> = {};
  if (opts?.planId) where.planId = opts.planId;
  if (opts?.platform) where.platform = opts.platform;
  if (opts?.hit !== undefined) where.hit = opts.hit;

  if (opts?.brandName) {
    const brand = await findBrandRow(opts.brandName);
    if (!brand) return [];
    const plans = await prisma.indexQueryPlan.findMany({
      where: { brandId: brand.id },
      select: { id: true },
    });
    where.planId = { in: plans.map((p) => p.id) };
  }

  const rows = await prisma.indexResult.findMany({
    where,
    orderBy: { sampledAt: 'desc' },
    take: opts?.limit ?? 100,
  });
  return rows.map(mapResult);
}

export async function markIndexPlanFailed(planId: string): Promise<void> {
  await prisma.indexQueryPlan.updateMany({
    where: { id: planId, status: 'running' },
    data: { status: 'failed' },
  });
}

export async function getIndexPlan(planId: string): Promise<IndexPlanDto | null> {
  const row = await prisma.indexQueryPlan.findUnique({
    where: { id: planId },
    include: { brand: true, _count: { select: { results: true } } },
  });
  if (!row) return null;
  const kwIds = JSON.parse(row.keywordIds || '[]') as string[];
  const entries = await prisma.keywordEntry.findMany({ where: { id: { in: kwIds } } });
  const keywords = entries.length ? entries.map((e) => e.term) : kwIds;
  return mapPlan(row, keywords);
}

export interface IndexingGapAnalysisDto {
  planId: string;
  planName: string;
  planStatus: string;
  totalCount: number;
  hitCount: number;
  gapCount: number;
  gapResultIds: string[];
  targetQuestions: string[];
  targetPlatforms: string[];
  brandMentionRate: number;
  competitorMentions: string[];
  hasResults: boolean;
}

/** 自动梳理查询计划中的排名缺口（未命中采样） */
export async function analyzeIndexingPlanGap(planId: string): Promise<IndexingGapAnalysisDto | null> {
  const plan = await getIndexPlan(planId);
  if (!plan) return null;

  const allResults = await listIndexResults({ planId });
  const hitCount = allResults.filter((r) => r.hit).length;
  const gapResults = allResults.filter((r) => !r.hit);

  const { buildEffectBaselineFromResults } = await import('./article-effect.service.js');
  const baseline =
    gapResults.length > 0
      ? buildEffectBaselineFromResults(planId, gapResults)
      : allResults.length > 0
        ? buildEffectBaselineFromResults(planId, allResults)
        : null;

  return {
    planId: plan.id,
    planName: plan.name,
    planStatus: plan.status,
    totalCount: allResults.length,
    hitCount,
    gapCount: gapResults.length,
    gapResultIds: gapResults.map((r) => r.id),
    targetQuestions: baseline?.targetQuestions ?? [],
    targetPlatforms: baseline?.targetPlatforms ?? plan.platforms,
    brandMentionRate: baseline?.brandMentionRate ?? 0,
    competitorMentions: baseline?.competitorMentions ?? [],
    hasResults: allResults.length > 0,
  };
}

export async function resolveIndexingGapResultIds(
  planId: string,
  explicitIds?: string[]
): Promise<string[]> {
  if (explicitIds?.length) return explicitIds;
  const analysis = await analyzeIndexingPlanGap(planId);
  return analysis?.gapResultIds ?? [];
}
