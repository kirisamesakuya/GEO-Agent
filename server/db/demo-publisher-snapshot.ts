/**
 * DEMO_ONLY: 为工作台、排名监控补全演示用结构化数据（计划、采样结果、内容、GEO 报告）
 */
import { buildIndexSamplePayload } from '../../lib/index-result-payload.js';
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

  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
  const brandName = brand?.name;

  const results: Array<{
    planId: string;
    keyword: string;
    platform: string;
    hit: boolean;
    citedMerchant: boolean;
    citationSnippet: string | null;
    aiResponse: string | null;
    citationUrls: string | null;
    sampledAt: Date;
  }> = [];

  DEMO_KEYWORDS.forEach((keyword, ki) => {
    DEMO_PLATFORMS.forEach((platform, pi) => {
      const hit = (ki + pi) % 3 !== 0;
      const cited = hit && (ki + pi) % 2 === 0;
      const payload = buildIndexSamplePayload({
        keyword,
        platform,
        hit,
        citedMerchant: cited,
        brandName,
      });
      results.push({
        planId: plan.id,
        keyword,
        platform,
        hit,
        citedMerchant: cited,
        citationSnippet: hit ? payload.citationSnippet : null,
        aiResponse: hit ? payload.aiResponse : payload.aiResponse,
        citationUrls: hit && payload.citationUrls.length ? JSON.stringify(payload.citationUrls) : null,
        sampledAt: daysAgo(14 - ((ki * DEMO_PLATFORMS.length + pi) % 12), 8 + (pi % 5)),
      });
    });
  });

  await prisma.indexResult.createMany({ data: results });
}

const DEMO_REPORT_MARKER = '【演示】';

function demoFindings(brand: string, severity: 'high' | 'mid' | 'low') {
  const base = [
    {
      id: 'f1',
      level: 'critical',
      title: '无统一官网',
      impact: '品牌名易与同名植物混淆，AI 无法引用结构化信息',
      suggestion: '建设品牌官网并配置 Schema / llms.txt',
      owner: '市场部',
    },
    {
      id: 'f2',
      level: 'critical',
      title: '无百度百科词条',
      impact: 'DeepSeek / 豆包 / Kimi 权威背书不足',
      suggestion: '创建或认领百科词条，补充资质与门店信息',
      owner: '品牌运营',
    },
    {
      id: 'f3',
      level: 'high',
      title: '问答场景覆盖不足',
      impact: `「${brand} 怎么样」类问题提及率低`,
      suggestion: '补充知乎问答与小红书探店内容',
      owner: '内容团队',
    },
  ];
  if (severity === 'high') return base;
  if (severity === 'mid') return base.slice(0, 2).map((f) => ({ ...f, level: 'high' }));
  return base.slice(0, 1).map((f) => ({ ...f, level: 'medium' }));
}

function demoScores(total: number) {
  const ratio = total / 100;
  return {
    aiCitability: Math.round(40 * ratio + 10),
    brandAuthority: Math.round(35 * ratio + 8),
    contentEeat: Math.round(50 * ratio + 12),
    technicalGeo: Math.round(45 * ratio + 15),
    schema: Math.round(30 * ratio + 5),
    platformOptimization: Math.round(48 * ratio + 10),
  };
}

function demoArtifacts(brand: string, label: string) {
  return [
    {
      id: `demo-md-${label}`,
      type: 'markdown',
      name: `${label}.md`,
      preview: `# ${brand} · ${label}\n\n> 演示数据，用于体验报告历史与月度对比交互。\n\n## 核心指标\n- 提及率、缺口、分项得分见左侧列表\n\n## 建议动作\n1. 补齐官网与百科\n2. 按缺口发服务商任务包\n3. 30 天后设新报告并做月度对比`,
    },
  ];
}

async function ensureDemoGeoReportSuite(brandName: string) {
  const suite: Array<{
    title: string;
    reportType: string;
    isBaseline: boolean;
    mentionRate: number;
    rank: number;
    gapsFound: number;
    totalScore: number;
    createdAt: Date;
    brandMentionSummary: string;
    contentGap: string;
    optimizationSuggestions: string;
    severity: 'high' | 'mid' | 'low';
  }> = [
    {
      title: `${DEMO_REPORT_MARKER}${brandName} · 3月基线体检（对比起点）`,
      reportType: 'audit',
      isBaseline: true,
      mentionRate: 18,
      rank: 8,
      gapsFound: 8,
      totalScore: 21,
      createdAt: daysAgo(62),
      brandMentionSummary: `${brandName} 基线阶段：多数 AI 平台未稳定提及，缺少可引用官网与百科。`,
      contentGap: '无官网；无百科；儿童齿科 FAQ 缺失；价格信息不透明。',
      optimizationSuggestions: '优先建设官网 Schema、百科词条，并发布 3 篇种草内容补位。',
      severity: 'high',
    },
    {
      title: `${DEMO_REPORT_MARKER}${brandName} · 4月中期复检`,
      reportType: 'audit',
      isBaseline: false,
      mentionRate: 28,
      rank: 6,
      gapsFound: 6,
      totalScore: 35,
      createdAt: daysAgo(32),
      brandMentionSummary: `${brandName} 提及率较基线提升，DeepSeek 已开始引用门店信息。`,
      contentGap: '百科已创建但内容单薄；知乎问答仍不足。',
      optimizationSuggestions: '继续补 FAQ 与探店笔记，并启动排名监控。',
      severity: 'mid',
    },
    {
      title: `${DEMO_REPORT_MARKER}${brandName} · 5月快速检测`,
      reportType: 'quick_start',
      isBaseline: false,
      mentionRate: 35,
      rank: 5,
      gapsFound: 5,
      totalScore: 48,
      createdAt: daysAgo(14),
      brandMentionSummary: `${brandName} 在豆包、DeepSeek 提及改善，Kimi 仍有缺口。`,
      contentGap: '缺少「隐形矫正价格」相关问答覆盖。',
      optimizationSuggestions: '针对缺口关键词生成 2 篇文章并发布到知乎/小红书。',
      severity: 'mid',
    },
    {
      title: `${DEMO_REPORT_MARKER}${brandName} · 6月最新审计`,
      reportType: 'audit',
      isBaseline: false,
      mentionRate: 42,
      rank: 4,
      gapsFound: 4,
      totalScore: 58,
      createdAt: daysAgo(3),
      brandMentionSummary: `${brandName} 在 DeepSeek、豆包已稳定提及，可进入月度对比复盘。`,
      contentGap: '竞品「北辰口腔」在部分长尾词仍领先。',
      optimizationSuggestions: '建议与 3 月基线生成月度对比报告，评估投放 ROI。',
      severity: 'low',
    },
  ];

  for (const spec of suite) {
    const exists = await prisma.geoReport.findFirst({
      where: { brandName, title: spec.title },
    });
    if (exists) continue;
    const scores = demoScores(spec.totalScore);
    await prisma.geoReport.create({
      data: {
        brandName,
        title: spec.title,
        reportType: spec.reportType,
        isBaseline: spec.isBaseline,
        mentionRate: spec.mentionRate,
        rank: spec.rank,
        gapsFound: spec.gapsFound,
        totalScore: spec.totalScore,
        platformsJson: JSON.stringify(['DeepSeek', '豆包', 'Kimi', '腾讯元宝']),
        keywordsJson: JSON.stringify(DEMO_KEYWORDS),
        brandMentionSummary: spec.brandMentionSummary,
        competitorAnalysis: '竞品「北辰口腔」在问答场景中提及频率更高，需持续补位。',
        contentGap: spec.contentGap,
        optimizationSuggestions: spec.optimizationSuggestions,
        scoresJson: JSON.stringify(scores),
        findingsJson: JSON.stringify(demoFindings(brandName, spec.severity)),
        artifactsJson: JSON.stringify(demoArtifacts(brandName, spec.title.split('·').pop()?.trim() ?? '报告')),
        createdAt: spec.createdAt,
      },
    });
  }

  const baselineTitle = suite[0].title;
  const baselineRow = await prisma.geoReport.findFirst({ where: { brandName, title: baselineTitle } });
  if (baselineRow && !baselineRow.isBaseline) {
    await prisma.geoReport.updateMany({
      where: { brandName, isBaseline: true },
      data: { isBaseline: false },
    });
    await prisma.geoReport.update({
      where: { id: baselineRow.id },
      data: { isBaseline: true },
    });
  }
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
    const published = i === 0;
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

async function backfillIndexResultDetails(brandId: string, brandName: string): Promise<void> {
  const stale = await prisma.indexResult.findMany({
    where: { plan: { brandId }, aiResponse: null },
    take: 200,
  });
  if (!stale.length) return;

  for (const row of stale) {
    const payload = buildIndexSamplePayload({
      keyword: row.keyword,
      platform: row.platform,
      hit: row.hit,
      citedMerchant: row.citedMerchant,
      brandName,
    });
    await prisma.indexResult.update({
      where: { id: row.id },
      data: {
        aiResponse: payload.aiResponse,
        citationUrls:
          row.hit && payload.citationUrls.length ? JSON.stringify(payload.citationUrls) : null,
        citationSnippet: row.citationSnippet ?? (row.hit ? payload.citationSnippet : null),
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
  } else if (isDemoPublisherSnapshotEnabled()) {
    await backfillIndexResultDetails(brand.id, brand.name);
  }

  const reportCount = await prisma.geoReport.count({ where: { brandName: brand.name } });
  if (reportCount < 4) {
    await ensureDemoGeoReportSuite(brand.name);
  }

  const batchCount = await prisma.contentBatch.count({ where: { brandName: brand.name } });
  if (batchCount === 0) {
    await seedDemoContent(brand.name);
  }
}
