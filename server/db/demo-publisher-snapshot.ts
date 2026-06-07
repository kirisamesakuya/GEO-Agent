/**
 * DEMO_ONLY: 为工作台、排名监控补全演示用结构化数据（计划、采样结果、内容、GEO 报告）
 */
import { prisma } from './client.js';
import { findBrandRow } from '../services/brand.service.js';

const DEMO_KEYWORDS = ['南京种植牙', '隐形矫正推荐', '儿童齿科', '云杉口腔怎么样'];
const DEMO_PLATFORMS = ['豆包', 'DeepSeek', 'Kimi', '腾讯元宝'];

export function isDemoPublisherSnapshotEnabled(): boolean {
  return process.env.SEED_DEMO_DATA === 'true' || process.env.AUTH_MODE === 'demo';
}

function daysAgo(d: number, hour = 10): Date {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(hour, 0, 0, 0);
  return x;
}

async function ensureDemoKeywords(brandId: string): Promise<string[]> {
  const ids: string[] = [];
  for (const term of DEMO_KEYWORDS) {
    const row = await prisma.keywordEntry.upsert({
      where: { brandId_term: { brandId, term } },
      create: { brandId, term, group: 'brand', source: 'demo' },
      update: {},
    });
    ids.push(row.id);
  }
  return ids;
}

async function seedDemoIndexPlan(brandId: string, keywordIds: string[]) {
  const plan = await prisma.indexQueryPlan.create({
    data: {
      brandId,
      name: '核心关键词 AI 收录监控',
      platforms: JSON.stringify(DEMO_PLATFORMS),
      keywordIds: JSON.stringify(keywordIds),
      status: 'done',
      verificationType: 'regular_monitor',
      queryAt: daysAgo(1, 9),
      scheduleFrequency: 'weekly',
      scheduleRunTime: '09:00',
      scheduleWeekday: 1,
    },
  });

  const results: Array<{
    planId: string;
    keyword: string;
    platform: string;
    hit: boolean;
    citedMerchant: boolean;
    citationSnippet: string | null;
    sampledAt: Date;
  }> = [];

  DEMO_KEYWORDS.forEach((keyword, ki) => {
    DEMO_PLATFORMS.forEach((platform, pi) => {
      const hit = (ki + pi) % 3 !== 0;
      const cited = hit && (ki + pi) % 2 === 0;
      results.push({
        planId: plan.id,
        keyword,
        platform,
        hit,
        citedMerchant: cited,
        citationSnippet: hit
          ? `${platform} 对「${keyword}」的演示采样：${cited ? '已提及品牌' : '有相关结果但未明确提及品牌'}。`
          : null,
        sampledAt: daysAgo(14 - ((ki * DEMO_PLATFORMS.length + pi) % 12), 8 + (pi % 5)),
      });
    });
  });

  await prisma.indexResult.createMany({ data: results });
}

async function seedDemoGeoReport(brandName: string) {
  await prisma.geoReport.create({
    data: {
      brandName,
      title: `${brandName} · GEO 快速检测`,
      reportType: 'quick_start',
      mentionRate: 42,
      rank: 4,
      gapsFound: 5,
      totalScore: 58,
      platformsJson: JSON.stringify(['DeepSeek', '豆包', 'Kimi']),
      keywordsJson: JSON.stringify(DEMO_KEYWORDS),
      brandMentionSummary: `${brandName} 在 DeepSeek、豆包已出现提及，Kimi 场景仍有缺口。`,
      competitorAnalysis: '竞品「北辰口腔」在问答场景中提及频率更高。',
      contentGap: '缺少「儿童齿科」相关 FAQ 与价格透明说明。',
      optimizationSuggestions: '建议补充 3 篇小红书种草稿与 2 条知乎问答，覆盖缺口关键词。',
      createdAt: daysAgo(3),
    },
  });
}

async function seedDemoContent(brandName: string) {
  const batch = await prisma.contentBatch.create({
    data: {
      brandName,
      platform: '小红书',
      articleCount: 5,
      status: 'ready',
      createdAt: daysAgo(20),
    },
  });

  const titles = [
    `${brandName} · 儿童齿科体验分享`,
    `${brandName} · 种植牙流程 FAQ`,
    `${brandName} · 隐形矫正种草稿`,
    `${brandName} · 南京口腔怎么选`,
    `${brandName} · 到店探店笔记`,
  ];

  for (let i = 0; i < titles.length; i++) {
    const published = i < 2;
    const created = daysAgo(18 - i * 3);
    await prisma.contentItem.create({
      data: {
        batchId: batch.id,
        title: titles[i],
        platform: i % 2 === 0 ? '小红书' : '知乎',
        previewText: `围绕「${DEMO_KEYWORDS[i % DEMO_KEYWORDS.length]}」的 GEO 演示草稿。`,
        fullContent: `# ${titles[i]}\n\n演示用文章内容，用于工作台指标展示。`,
        structure: '[标题 + 核心答案 + FAQ]',
        status: published ? 'published' : 'draft',
        publishStatus: published ? 'published' : 'not_scheduled',
        createdAt: created,
        updatedAt: published ? daysAgo(15 - i * 2) : created,
      },
    });
  }
}

/** 若品牌缺少排名/看板数据，写入一套可复现的演示快照 */
export async function ensureDemoPublisherSnapshot(brandName: string): Promise<void> {
  if (!isDemoPublisherSnapshotEnabled()) return;

  const brand = await findBrandRow(brandName);
  if (!brand) return;

  const keywordIds = await ensureDemoKeywords(brand.id);

  const planCount = await prisma.indexQueryPlan.count({ where: { brandId: brand.id } });
  if (planCount === 0) {
    await seedDemoIndexPlan(brand.id, keywordIds);
  }

  const reportCount = await prisma.geoReport.count({ where: { brandName: brand.name } });
  if (reportCount === 0) {
    await seedDemoGeoReport(brand.name);
  }

  const batchCount = await prisma.contentBatch.count({ where: { brandName: brand.name } });
  if (batchCount === 0) {
    await seedDemoContent(brand.name);
  }
}
