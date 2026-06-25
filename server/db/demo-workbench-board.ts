/**
 * DEMO_ONLY: 工作台看板演示数据（对齐高保真：4 张任务卡 + 待处理事项）
 */
import { prisma } from './client.js';
import { isDemoPublisherSnapshotEnabled } from './demo-publisher-snapshot.js';
import { serializeTaskBrief } from '../../lib/paid-source-brief.js';

const MARKER = '[工作台演示]';
const CONFIG_KEY = 'demo_workbench_board_v';
const CONFIG_VERSION = '1';

async function resolveDemoProvider() {
  return prisma.provider.findFirst({
    where: { applicationStatus: 'approved' },
    orderBy: { createdAt: 'asc' },
  });
}

export async function ensureDemoWorkbenchBoard(brandName: string): Promise<void> {
  if (!isDemoPublisherSnapshotEnabled()) return;

  const cfg = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (cfg?.value === CONFIG_VERSION) return;

  const existing = await prisma.taskOrder.count({
    where: { brandName, title: { startsWith: MARKER } },
  });
  if (existing >= 4) {
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: CONFIG_VERSION },
      update: { value: CONFIG_VERSION },
    });
    return;
  }

  const provider = await resolveDemoProvider();

  const contentSpecs: Array<{
    title: string;
    status: string;
    platform: string;
    quoteCount?: number;
  }> = [
    { title: '品牌权威内容铺设', status: 'quote_review', platform: '多媒体', quoteCount: 3 },
    { title: '重点医生口碑问答覆盖', status: 'in_progress', platform: '知乎' },
  ];

  for (const spec of contentSpecs) {
    const fullTitle = `${MARKER} ${spec.title}`;
    const found = await prisma.taskOrder.findFirst({ where: { brandName, title: fullTitle } });
    if (found) continue;

    const brief = serializeTaskBrief({
      taskType: spec.platform,
      contentDirection: '品牌介绍向，强调品牌权威与行业影响力',
      deliveryNote: '需包含品牌关键词，文风正式，原创撰写',
      requireLink: true,
      requireScreenshot: true,
      requireIndexingProof: false,
    });

    await prisma.taskOrder.create({
      data: {
        brandName,
        title: fullTitle,
        type: '内容优化',
        platform: spec.platform,
        budget: 12000,
        deliverable: 'GEO 内容铺设',
        acceptance: '链接回传',
        contentDirection: '品牌介绍稿',
        taskBriefJson: brief,
        pricingMode: 'provider_quote',
        status: spec.status,
        providerId: spec.status === 'in_progress' ? provider?.id : null,
        providerName: spec.status === 'in_progress' ? provider?.name : null,
        ...(spec.quoteCount && provider
          ? {
              quotes: {
                create: Array.from({ length: spec.quoteCount }, (_, i) => ({
                  providerId: provider.id,
                  providerName: provider.name,
                  providerExpectedIncomeCents: 280000 + i * 50000,
                  publisherPayAmountCents: 400000 + i * 50000,
                  platformServiceFeeCents: 120000,
                  mediaName: ['小红书', '知乎', '大风网'][i] ?? '媒体',
                  mediaType: '资讯',
                  publishPlatform: ['小红书', '知乎', '大风网'][i] ?? '媒体',
                  status: 'pending',
                })),
              },
            }
          : {}),
      },
    });
  }

  const { createWebsiteLeadRequest } = await import('../services/website.service.js');

  const websiteSpecs: Array<{
    pageType: string;
    goal: string;
    status: 'pending' | 'revision';
  }> = [
    {
      pageType: '服务详情页',
      goal: '官网口腔种植页优化',
      status: 'pending',
    },
    {
      pageType: '品牌官网新建',
      goal: '城市专题新站搭建',
      status: 'revision',
    },
  ];

  for (const spec of websiteSpecs) {
    const exists = await prisma.websiteRequest.findFirst({
      where: { brandName, pageType: spec.pageType, notes: { contains: MARKER } },
    });
    if (exists) continue;

    const req = await createWebsiteLeadRequest({
      brandName,
      pageType: spec.pageType,
      keywords: spec.goal,
      contact: '13800001001',
      notes: `${MARKER} 演示数据 · ${spec.goal}`,
      referenceUrl: 'https://www.yunshan-dental.cn',
      modules: ['客资提交'],
    });

    await prisma.websiteOrder.update({
      where: { id: req.order.id },
      data: { status: spec.status },
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: CONFIG_VERSION },
    update: { value: CONFIG_VERSION },
  });
}
