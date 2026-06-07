import { prisma } from '../db/client.js';
import {
  getBrandProfile,
  checkBrandCompleteness,
  listAccounts,
  findBrandRow,
} from './brand.service.js';
import { getAiCredits } from './ai-credits.service.js';
import { listKnowledge } from './knowledge.service.js';
import { listArticleEffectTodos } from './article-effect.service.js';

import { GEO_AI_PLATFORM_LABELS } from '../../lib/media-platforms.js';
const CREDITS_LOW_THRESHOLD = 50;
const REAUTH_DAYS = 7;

export interface PublisherTodo {
  id: string;
  type: string;
  label: string;
  priority: string;
  targetView: string;
  targetHint?: string;
  count?: number;
}

export interface PublisherDashboard {
  brandName: string;
  metrics: {
    totalPublished: number;
    todayPublished: number;
    articlesGenerated: number;
    indexedKeywords: number;
    platformHitRate: number;
    brandMentionRate: number;
  };
  platformShare: Array<{ platform: string; count: number }>;
  indexByKeyword: Array<{ keyword: string; hits: number }>;
  publishTrend: Array<{ date: string; count: number }>;
  indexTrend: Array<{ date: string; count: number }>;
  recentIndexResults: Array<{
    id: string;
    keyword: string;
    platform: string;
    hit: boolean;
    citedMerchant: boolean;
    sampledAt: string;
    planId: string;
  }>;
  todos: PublisherTodo[];
  samplingNote: string;
  geoInsight: {
    latestReportId: string | null;
    analyzedAt: string | null;
    mentionRate: number;
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getPublisherDashboard(brandName: string): Promise<PublisherDashboard | null> {
  const brand = await findBrandRow(brandName);
  if (!brand) return null;

  const { ensureDemoPublisherSnapshot } = await import('../db/demo-publisher-snapshot.js');
  await ensureDemoPublisherSnapshot(brandName);

  const today = startOfDay(new Date());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const planIds = (
    await prisma.indexQueryPlan.findMany({
      where: { brandId: brand.id },
      select: { id: true },
    })
  ).map((p) => p.id);

  const [
    contentItems,
    publishTasks,
    indexResults,
    latestGeo,
    profile,
    knowledge,
    accounts,
    failedTasks,
    readyBatches,
    credits,
  ] = await Promise.all([
    prisma.contentItem.findMany({
      where: { batch: { brandName: brand.name } },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.agentTask.findMany({
      where: {
        brandName: brand.name,
        type: 'hermes_publish',
        status: 'succeeded',
      },
      select: { finishedAt: true, createdAt: true },
    }),
    planIds.length
      ? prisma.indexResult.findMany({
          where: { planId: { in: planIds } },
          orderBy: { sampledAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.geoReport.findFirst({
      where: { brandName: brand.name },
      orderBy: { createdAt: 'desc' },
    }),
    getBrandProfile(brand.name),
    listKnowledge(brand.name),
    listAccounts(brand.name),
    prisma.agentTask.count({
      where: { brandName: brand.name, status: 'failed' },
    }),
    prisma.contentBatch.count({
      where: { brandName: brand.name, status: 'ready' },
    }),
    getAiCredits(brand.name),
  ]);

  const publishedItems = contentItems.filter((i) => i.status === 'published');
  const publishRecords = await prisma.publishRecord.count({
    where: { brandId: brand.id, status: 'succeeded' },
  });
  const totalPublished =
    publishedItems.length + publishTasks.length + publishRecords;

  const todayPublished =
    publishTasks.filter((t) => {
      const d = t.finishedAt ?? t.createdAt;
      return d >= today;
    }).length +
    publishedItems.filter((i) => i.updatedAt >= today).length;

  const hitResults = indexResults.filter((r) => r.hit);
  const indexedKeywords = new Set(hitResults.map((r) => r.keyword)).size;
  const totalSamples = indexResults.length;
  const platformHitRate =
    totalSamples > 0 ? Math.round((hitResults.length / totalSamples) * 100) : 0;

  const platformCounts = new Map<string, number>();
  for (const r of hitResults) {
    platformCounts.set(r.platform, (platformCounts.get(r.platform) ?? 0) + 1);
  }
  const platformShare = GEO_AI_PLATFORM_LABELS.map((p) => ({
    platform: p,
    count: platformCounts.get(p) ?? 0,
  })).filter((x) => x.count > 0);
  if (platformShare.length === 0 && hitResults.length) {
    for (const [platform, count] of platformCounts) {
      platformShare.push({ platform, count });
    }
  }

  const kwHits = new Map<string, number>();
  for (const r of hitResults) {
    kwHits.set(r.keyword, (kwHits.get(r.keyword) ?? 0) + 1);
  }
  const indexByKeyword = [...kwHits.entries()]
    .map(([keyword, hits]) => ({ keyword, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10);

  const publishTrend: Array<{ date: string; count: number }> = [];
  const indexTrend: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    publishTrend.push({
      date: key,
      count: contentItems.filter(
        (c) => c.createdAt >= d && c.createdAt < next
      ).length,
    });
    indexTrend.push({
      date: key,
      count: indexResults.filter(
        (r) => r.sampledAt >= d && r.sampledAt < next && r.hit
      ).length,
    });
  }

  const todos: PublisherTodo[] = [];
  if (profile) {
    const { complete, missing } = checkBrandCompleteness(profile);
    if (!complete) {
      todos.push({
        id: 'brand-incomplete',
        type: 'brand_incomplete',
        label: `品牌资料不完整：${missing.join('、')}`,
        priority: 'P0',
        targetView: 'brand_profile',
      });
    }
  }
  if (knowledge.length === 0) {
    todos.push({
      id: 'knowledge-empty',
      type: 'knowledge_empty',
      label: '企业知识库尚未建立',
      priority: 'P1',
      targetView: 'knowledge_base',
    });
  }
  const reauthSoon = new Date();
  reauthSoon.setDate(reauthSoon.getDate() + REAUTH_DAYS);
  const badAccounts = accounts.filter(
    (a) =>
      a.status !== '已授权' ||
      (a.expiresAt && new Date(a.expiresAt) < reauthSoon)
  );
  if (badAccounts.length) {
    todos.push({
      id: 'account-reauth',
      type: 'account_reauth',
      label: `${badAccounts.length} 个账号需重新授权或即将过期`,
      priority: 'P0',
      targetView: 'account_binding',
      count: badAccounts.length,
    });
  }
  if (readyBatches > 0) {
    todos.push({
      id: 'publish-pending',
      type: 'publish_pending',
      label: `${readyBatches} 批内容待确认发布`,
      priority: 'P1',
      targetView: 'content_library',
      count: readyBatches,
    });
  }
  if (failedTasks > 0) {
    todos.push({
      id: 'task-failed',
      type: 'task_failed',
      label: `${failedTasks} 个 Agent 任务失败`,
      priority: 'P0',
      targetView: 'agent_tasks',
      count: failedTasks,
    });
  }
  if (credits.balance < CREDITS_LOW_THRESHOLD) {
    todos.push({
      id: 'credits-low',
      type: 'credits_low',
      label: `AI 算力不足（剩余 ${credits.balance}）`,
      priority: 'P0',
      targetView: 'account_funds',
    });
  }

  const effectTodos = await listArticleEffectTodos(brand.name);
  todos.push(...effectTodos);

  todos.sort((a, b) => (a.priority === 'P0' ? -1 : 1) - (b.priority === 'P0' ? -1 : 1));

  return {
    brandName: brand.name,
    metrics: {
      totalPublished,
      todayPublished,
      articlesGenerated: contentItems.length,
      indexedKeywords,
      platformHitRate,
      brandMentionRate: latestGeo?.mentionRate ?? 0,
    },
    platformShare,
    indexByKeyword,
    publishTrend,
    indexTrend,
    recentIndexResults: indexResults.slice(0, 20).map((r) => ({
      id: r.id,
      keyword: r.keyword,
      platform: r.platform,
      hit: r.hit,
      citedMerchant: r.citedMerchant,
      sampledAt: r.sampledAt.toISOString(),
      planId: r.planId,
    })),
    todos,
    samplingNote: '收录数据来自结构化 Agent 采样，非真机查询',
    geoInsight: {
      latestReportId: latestGeo?.id ?? null,
      analyzedAt: latestGeo?.createdAt?.toISOString() ?? null,
      mentionRate: latestGeo?.mentionRate ?? 0,
    },
  };
}
