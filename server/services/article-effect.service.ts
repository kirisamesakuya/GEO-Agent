import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';

export type EffectJudgment = 'pending' | 'observing' | 'effective' | 'no_change';

export interface EffectBaseline {
  source: 'indexing_result';
  capturedAt: string;
  sourceIndexPlanId: string;
  sourceIndexResultIds: string[];
  targetQuestions: string[];
  targetPlatforms: string[];
  brandMentionRate: number;
  competitorMentions: string[];
  answerSnapshots: Array<{
    platform: string;
    question: string;
    brandMentioned: boolean;
    rank: number | null;
    summary: string;
  }>;
}

export interface EffectVerification {
  enabled: boolean;
  scheduleDays: number[];
  retestPlanIds: Record<string, string>;
  checkpoints: Record<
    string,
    {
      status: 'pending' | 'scheduled' | 'done';
      scheduledAt?: string;
      planId?: string;
      brandMentionRate?: number;
      hitCount?: number;
      sampleCount?: number;
      judgment?: EffectJudgment;
      completedAt?: string;
    }
  >;
  overallJudgment: EffectJudgment;
  publishUrl?: string;
  publishRecordId?: string;
  publishedAt?: string;
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractCompetitors(snippet?: string | null): string[] {
  if (!snippet) return [];
  const matches = snippet.match(/竞品\s*([A-Za-z0-9\u4e00-\u9fa5]+)/g) ?? [];
  return matches.map((m) => m.replace(/^竞品\s*/, '')).slice(0, 3);
}

export function buildEffectBaselineFromResults(
  planId: string,
  results: Array<{
    id: string;
    keyword: string;
    platform: string;
    hit: boolean;
    citedMerchant: boolean;
    citationSnippet?: string | null;
  }>
): EffectBaseline {
  const targetQuestions = [...new Set(results.map((r) => r.keyword))];
  const targetPlatforms = [...new Set(results.map((r) => r.platform))];
  const mentionCount = results.filter((r) => r.hit || r.citedMerchant).length;
  const brandMentionRate =
    results.length > 0 ? Math.round((mentionCount / results.length) * 100) : 0;

  const competitors = new Set<string>();
  for (const r of results) {
    for (const c of extractCompetitors(r.citationSnippet)) competitors.add(c);
    if (!r.hit && r.citationSnippet) {
      const generic = r.citationSnippet.match(/([A-Za-z0-9\u4e00-\u9fa5]{2,8})(?:口腔|牙科|医院)/);
      if (generic?.[1]) competitors.add(generic[1]);
    }
  }

  return {
    source: 'indexing_result',
    capturedAt: new Date().toISOString(),
    sourceIndexPlanId: planId,
    sourceIndexResultIds: results.map((r) => r.id),
    targetQuestions,
    targetPlatforms,
    brandMentionRate,
    competitorMentions: [...competitors],
    answerSnapshots: results.map((r) => ({
      platform: r.platform,
      question: r.keyword,
      brandMentioned: r.hit || r.citedMerchant,
      rank: null,
      summary: r.citationSnippet?.slice(0, 120) ?? (r.hit ? '品牌已提及' : '品牌未提及'),
    })),
  };
}

export function computeEffectJudgment(
  baseline: EffectBaseline,
  afterMentionRate: number,
  checkpointDay: number
): EffectJudgment {
  if (checkpointDay < 30) {
    if (afterMentionRate > baseline.brandMentionRate) return 'observing';
    return 'pending';
  }
  if (afterMentionRate > baseline.brandMentionRate + 10) return 'effective';
  if (afterMentionRate > baseline.brandMentionRate) return 'observing';
  return 'no_change';
}

export async function createArticleEffectRetestPlans(input: {
  brandName: string;
  contentItemId: string;
  publishRecordId?: string;
  publishUrl?: string;
  baseline: EffectBaseline;
  scheduleDays?: number[];
  publishedAt?: Date;
}): Promise<EffectVerification> {
  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');

  const scheduleDays = input.scheduleDays ?? [7, 14, 30];
  const publishedAt = input.publishedAt ?? new Date();
  const retestPlanIds: Record<string, string> = {};
  const checkpoints: EffectVerification['checkpoints'] = {};

  for (const days of scheduleDays) {
    const scheduledAt = new Date(publishedAt);
    scheduledAt.setDate(scheduledAt.getDate() + days);
    const label = input.baseline.targetQuestions[0]?.slice(0, 24) ?? '补缺文章';
    const plan = await prisma.indexQueryPlan.create({
      data: {
        brandId: brand.id,
        name: `文章效果复测 T+${days}：${label}`,
        platforms: JSON.stringify(input.baseline.targetPlatforms),
        keywordIds: JSON.stringify(input.baseline.targetQuestions),
        status: 'draft',
        queryAt: publishedAt,
        scheduledAt,
        verificationType: 'article_effect',
        sourceContentItemId: input.contentItemId,
        sourcePublishRecordId: input.publishRecordId ?? null,
        baselineResultIdsJson: JSON.stringify(input.baseline.sourceIndexResultIds),
      },
    });
    retestPlanIds[String(days)] = plan.id;
    checkpoints[String(days)] = {
      status: 'scheduled',
      scheduledAt: scheduledAt.toISOString(),
      planId: plan.id,
    };
  }

  const verification: EffectVerification = {
    enabled: true,
    scheduleDays,
    retestPlanIds,
    checkpoints,
    overallJudgment: 'observing',
    publishUrl: input.publishUrl,
    publishRecordId: input.publishRecordId,
    publishedAt: publishedAt.toISOString(),
  };

  await prisma.contentItem.update({
    where: { id: input.contentItemId },
    data: { effectVerificationJson: JSON.stringify(verification) },
  });

  return verification;
}

export async function updateArticleEffectFromRetest(planId: string): Promise<void> {
  const plan = await prisma.indexQueryPlan.findUnique({
    where: { id: planId },
    include: { results: true },
  });
  if (!plan?.sourceContentItemId || plan.verificationType !== 'article_effect') return;

  const item = await prisma.contentItem.findUnique({ where: { id: plan.sourceContentItemId } });
  if (!item) return;

  const baseline = parseJson<EffectBaseline>(item.effectBaselineJson);
  const verification = parseJson<EffectVerification>(item.effectVerificationJson);
  if (!baseline || !verification) return;

  const dayKey = Object.entries(verification.retestPlanIds).find(([, id]) => id === planId)?.[0];
  if (!dayKey) return;

  const samples = plan.results;
  const mentionCount = samples.filter((r) => r.hit || r.citedMerchant).length;
  const mentionRate = samples.length ? Math.round((mentionCount / samples.length) * 100) : 0;
  const judgment = computeEffectJudgment(baseline, mentionRate, Number(dayKey));

  verification.checkpoints[dayKey] = {
    ...verification.checkpoints[dayKey],
    status: 'done',
    brandMentionRate: mentionRate,
    hitCount: mentionCount,
    sampleCount: samples.length,
    judgment,
    completedAt: new Date().toISOString(),
  };

  const doneJudgments = Object.values(verification.checkpoints)
    .filter((c) => c.status === 'done')
    .map((c) => c.judgment);
  if (doneJudgments.includes('effective')) verification.overallJudgment = 'effective';
  else if (Number(dayKey) >= 30 && judgment === 'no_change') verification.overallJudgment = 'no_change';
  else verification.overallJudgment = 'observing';

  await prisma.contentItem.update({
    where: { id: item.id },
    data: { effectVerificationJson: JSON.stringify(verification) },
  });
}

export async function getContentItemEffectSummary(contentItemId: string) {
  const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
  if (!item) return null;
  return {
    contentItemId: item.id,
    title: item.title,
    baseline: parseJson<EffectBaseline>(item.effectBaselineJson),
    verification: parseJson<EffectVerification>(item.effectVerificationJson),
    generationMeta: parseJson<Record<string, unknown>>(item.generationMetaJson),
  };
}

export async function listArticleEffectsForReport(geoReportId: string) {
  const items = await prisma.contentItem.findMany({
    where: {
      generationMetaJson: { contains: geoReportId },
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  const fromIndexing = await prisma.contentItem.findMany({
    where: { effectBaselineJson: { not: null } },
    take: 50,
    orderBy: { updatedAt: 'desc' },
  });
  const merged = [...items, ...fromIndexing.filter((i) => !items.some((x) => x.id === i.id))];
  return merged
    .filter((i) => i.effectBaselineJson || i.effectVerificationJson)
    .slice(0, 20)
    .map((item) => ({
      contentItemId: item.id,
      title: item.title,
      platform: item.platform,
      baseline: parseJson<EffectBaseline>(item.effectBaselineJson),
      verification: parseJson<EffectVerification>(item.effectVerificationJson),
      generationMeta: parseJson<Record<string, unknown>>(item.generationMetaJson),
    }));
}

export async function getIndexResultsByIds(ids: string[]) {
  if (!ids.length) return [];
  return prisma.indexResult.findMany({ where: { id: { in: ids } } });
}

export interface ArticleEffectTodo {
  id: string;
  type: string;
  label: string;
  priority: string;
  targetView: string;
  targetHint?: string;
  contentItemId?: string;
  count?: number;
}

export async function listArticleEffectTodos(brandName: string): Promise<ArticleEffectTodo[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];

  const items = await prisma.contentItem.findMany({
    where: {
      batch: { brandName: brand.name },
      effectVerificationJson: { not: null },
    },
    select: { id: true, title: true, effectVerificationJson: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const planIds = new Set<string>();
  const pending: Array<{
    itemId: string;
    title: string;
    day: string;
    planId: string;
    scheduledAt?: string;
  }> = [];

  for (const item of items) {
    const verification = parseJson<EffectVerification>(item.effectVerificationJson);
    if (!verification) continue;
    for (const [day, cp] of Object.entries(verification.checkpoints)) {
      if (cp.status === 'done' || !cp.planId) continue;
      planIds.add(cp.planId);
      pending.push({
        itemId: item.id,
        title: item.title,
        day,
        planId: cp.planId,
        scheduledAt: cp.scheduledAt,
      });
    }
  }

  if (!pending.length) return [];

  const plans = await prisma.indexQueryPlan.findMany({
    where: { id: { in: [...planIds] } },
    select: { id: true, status: true, scheduledAt: true },
  });
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const now = new Date();
  const todos: ArticleEffectTodo[] = [];

  for (const row of pending) {
    const plan = planMap.get(row.planId);
    if (!plan) continue;
    const dueAt = row.scheduledAt
      ? new Date(row.scheduledAt)
      : plan.scheduledAt ?? null;
    const isFailed = plan.status === 'failed';
    const isDue = plan.status !== 'done' && dueAt !== null && dueAt <= now;
    if (!isFailed && !isDue) continue;

    const shortTitle = row.title.slice(0, 16);
    todos.push({
      id: `article-effect-${row.itemId}-t${row.day}`,
      type: isFailed ? 'article_effect_retest_failed' : 'article_effect_retest_due',
      label: isFailed
        ? `T+${row.day} 文章效果复测失败：${shortTitle}`
        : `T+${row.day} 文章效果复测待执行：${shortTitle}`,
      priority: isFailed ? 'P0' : 'P1',
      targetView: 'content_library',
      targetHint: `content:${row.itemId}`,
    });
  }

  return todos;
}

export interface GapCoverageLink {
  question: string;
  contentItemId: string;
  title: string;
  overallJudgment: EffectJudgment;
}

export async function listGapCoverageForPlan(
  brandName: string,
  planId: string
): Promise<GapCoverageLink[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];

  const items = await prisma.contentItem.findMany({
    where: {
      batch: { brandName: brand.name },
      effectBaselineJson: { not: null },
    },
    select: {
      id: true,
      title: true,
      effectBaselineJson: true,
      effectVerificationJson: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const byQuestion = new Map<string, GapCoverageLink>();
  for (const item of items) {
    const baseline = parseJson<EffectBaseline>(item.effectBaselineJson);
    if (!baseline || baseline.sourceIndexPlanId !== planId) continue;
    const verification = parseJson<EffectVerification>(item.effectVerificationJson);
    for (const question of baseline.targetQuestions) {
      if (!byQuestion.has(question)) {
        byQuestion.set(question, {
          question,
          contentItemId: item.id,
          title: item.title,
          overallJudgment: verification?.overallJudgment ?? 'observing',
        });
      }
    }
  }
  return [...byQuestion.values()];
}
