import { prisma } from '../db/client.js';

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

  const { ensureRuntimeDefaults } = await import('./bootstrap.js');
  await ensureRuntimeDefaults();

  console.log('Database seeded with default brand:', brand.name);
}
