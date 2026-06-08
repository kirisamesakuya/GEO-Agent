import { prisma } from './client.js';

const DEMO_PREFIX = '[演示]';
const CONFIG_KEY = 'demo_task_orders_v';
const CONFIG_VERSION = '3';

type DemoTaskSpec = {
  title: string;
  type: string;
  platform: string;
  budget: number;
  deliverable: string;
  acceptance: string;
  status: string;
  providerId?: string;
  providerName?: string;
  description?: string;
  deliveries?: Array<{
    content: string;
    stage?: string;
    reviewStatus?: string;
    reviewNote?: string;
    link?: string;
    status?: string;
    attachments?: string;
  }>;
  revisions?: Array<{ reason: string; status?: string }>;
  settlement?: { status: string; amount: number };
  /** 距现在的发布分钟数（仅 published 演示任务用于展示发布时间） */
  publishedMinutesAgo?: number;
};

const DEMO_TASK_SPECS: DemoTaskSpec[] = [
  {
    title: `${DEMO_PREFIX} 待接单 · 小红书种草`,
    type: '种草',
    platform: '小红书',
    budget: 2800,
    deliverable: '1 篇种草笔记 + 截图回传',
    acceptance: '截图证明',
    status: 'published',
    description: '新发布，等待接单方认领。',
    publishedMinutesAgo: 8,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 南京种植牙种草测评`,
    type: '测评',
    platform: '小红书',
    budget: 3000,
    deliverable: '种植牙体验测评 1 篇',
    acceptance: '截图证明 / 链接回传',
    status: 'published',
    description: '高度匹配本地口腔品类，先到先得。',
    publishedMinutesAgo: 120,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 大风网资讯稿`,
    type: '文章',
    platform: '大风网',
    budget: 1800,
    deliverable: '健康科普资讯 1 篇',
    acceptance: '链接回传',
    status: 'published',
    description: '网站发文渠道 · 大风网，已有人接单，还剩 1 个名额。',
    publishedMinutesAgo: 360,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 一点号科普`,
    type: '科普',
    platform: '一点号',
    budget: 1600,
    deliverable: '口腔护理科普 1 篇',
    acceptance: '链接回传',
    status: 'published',
    description: '网站发文渠道 · 一点号，暂无人接单。',
    publishedMinutesAgo: 50,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 网站专题页文案`,
    type: '网页内容',
    platform: '网站',
    budget: 4500,
    deliverable: '种植牙专题页文案 + 模块说明',
    acceptance: '人工确认',
    status: 'published',
    description: '配合品牌站改版，需熟悉医疗合规表述。',
    publishedMinutesAgo: 90,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 官媒通稿分发`,
    type: '官媒',
    platform: '官媒',
    budget: 12000,
    deliverable: '通稿 1 篇 + 3 家媒体发布证明',
    acceptance: '链接回传 / 截图证明',
    status: 'published',
    description: '央媒/行业媒体组合分发，多人协作任务。',
    publishedMinutesAgo: 480,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 公众号月刊`,
    type: '文章',
    platform: '公众号',
    budget: 2200,
    deliverable: '品牌月刊软文 1 篇',
    acceptance: '截图证明',
    status: 'published',
    description: '名额已满，仅供演示满员状态。',
    publishedMinutesAgo: 2880,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 知乎问答矩阵`,
    type: '问答覆盖',
    platform: '知乎',
    budget: 5200,
    deliverable: '5 条问答覆盖',
    acceptance: '链接回传',
    status: 'published',
    description: '多人可接，已部分认领。',
    publishedMinutesAgo: 600,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 达人种草包`,
    type: '达人',
    platform: '小红书',
    budget: 8800,
    deliverable: '3 位达人种草笔记',
    acceptance: '数据复盘',
    status: 'published',
    description: '多人协作，接近满员。',
    publishedMinutesAgo: 300,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 瑞美齿科华东探店`,
    type: '探店',
    platform: '小红书',
    budget: 3600,
    deliverable: '门店探店笔记 1 篇',
    acceptance: '截图证明',
    status: 'published',
    description: '上海门店探店，部分匹配服务商。',
    publishedMinutesAgo: 180,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 隐形矫正日记`,
    type: '种草',
    platform: '小红书',
    budget: 2400,
    deliverable: '隐形矫正体验日记 1 篇',
    acceptance: '截图证明',
    status: 'published',
    description: '新发布，暂无人接单。',
    publishedMinutesAgo: 15,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 儿童涂氟体验`,
    type: '测评',
    platform: '小红书',
    budget: 2000,
    deliverable: '儿童涂氟体验笔记 1 篇',
    acceptance: '截图证明',
    status: 'published',
    description: '单名额任务，已满员。',
    publishedMinutesAgo: 4320,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 种植牙科普问答`,
    type: '问答覆盖',
    platform: '知乎',
    budget: 1800,
    deliverable: '种植牙相关问答 2 条',
    acceptance: '链接回传',
    status: 'published',
    description: '新发布，暂无人接单。',
    publishedMinutesAgo: 35,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 正畸选购指南`,
    type: '文章',
    platform: '知乎',
    budget: 6800,
    deliverable: '正畸选购长文 1 篇',
    acceptance: '链接回传',
    status: 'published',
    description: '多人协作已满员。',
    publishedMinutesAgo: 7200,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 暑期矫正活动推文`,
    type: '文章',
    platform: '公众号',
    budget: 2600,
    deliverable: '暑期活动推文 1 篇',
    acceptance: '截图证明',
    status: 'published',
    description: '新发布，暂无人接单。',
    publishedMinutesAgo: 55,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 会员专享推文`,
    type: '文章',
    platform: '公众号',
    budget: 1900,
    deliverable: '会员活动推文 1 篇',
    acceptance: '截图证明',
    status: 'published',
    description: '2 名额已接 1 人。',
    publishedMinutesAgo: 1440,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 大风网行业观察`,
    type: '文章',
    platform: '大风网',
    budget: 2100,
    deliverable: '口腔行业观察稿 1 篇',
    acceptance: '链接回传',
    status: 'published',
    description: '新发布，暂无人接单。',
    publishedMinutesAgo: 25,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 一点号复诊指南`,
    type: '科普',
    platform: '一点号',
    budget: 1400,
    deliverable: '复诊注意事项科普 1 篇',
    acceptance: '链接回传',
    status: 'published',
    description: '接近满员，仅剩 1 名额。',
    publishedMinutesAgo: 220,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 网站SEO落地页`,
    type: '网页内容',
    platform: '网站',
    budget: 5200,
    deliverable: 'SEO 落地页文案全套',
    acceptance: '人工确认',
    status: 'published',
    description: '单名额已满员。',
    publishedMinutesAgo: 5760,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 官媒权威专访`,
    type: '官媒',
    platform: '官媒',
    budget: 15000,
    deliverable: '院长专访通稿 + 媒体发布',
    acceptance: '链接回传 / 截图证明',
    status: 'published',
    description: '新发布，5 名额暂无人接单。',
    publishedMinutesAgo: 40,
  },
  {
    title: `${DEMO_PREFIX} 待接单 · 官媒发布会通稿`,
    type: '官媒',
    platform: '官媒',
    budget: 9800,
    deliverable: '新品发布会通稿分发',
    acceptance: '链接回传',
    status: 'published',
    description: '5 名额已满员。',
    publishedMinutesAgo: 10080,
  },
  {
    title: `${DEMO_PREFIX} 执行中 · 知乎问答覆盖`,
    type: '问答覆盖',
    platform: '知乎',
    budget: 1500,
    deliverable: '2 条问答回答',
    acceptance: '链接回传',
    status: 'in_progress',
    providerName: '晨光传媒',
    description: '接单方撰写中。',
  },
  {
    title: `${DEMO_PREFIX} 待审稿 · 探店笔记`,
    type: '探店',
    platform: '小红书',
    budget: 4200,
    deliverable: '探店图文笔记 1 篇',
    acceptance: '截图证明 / 链接回传',
    status: 'draft_review',
    providerName: '晨光传媒',
    deliveries: [
      {
        content:
          '【草稿】南京河西店探店：环境干净、医生耐心，种植牙咨询流程清晰…\n\n（待品牌方审稿）',
        stage: 'draft',
        reviewStatus: 'submitted',
        status: 'draft_submitted',
      },
    ],
  },
  {
    title: `${DEMO_PREFIX} 审稿返修 · 儿童齿科种草`,
    type: '种草',
    platform: '小红书',
    budget: 3600,
    deliverable: '儿童齿科科普种草 1 篇',
    acceptance: '截图证明',
    status: 'draft_revision',
    providerName: '晨光传媒',
    deliveries: [
      {
        content: '初稿：侧重价格对比，品牌卖点偏弱…',
        stage: 'draft',
        reviewStatus: 'revision_requested',
        reviewNote: '请强化「数字化诊疗」与医生资质，弱化竞品比价表述。',
        status: 'draft_submitted',
      },
    ],
  },
  {
    title: `${DEMO_PREFIX} 待发布 · 隐形矫正测评`,
    type: '测评',
    platform: '知乎',
    budget: 5000,
    deliverable: '长文测评 + 发布链接',
    acceptance: '链接回传',
    status: 'draft_approved',
    providerName: '晨光传媒',
    deliveries: [
      {
        content: '【已通过审稿】隐形矫正全流程体验：预约、方案、复诊记录…',
        stage: 'draft',
        reviewStatus: 'approved',
        status: 'draft_submitted',
      },
    ],
  },
  {
    title: `${DEMO_PREFIX} 待验收 · GEO 顾问月报`,
    type: 'SEO/GEO 顾问',
    platform: '多平台',
    budget: 8000,
    deliverable: 'GEO 可见度月报 + 优化清单',
    acceptance: '人工确认',
    status: 'pending_review',
    providerName: '北辰工作室',
    deliveries: [
      {
        content: '本月 DeepSeek / 豆包提及率提升 12%，建议补充「种植牙价格」问答矩阵…',
        stage: 'final',
        status: 'submitted',
      },
    ],
  },
  {
    title: `${DEMO_PREFIX} 最终返修 · 公众号软文`,
    type: '文章',
    platform: '公众号',
    budget: 2200,
    deliverable: '软文 1 篇 + 发布截图',
    acceptance: '截图证明 / 链接回传',
    status: 'revision',
    providerName: '蓝海内容',
    deliveries: [
      {
        content: '已发布：https://mp.weixin.qq.com/demo-link\n附首发截图说明。',
        stage: 'final',
        link: 'https://mp.weixin.qq.com/demo-link',
        status: 'submitted',
        attachments: JSON.stringify([
          { type: 'screenshot', name: '发布截图.png', url: 'https://example.com/screenshot.png' },
        ]),
      },
    ],
    revisions: [{ reason: '标题需体现「云杉口腔」品牌名，封面图请更换为门店实拍。', status: 'open' }],
  },
  {
    title: `${DEMO_PREFIX} 已完成 · 本地生活探店`,
    type: '探店',
    platform: '小红书',
    budget: 3000,
    deliverable: '探店笔记 + 数据截图',
    acceptance: '截图证明',
    status: 'completed',
    providerName: '晨光传媒',
    deliveries: [
      {
        content: '发布完成，互动数据良好。',
        stage: 'final',
        link: 'https://www.xiaohongshu.com/demo-post',
        status: 'submitted',
      },
    ],
    settlement: { status: 'pending_platform', amount: 3000 },
  },
  {
    title: `${DEMO_PREFIX} 争议中 · 达人分发包`,
    type: '达人',
    platform: '小红书',
    budget: 6000,
    deliverable: '3 位达人分发 + 结案报告',
    acceptance: '数据复盘',
    status: 'disputed',
    providerName: '晨光传媒',
    revisions: [{ reason: '[争议] 结案数据与承诺曝光量差异较大，申请平台介入。', status: 'dispute' }],
  },
];

async function resolveProvider(name: string) {
  return prisma.provider.findFirst({ where: { name } });
}

export async function ensureDemoTaskOrders(brandName: string) {
  const existing = await prisma.taskOrder.findMany({
    where: { brandName, title: { startsWith: DEMO_PREFIX } },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((o) => o.title));

  for (const spec of DEMO_TASK_SPECS) {
    if (existingTitles.has(spec.title)) continue;

    let providerId = spec.providerId;
    let providerName = spec.providerName;
    if (providerName && !providerId) {
      const p = await resolveProvider(providerName);
      providerId = p?.id;
      providerName = p?.name ?? providerName;
    }

    const publishedAt =
      spec.status === 'published' && spec.publishedMinutesAgo != null
        ? new Date(Date.now() - spec.publishedMinutesAgo * 60_000)
        : undefined;

    await prisma.taskOrder.create({
      data: {
        brandName,
        title: spec.title,
        type: spec.type,
        platform: spec.platform,
        budget: spec.budget,
        deliverable: spec.deliverable,
        acceptance: spec.acceptance,
        description: spec.description,
        status: spec.status,
        providerId: providerId ?? null,
        providerName: providerName ?? null,
        ...(publishedAt ? { createdAt: publishedAt, updatedAt: publishedAt } : {}),
        deliveries: spec.deliveries
          ? {
              create: spec.deliveries.map((d) => ({
                content: d.content,
                stage: d.stage ?? 'final',
                reviewStatus: d.reviewStatus ?? null,
                reviewNote: d.reviewNote ?? null,
                link: d.link ?? null,
                status: d.status ?? 'submitted',
                attachments: d.attachments ?? null,
              })),
            }
          : undefined,
        revisions: spec.revisions
          ? { create: spec.revisions.map((r) => ({ reason: r.reason, status: r.status ?? 'open' })) }
          : undefined,
        settlement: spec.settlement
          ? { create: { status: spec.settlement.status, amount: spec.settlement.amount } }
          : undefined,
      },
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: CONFIG_VERSION },
    update: { value: CONFIG_VERSION },
  });
}

const DEMO_WEB_PREFIX = '[演示]';

export async function ensureDemoWebsiteOrders(brandName: string) {
  const key = 'demo_website_orders_v';
  const version = '2';
  const cfg = await prisma.systemConfig.findUnique({ where: { key } });
  if (cfg?.value === version) return;

  const { createWebsiteLeadRequest } = await import('../services/website.service.js');

  const specs = [
    {
      pageType: '活动落地页',
      keywords: `${DEMO_WEB_PREFIX} 暑期矫正活动`,
      contact: '13800001001',
      notes: '突出暑期优惠与预约入口',
      referenceUrl: 'https://www.yunshan-dental.cn/summer',
      status: 'pending' as const,
    },
    {
      pageType: '品牌介绍页',
      keywords: `${DEMO_WEB_PREFIX} 门店升级`,
      contact: '微信 yunshan_ops',
      notes: '参考同城竞品首页结构',
      status: 'revision' as const,
      revisionReason: '请补充门店实景照片与医生资质',
    },
    {
      pageType: '服务详情页',
      keywords: `${DEMO_WEB_PREFIX} 种植牙专题`,
      contact: '13800001001',
      notes: '需 FAQ 与案例模块',
      status: 'completed' as const,
      previewUrl: 'https://www.yunshan-dental.cn/implant-demo',
      deliveryNote: '已上线，请验收。',
    },
  ];

  for (const spec of specs) {
    const dup = await prisma.websiteRequest.findFirst({
      where: { brandName, keywords: spec.keywords },
    });
    if (dup) continue;

    const { order } = await createWebsiteLeadRequest({
      brandName,
      pageType: spec.pageType,
      referenceUrl: spec.referenceUrl,
      keywords: spec.keywords,
      contact: spec.contact,
      notes: spec.notes,
    });

    if (spec.status === 'revision') {
      await prisma.websiteOrder.update({
        where: { id: order.id },
        data: {
          status: 'revision',
          revisionReason: spec.revisionReason ?? '需补充材料',
        },
      });
    } else if (spec.status === 'completed') {
      await prisma.websiteOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          previewUrl: spec.previewUrl ?? null,
          deliveryNote: spec.deliveryNote ?? null,
        },
      });
    }
  }

  // 清理旧版演示数据（AI 预览 HTML 格式）
  const legacy = await prisma.websiteRequest.findMany({
    where: { brandName, goal: { startsWith: DEMO_WEB_PREFIX }, keywords: null },
    select: { id: true },
  });
  for (const row of legacy) {
    await prisma.websiteOrder.deleteMany({ where: { requestId: row.id } });
    await prisma.websiteRequest.delete({ where: { id: row.id } });
  }

  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: version },
    update: { value: version },
  });
}
