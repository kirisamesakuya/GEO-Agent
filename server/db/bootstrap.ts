import { prisma } from './client.js';
import { refreshSkillRoutesFromDb, type SkillRouteEntry } from '../lib/agent-skill.js';
import {
  MEDIA_PLATFORM_CATALOG_CONFIG_KEY,
  buildDefaultMediaPlatformCatalog,
} from '../../lib/media-platform-catalog.js';
import {
  AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY,
  buildDefaultAiMonitorPlatformCatalog,
} from '../../lib/ai-monitor-platform-catalog.js';

const DEFAULT_SKILL_ROUTE_ENTRIES: SkillRouteEntry[] = [
  { taskType: 'article_generation', skillName: 'geo.article.generate', executor: 'direct_model', enabled: true, priority: 1 },
  { taskType: 'geo_analysis', skillName: 'geo.analysis.run', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_quick_start', skillName: 'geo-quick-start', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_audit', skillName: 'geo-audit', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_schema', skillName: 'geo-schema', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_llmstxt', skillName: 'geo-llmstxt', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_citability', skillName: 'geo-citability', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_technical', skillName: 'geo-technical', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_crawlers', skillName: 'geo-crawlers', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_content', skillName: 'geo-content', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_platform_optimizer', skillName: 'geo-platform-optimizer', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_report_pdf', skillName: 'geo-report-pdf', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'geo_compare', skillName: 'geo-compare', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'campaign_plan', skillName: 'geo.campaign.plan', executor: 'direct_model', enabled: true, priority: 1 },
  { taskType: 'website_preview', skillName: 'geo.website.preview', executor: 'direct_model', enabled: true, priority: 1 },
  { taskType: 'brand_extract', skillName: 'geo-brand-mentions', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'index_sampling', skillName: 'geo-platform-ranking-sampling', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'keyword_mining', skillName: 'geo-keyword-mining-web', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'hermes_publish', skillName: 'hermes-publish-web', executor: 'nous_hermes', enabled: true, priority: 1 },
  { taskType: 'account_verify', skillName: 'account-verify-web', executor: 'nous_hermes', enabled: true, priority: 1 },
];

const DEFAULT_SKILL_ROUTES = JSON.stringify(DEFAULT_SKILL_ROUTE_ENTRIES);

const SKILL_ROUTE_UPGRADES: Record<string, Partial<SkillRouteEntry>> = {
  hermes_publish: {
    skillName: 'hermes-publish-web',
    executor: 'nous_hermes',
    enabled: true,
  },
  account_verify: {
    skillName: 'account-verify-web',
    executor: 'nous_hermes',
    enabled: true,
  },
};

async function mergeSkillRoutes() {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'skill_routes' } });
  if (!row) return;

  try {
    const existing = JSON.parse(row.value) as SkillRouteEntry[];
    const byType = new Map(existing.map((r) => [r.taskType, r]));
    let changed = false;

    for (const route of DEFAULT_SKILL_ROUTE_ENTRIES) {
      if (!byType.has(route.taskType)) {
        byType.set(route.taskType, route);
        changed = true;
      }
    }

    for (const [taskType, patch] of Object.entries(SKILL_ROUTE_UPGRADES)) {
      const current = byType.get(taskType);
      if (!current) continue;
      const next = { ...current, ...patch };
      if (
        next.skillName !== current.skillName ||
        next.executor !== current.executor ||
        next.enabled !== current.enabled
      ) {
        byType.set(taskType, next);
        changed = true;
      }
    }

    if (!changed) return;

    const merged = [...byType.values()].sort(
      (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    );
    await prisma.systemConfig.update({
      where: { key: 'skill_routes' },
      data: { value: JSON.stringify(merged) },
    });
  } catch {
    // keep existing config if malformed
  }
}

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

/** Idempotent column patches for provider onboarding fields. */
export async function ensureProviderSchemaPatches() {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "pricingNote" TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "profileReviewStatus" TEXT NOT NULL DEFAULT \'none\''
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "pendingProfileJson" TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "TaskOrderQuote" ADD COLUMN IF NOT EXISTS "mediaAccountLink" TEXT'
    );
  } catch {
    // non-fatal: migration may be handled externally
  }
}

/** Production-safe idempotent initialization: system config, skill routes, platform bindings. */
export async function ensureRuntimeDefaults() {
  const { cleanupLegacyHermesDeviceBinding } = await import(
    '../services/hermes-binding.service.js'
  );
  await cleanupLegacyHermesDeviceBinding();
  await ensureProviderSchemaPatches();

  for (const { key, value } of DEFAULT_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) {
      await prisma.systemConfig.create({ data: { key, value } });
    }
  }

  await mergeSkillRoutes();
  await ensureMediaPlatformCatalogDefaults();
  await ensureAiMonitorPlatformCatalogDefaults();

  const { seedMediaPriceBands } = await import('./seed-media-price-bands.js');
  await seedMediaPriceBands(prisma);

  if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true') {
    const { ensureDemoMediaPlatforms } = await import('./demo-media-platforms.js');
    const { ensureDemoMonitorPlatforms } = await import('./demo-monitor-platforms.js');
    const { ensureDemoFinance } = await import('./demo-finance.js');
    await ensureDemoMediaPlatforms();
    await ensureDemoMonitorPlatforms();
    await ensureDemoFinance();
  }

  const { ensurePlatformAccountBindings } = await import('../services/account-bind.service.js');
  await ensurePlatformAccountBindings();

  await refreshSkillRoutesFromDb();
}

async function ensureMediaPlatformCatalogDefaults() {
  const existing = await prisma.systemConfig.findUnique({
    where: { key: MEDIA_PLATFORM_CATALOG_CONFIG_KEY },
  });
  if (existing?.value?.trim()) return;
  const defaults = buildDefaultMediaPlatformCatalog();
  await prisma.systemConfig.create({
    data: {
      key: MEDIA_PLATFORM_CATALOG_CONFIG_KEY,
      value: JSON.stringify(defaults),
    },
  });
}

async function ensureAiMonitorPlatformCatalogDefaults() {
  const existing = await prisma.systemConfig.findUnique({
    where: { key: AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY },
  });
  if (existing?.value?.trim()) return;
  const defaults = buildDefaultAiMonitorPlatformCatalog();
  await prisma.systemConfig.create({
    data: {
      key: AI_MONITOR_PLATFORM_CATALOG_CONFIG_KEY,
      value: JSON.stringify(defaults),
    },
  });
}
