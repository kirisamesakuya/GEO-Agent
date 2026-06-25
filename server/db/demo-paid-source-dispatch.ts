/**
 * DEMO_ONLY: 付费信源报价撮合发单管理演示数据
 */
import { prisma } from './client.js';
import { isDemoPublisherSnapshotEnabled } from './demo-publisher-snapshot.js';
import { serializeTaskBrief } from '../../lib/paid-source-brief.js';

const DEMO_PREFIX = '[演示]';
const CONFIG_KEY = 'demo_paid_source_dispatch_v';
const CONFIG_VERSION = '1';

type QuoteSpec = {
  providerName: string;
  publisherPayCents: number;
  mediaName: string;
  message: string;
  daysUntilPublish: number;
};

type DispatchSpec = {
  titleSuffix: string;
  platform: string;
  status: string;
  quoteCount?: number;
  quotes?: QuoteSpec[];
  providerName?: string;
};

const DISPATCH_SPECS: DispatchSpec[] = [
  {
    titleSuffix: '官方媒体文章-01',
    platform: '官方媒体',
    status: 'quote_review',
    quotes: [
      {
        providerName: '晨光传媒',
        publisherPayCents: 160000,
        mediaName: '人民日报、新华网、光明日报等 8 家官方媒体',
        message: '优质官方媒体资源，支持关键词布局，最快明日上午上线',
        daysUntilPublish: 2,
      },
      {
        providerName: '智讯科技',
        publisherPayCents: 190000,
        mediaName: '中国网、央视网、央广网等 6 家官方媒体',
        message: '央媒资源丰富，可紧急安排今天下午上线',
        daysUntilPublish: 0.2,
      },
    ],
  },
  {
    titleSuffix: '垂类媒体文章-02',
    platform: '垂类媒体',
    status: 'quote_review',
    quotes: [
      {
        providerName: '蓝海内容',
        publisherPayCents: 98000,
        mediaName: '口腔健康垂类媒体 5 家',
        message: '医疗垂类经验丰富，可配合品牌关键词',
        daysUntilPublish: 3,
      },
      {
        providerName: '北辰工作室',
        publisherPayCents: 115000,
        mediaName: '行业资讯媒体 4 家',
        message: '支持原创配图，48h 内可上线',
        daysUntilPublish: 2,
      },
      {
        providerName: '晨光传媒',
        publisherPayCents: 128000,
        mediaName: '健康类垂直媒体 6 家',
        message: '可提供收录证明',
        daysUntilPublish: 4,
      },
    ],
  },
  {
    titleSuffix: '行业号文章-03',
    platform: '行业号',
    status: 'quote_open',
    quoteCount: 0,
  },
  {
    titleSuffix: '问答社区文章-04',
    platform: '问答社区',
    status: 'quote_open',
    quotes: [
      {
        providerName: '北辰工作室',
        publisherPayCents: 68000,
        mediaName: '知乎问答矩阵',
        message: '擅长医疗口碑问答覆盖',
        daysUntilPublish: 2,
      },
    ],
  },
  {
    titleSuffix: '小红书文章-05',
    platform: '小红书',
    status: 'in_progress',
    providerName: '晨光传媒',
    quotes: [
      {
        providerName: '晨光传媒',
        publisherPayCents: 45000,
        mediaName: '小红书种草',
        message: '已确认报价',
        daysUntilPublish: 1,
      },
    ],
  },
  {
    titleSuffix: '百家号文章-06',
    platform: '百家号',
    status: 'quote_open',
    quoteCount: 0,
  },
  {
    titleSuffix: '网站文章-07',
    platform: '网站',
    status: 'cancelled',
  },
  {
    titleSuffix: '知乎文章-08',
    platform: '知乎',
    status: 'quote_review',
    quotes: [
      {
        providerName: '蓝海内容',
        publisherPayCents: 72000,
        mediaName: '知乎专栏 + 问答',
        message: '问答平台经验更强',
        daysUntilPublish: 1,
      },
      {
        providerName: '智讯科技',
        publisherPayCents: 85000,
        mediaName: '知乎品牌问答',
        message: '可配合医生人设账号',
        daysUntilPublish: 2,
      },
    ],
  },
];

async function resolveProvider(name: string) {
  return prisma.provider.findFirst({ where: { name } });
}

export async function ensureDemoPaidSourceDispatch(brandName: string): Promise<void> {
  if (!isDemoPublisherSnapshotEnabled()) return;

  const cfg = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (cfg?.value === CONFIG_VERSION) return;

  for (const spec of DISPATCH_SPECS) {
    const fullTitle = `${DEMO_PREFIX} ${spec.titleSuffix}`;
    const found = await prisma.taskOrder.findFirst({ where: { brandName, title: fullTitle } });
    if (found) continue;

    const brief = serializeTaskBrief({
      taskType: spec.platform,
      contentDirection: '品牌介绍向，强调品牌权威与行业影响力，适合官方媒体发布',
      deliveryNote: '需包含品牌关键词，文风正式，原创撰写，可配图（平台提供）',
      requireLink: true,
      requireScreenshot: true,
      requireIndexingProof: false,
    });

    let providerId: string | null = null;
    let providerName: string | null = spec.providerName ?? null;
    if (providerName) {
      const p = await resolveProvider(providerName);
      providerId = p?.id ?? null;
      providerName = p?.name ?? providerName;
    }

    const quoteCreates = [];
    if (spec.quotes?.length) {
      for (const q of spec.quotes) {
        const p = await resolveProvider(q.providerName);
        if (!p) continue;
        quoteCreates.push({
          providerId: p.id,
          providerName: p.name,
          providerExpectedIncomeCents: Math.round(q.publisherPayCents * 0.7),
          publisherPayAmountCents: q.publisherPayCents,
          platformServiceFeeCents: Math.round(q.publisherPayCents * 0.3),
          mediaName: q.mediaName,
          mediaType: spec.platform,
          publishPlatform: spec.platform,
          estimatedPublishAt: new Date(Date.now() + q.daysUntilPublish * 86400000),
          message: q.message,
          includeLink: true,
          includeScreenshot: true,
          includeIndexingProof: false,
          status: spec.status === 'in_progress' ? 'accepted' : 'pending',
        });
      }
    }

    await prisma.taskOrder.create({
      data: {
        brandName,
        title: fullTitle,
        type: '文章',
        platform: spec.platform,
        budget: Math.round((spec.quotes?.[0]?.publisherPayCents ?? 100000) / 100),
        deliverable: '原创稿件 1 篇',
        acceptance: '文章链接（必填）、媒体截图（必填）',
        contentDirection: '品牌介绍稿',
        taskBriefJson: brief,
        pricingMode: 'provider_quote',
        status: spec.status,
        providerId,
        providerName,
        ...(quoteCreates.length
          ? { quotes: { create: quoteCreates } }
          : {}),
      },
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: CONFIG_VERSION },
    update: { value: CONFIG_VERSION },
  });
}
