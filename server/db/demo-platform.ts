import { prisma } from './client.js';

const DEMO_APP_KEY = 'demo_order_applications_v';
const DEMO_APP_VERSION = '1';
const DEMO_ORG_KEY = 'demo_org_certs_v';
const DEMO_ORG_VERSION = '1';

const DEMO_RESOURCE_KEY = 'demo_provider_resources_v';
const DEMO_RESOURCE_VERSION = '2';

/** 幂等补齐平台端演示数据：待确认接单申请、待审组织认证、可接单平台审核样例 */
export async function ensureDemoPlatformOps(): Promise<void> {
  await ensureDemoOrderApplications();
  await ensureDemoOrgCertifications();
  await ensureDemoProviderResourceReviews();
  const { ensureDemoMediaPlatforms } = await import('./demo-media-platforms.js');
  await ensureDemoMediaPlatforms();
}

async function ensureDemoOrderApplications(): Promise<void> {
  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_APP_KEY } });
  if (marker?.value === DEMO_APP_VERSION) return;

  const providers = await prisma.provider.findMany({
    where: { name: { in: ['晨光传媒', '蓝海内容', '北辰工作室'] } },
  });
  if (providers.length === 0) return;

  const orders = await prisma.taskOrder.findMany({
    where: { status: 'published', providerId: null },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  if (orders.length === 0) return;

  const specs: Array<{ orderIndex: number; providerName: string; message: string }> = [
    { orderIndex: 0, providerName: '晨光传媒', message: '有口腔品类探店经验，可 48h 内交付初稿。' },
    { orderIndex: 1, providerName: '蓝海内容', message: '擅长知乎长文与问答矩阵，可提供历史案例。' },
    { orderIndex: 2, providerName: '北辰工作室', message: '可提供 GEO 顾问配套内容，建议组合接单。' },
    { orderIndex: 3, providerName: '晨光传媒', message: '本地达人资源可配合大风网渠道发布。' },
    { orderIndex: 4, providerName: '蓝海内容', message: '公众号推文经验丰富，接受按验收标准返修。' },
  ];

  for (const spec of specs) {
    const order = orders[spec.orderIndex];
    const provider = providers.find((p) => p.name === spec.providerName);
    if (!order || !provider) continue;

    const exists = await prisma.taskOrderApplication.findFirst({
      where: { orderId: order.id, providerId: provider.id, status: 'pending' },
    });
    if (exists) continue;

    await prisma.taskOrderApplication.create({
      data: {
        orderId: order.id,
        providerId: provider.id,
        providerName: provider.name,
        message: spec.message,
        status: 'pending',
      },
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: DEMO_APP_KEY },
    create: { key: DEMO_APP_KEY, value: DEMO_APP_VERSION },
    update: { value: DEMO_APP_VERSION },
  });
}

async function ensureDemoOrgCertifications(): Promise<void> {
  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_ORG_KEY } });
  if (marker?.value === DEMO_ORG_VERSION) return;

  const pendingCount = await prisma.organization.count({ where: { certStatus: 'pending' } });
  if (pendingCount === 0) {
    const yunshan = await prisma.organization.findFirst({ where: { name: '云杉医疗集团' } });
    if (yunshan) {
      await prisma.organization.update({
        where: { id: yunshan.id },
        data: {
          certStatus: 'pending',
          legalName: '云杉医疗科技（南京）有限公司',
          uscc: '91320100MA1K8YUNSH',
          contactName: '李运营',
          contactPhone: '13800005678',
          certSubmittedAt: new Date(Date.now() - 86400000),
        },
      });
    }

    const ruimeiExists = await prisma.organization.findFirst({ where: { name: '瑞美齿科集团有限公司' } });
    if (!ruimeiExists) {
      await prisma.organization.create({
        data: {
          name: '瑞美齿科集团有限公司',
          certStatus: 'pending',
          legalName: '瑞美齿科（华东）有限公司',
          uscc: '91310000MA1K3RUIME',
          contactName: '王敏',
          contactPhone: '13900001234',
          certSubmittedAt: new Date(Date.now() - 3600000),
        },
      });
    }
  }

  await prisma.systemConfig.upsert({
    where: { key: DEMO_ORG_KEY },
    create: { key: DEMO_ORG_KEY, value: DEMO_ORG_VERSION },
    update: { value: DEMO_ORG_VERSION },
  });
}

async function ensureDemoProviderResourceReviews(): Promise<void> {
  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_RESOURCE_KEY } });
  if (marker?.value === DEMO_RESOURCE_VERSION) return;

  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

  const chenguang = await prisma.provider.findFirst({ where: { name: '晨光传媒' } });
  if (chenguang) {
    await prisma.provider.update({
      where: { id: chenguang.id },
      data: {
        applicationStatus: 'approved',
        platforms: JSON.stringify(['小红书', '知乎', '抖音']),
        capabilities: JSON.stringify([
          { id: 'cap-xhs', platform: '小红书', reviewStatus: 'approved', reviewedAt: iso(86400000 * 3) },
          { id: 'cap-zh', platform: '知乎', reviewStatus: 'pending', declaredAt: iso(3600000 * 5) },
          { id: 'cap-dy', platform: '抖音', reviewStatus: 'pending', declaredAt: iso(3600000 * 2) },
        ]),
      },
    });
  }

  const lanhai = await prisma.provider.findFirst({ where: { name: '蓝海内容' } });
  if (lanhai) {
    await prisma.provider.update({
      where: { id: lanhai.id },
      data: {
        applicationStatus: 'approved',
        platforms: JSON.stringify(['知乎', '公众号', '抖音']),
        capabilities: JSON.stringify([
          { id: 'cap-zh', platform: '知乎', reviewStatus: 'approved', reviewedAt: iso(86400000 * 2) },
          { id: 'cap-gzh', platform: '公众号', reviewStatus: 'pending', declaredAt: iso(3600000 * 8) },
          { id: 'cap-dy', platform: '抖音', reviewStatus: 'pending', declaredAt: iso(3600000 * 1) },
        ]),
      },
    });
  }

  const beichen = await prisma.provider.findFirst({ where: { name: '北辰工作室' } });
  if (beichen) {
    await prisma.provider.update({
      where: { id: beichen.id },
      data: {
        applicationStatus: 'approved',
        platforms: JSON.stringify(['知乎', '网站', '公众号']),
        capabilities: JSON.stringify([
          {
            id: 'cap-zh',
            platform: '知乎',
            reviewStatus: 'rejected',
            reviewNote: '平台方向与当前任务池匹配度较低，可调整后重新申报',
            reviewedAt: iso(86400000),
          },
          { id: 'cap-web', platform: '网站', reviewStatus: 'pending', declaredAt: iso(3600000 * 12) },
          { id: 'cap-gzh', platform: '公众号', reviewStatus: 'pending', declaredAt: iso(3600000 * 6) },
        ]),
      },
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: DEMO_RESOURCE_KEY },
    create: { key: DEMO_RESOURCE_KEY, value: DEMO_RESOURCE_VERSION },
    update: { value: DEMO_RESOURCE_VERSION },
  });
}
