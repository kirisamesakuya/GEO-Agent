/**
 * DEMO_ONLY:
 * 当前数据用于本地演示和产品样板展示。
 *
 * PRODUCTION_TODO:
 * 生产环境不得自动写入 demo 数据；生产初始化只能写入必要系统配置。
 */
import '../load-env.js';
import { prisma } from '../db/client.js';

async function seedDemoExtras(orgId: string, brandName: string) {
  const count = await prisma.brand.count();
  if (count < 2) {
    const { createBrand } = await import('../services/brand.service.js');
    const exists = await prisma.brand.findFirst({ where: { name: '瑞美齿科华东' } });
    if (!exists) {
      await createBrand({
        name: '瑞美齿科华东',
        website: 'https://example.com/ruimei',
        industry: '医疗健康',
        city: '上海',
      });
    }
  }

  const memberCount = await prisma.organizationMember.count({ where: { organizationId: orgId } });
  if (memberCount === 0) {
    await prisma.organizationMember.createMany({
      data: [
        { organizationId: orgId, userId: 'publisher-demo', displayName: '组织负责人', role: 'owner' },
        { organizationId: orgId, userId: 'editor-demo', displayName: '品牌运营', role: 'editor' },
      ],
    });
  }

  const linkCount = await prisma.externalAccountLink.count({ where: { organizationId: orgId } });
  if (linkCount === 0) {
    await prisma.externalAccountLink.create({
      data: {
        organizationId: orgId,
        externalUserId: 'agentsyun-demo-user',
        provider: 'agentsyun',
      },
    });
  }

  const brands = await prisma.brand.findMany({ where: { organizationId: orgId } });
  for (const b of brands) {
    const permCount = await prisma.brandMemberPermission.count({ where: { brandId: b.id } });
    if (permCount === 0) {
      await prisma.brandMemberPermission.create({
        data: { brandId: b.id, userId: 'editor-demo', role: 'editor' },
      });
    }
  }

  await prisma.provider.updateMany({
    where: { name: '晨光传媒', applicationStatus: { not: 'approved' } },
    data: { applicationStatus: 'approved' },
  });

  const { ensureDemoMarketplaceReady } = await import('../lib/ensure-demo-marketplace.js');
  const { ensureDemoWebsiteOrders } = await import('./demo-orders.js');
  const { ensureDemoPlatformOps } = await import('./demo-platform.js');
  const { ensureDemoPublisherNotifications } = await import('./demo-notifications.js');
  const { ensureDemoPublisherSnapshot } = await import('./demo-publisher-snapshot.js');

  await ensureDemoMarketplaceReady();
  await ensureDemoWebsiteOrders(brandName);
  await ensureDemoPlatformOps();
  await ensureDemoPublisherNotifications(brandName);
  await ensureDemoPublisherSnapshot(brandName);
}

export async function seedDatabase() {
  const brandCount = await prisma.brand.count();
  if (brandCount > 0) return;

  const org = await prisma.organization.create({
    data: { name: '云杉医疗集团' },
  });

  const brand = await prisma.brand.create({
    data: {
      organizationId: org.id,
      isDefault: true,
      website: 'https://www.yunshan-dental.cn',
      name: '云杉口腔',
      industry: '医疗健康',
      city: '南京',
      storeCount: 12,
      description: '提供专业的种植牙、隐形矫正、儿童齿科及日常口腔护理服务，致力于数字化精准诊疗。',
      keywords: JSON.stringify(['南京种植牙', '隐形矫正推荐', '儿童齿科']),
      competitors: JSON.stringify(['北辰口腔', '瑞美齿科', '康贝牙科']),
      forbiddenWords: JSON.stringify(['绝对安全', '排名第一']),
      accountBindings: {
        create: [
          {
            platform: '小红书',
            accountName: '云杉口腔官方',
            status: '已授权',
            permissions: '内容发布 / 评论查看 / 数据回传',
            lastChecked: '2026-06-03 10:20',
          },
          {
            platform: '知乎',
            accountName: '云杉口腔品牌号',
            status: '已授权',
            permissions: '问答发布 / 链接回传',
            lastChecked: '2026-06-02 18:44',
          },
          {
            platform: '微信公众号',
            accountName: '未绑定',
            status: '待授权',
            permissions: '图文发布 / 数据同步',
            lastChecked: '—',
          },
          {
            platform: '大风网',
            accountName: '未绑定',
            status: '待授权',
            permissions: '图文发布 / 数据回传',
            lastChecked: '—',
          },
          {
            platform: '一点号',
            accountName: '未绑定',
            status: '待授权',
            permissions: '图文发布 / 数据回传',
            lastChecked: '—',
          },
        ],
      },
    },
  });

  await prisma.aiCredits.create({ data: { brandName: brand.name, balance: 1000 } });
  await prisma.budgetAccount.create({ data: { brandName: brand.name, balance: 10000, frozen: 0 } });

  await prisma.provider.createMany({
    data: [
      {
        name: '晨光传媒',
        type: '达人',
        capabilities: JSON.stringify(['小红书', '探店']),
        status: 'active',
        applicationStatus: 'approved',
        contactName: '张晨',
        phone: '13800001111',
        city: '南京',
        serviceTypes: JSON.stringify(['种草', '探店']),
        platforms: JSON.stringify(['小红书', '知乎']),
        industryTags: JSON.stringify(['医疗健康', '本地生活']),
        serviceAreas: JSON.stringify(['南京', '线上']),
        budgetMin: 1000,
        budgetMax: 20000,
      },
      {
        name: '蓝海内容',
        type: '内容写手',
        capabilities: JSON.stringify(['知乎', '公众号']),
        status: 'active',
        applicationStatus: 'submitted',
        contactName: '李蓝',
        phone: '13800002222',
        serviceTypes: JSON.stringify(['问答覆盖', '测评']),
        platforms: JSON.stringify(['知乎', '公众号']),
      },
      {
        name: '北辰工作室',
        type: 'GEO顾问',
        capabilities: JSON.stringify(['GEO分析', '投放计划']),
        status: 'active',
        applicationStatus: 'draft',
      },
    ],
  });

  await seedDemoExtras(org.id, brand.name);

  const approvedProvider = await prisma.provider.findFirst({
    where: { name: '晨光传媒' },
    select: { id: true },
  });
  const { ensureDemoAuthUsers } = await import('../services/auth.service.js');
  await ensureDemoAuthUsers(approvedProvider?.id);

  const { ensureRuntimeDefaults } = await import('./bootstrap.js');
  await ensureRuntimeDefaults();

  console.log('Database seeded with default brand:', brand.name);
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('server/db/seed.ts');
if (isDirectRun) {
  await prisma.$connect();
  await seedDatabase();
  await prisma.$disconnect();
}
