import { prisma } from './client.js';
import { refreshSkillRoutesFromDb } from '../lib/agent-skill.js';

const DEFAULT_SKILL_ROUTES = JSON.stringify([
  { taskType: 'article_generation', skillName: 'geo.article.generate', executor: 'direct_model', enabled: true, priority: 1 },
  { taskType: 'geo_analysis', skillName: 'geo.analysis.run', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_quick_start', skillName: 'geo-quick-start', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_audit', skillName: 'geo-audit', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_schema', skillName: 'geo-schema', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_llmstxt', skillName: 'geo-llmstxt', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_citability', skillName: 'geo-citability', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_report_pdf', skillName: 'geo-report-pdf', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_compare', skillName: 'geo-compare', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'campaign_plan', skillName: 'geo.campaign.plan', executor: 'direct_model', enabled: true, priority: 1 },
  { taskType: 'website_preview', skillName: 'geo.website.preview', executor: 'direct_model', enabled: true, priority: 1 },
  { taskType: 'brand_extract', skillName: 'geo-brand-mentions', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'hermes_publish', skillName: 'hermes.publish.auto', executor: 'hermes_gateway', enabled: true, priority: 2 },
  { taskType: 'account_verify', skillName: 'geo.account.verify', executor: 'direct_model', enabled: true, priority: 1 },
]);

const DEFAULT_CONFIGS: Array<{ key: string; value: string }> = [
  { key: 'platforms', value: JSON.stringify(['小红书', '知乎', '公众号', '网站']) },
  { key: 'task_types', value: JSON.stringify(['种草', '探店', '问答覆盖', '测评', '网页设计', 'SEO/GEO 顾问']) },
  { key: 'acceptance_methods', value: JSON.stringify(['截图证明', '链接回传', '数据复盘', '人工确认']) },
  { key: 'budget_rules', value: JSON.stringify({ minBudget: 500, freezeRatio: 1, releaseOnComplete: true }) },
  { key: 'model_config', value: JSON.stringify({ defaultModel: 'MiniMax-M3', provider: 'minimax', timeoutMs: 120000, maxRetries: 2 }) },
  { key: 'automation_env', value: JSON.stringify({ hostName: 'dev-mac', browserPath: '', status: 'unknown' }) },
  { key: 'hermes_executor_default', value: 'nous_hermes' },
  { key: 'skill_routes', value: DEFAULT_SKILL_ROUTES },
];

async function ensureOrganizationAndBrands() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({ data: { name: '云杉医疗集团' } });
  }
  await prisma.brand.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  const defaultBrand = await prisma.brand.findFirst({ orderBy: { createdAt: 'asc' } });
  if (defaultBrand) {
    const hasDefault = await prisma.brand.findFirst({ where: { isDefault: true } });
    if (!hasDefault) {
      await prisma.brand.update({ where: { id: defaultBrand.id }, data: { isDefault: true } });
    }
  }
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

  const memberCount = await prisma.organizationMember.count({ where: { organizationId: org.id } });
  if (memberCount === 0) {
    await prisma.organizationMember.createMany({
      data: [
        { organizationId: org.id, userId: 'owner-demo', displayName: '组织负责人', role: 'owner' },
        { organizationId: org.id, userId: 'editor-demo', displayName: '品牌运营', role: 'editor' },
      ],
    });
  }

  const linkCount = await prisma.externalAccountLink.count({ where: { organizationId: org.id } });
  if (linkCount === 0) {
    await prisma.externalAccountLink.create({
      data: {
        organizationId: org.id,
        externalUserId: 'agentsyun-demo-user',
        provider: 'agentsyun',
      },
    });
  }

  const brands = await prisma.brand.findMany({ where: { organizationId: org.id } });
  for (const b of brands) {
    const permCount = await prisma.brandMemberPermission.count({ where: { brandId: b.id } });
    if (permCount === 0) {
      await prisma.brandMemberPermission.create({
        data: { brandId: b.id, userId: 'editor-demo', role: 'editor' },
      });
    }
  }
}

export async function ensureRuntimeDefaults() {
  await ensureOrganizationAndBrands();

  const { ensurePlatformAccountBindings } = await import('../services/account-bind.service.js');
  await ensurePlatformAccountBindings();

  for (const { key, value } of DEFAULT_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) {
      await prisma.systemConfig.create({ data: { key, value } });
    }
  }

  await prisma.provider.updateMany({
    where: { name: '晨光传媒', applicationStatus: { not: 'approved' } },
    data: { applicationStatus: 'approved' },
  });

  const brand = await prisma.brand.findFirst();

  if (brand) {
    const { ensureDemoMarketplaceReady } = await import('../lib/ensure-demo-marketplace.js');
    const { ensureDemoWebsiteOrders } = await import('./demo-orders.js');
    const { ensureDemoPlatformOps } = await import('./demo-platform.js');
    await ensureDemoMarketplaceReady();
    await ensureDemoWebsiteOrders(brand.name);
    await ensureDemoPlatformOps();
    const { ensureDemoPublisherNotifications } = await import('./demo-notifications.js');
    await ensureDemoPublisherNotifications(brand.name);
  }

  await refreshSkillRoutesFromDb();
}
