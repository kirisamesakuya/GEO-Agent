import { prisma } from '../db/client.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';

export async function runGlobalHealthCheck() {
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const dbUrl = process.env.DATABASE_URL ?? '';

  try {
    const [brands, websiteOrders, providers] = await Promise.all([
      prisma.brand.count(),
      prisma.websiteOrder.count(),
      prisma.provider.count(),
    ]);
    checks.push({
      name: 'database',
      ok: true,
      detail: `brands=${brands} websiteOrders=${websiteOrders} providers=${providers}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({ name: 'database', ok: false, detail: msg });
  }

  try {
    await prisma.websiteOrder.findMany({
      take: 1,
      select: { id: true, assigneeId: true, assigneeName: true },
    });
    checks.push({ name: 'website_order_schema', ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({ name: 'website_order_schema', ok: false, detail: msg });
  }

  const hermes = await checkHermesHealth();
  checks.push({ name: 'hermes', ok: hermes.ok, detail: hermes.detail ?? hermes.url });

  try {
    const { getPlatformDashboard } = await import('../services/platform.service.js');
    await getPlatformDashboard();
    checks.push({ name: 'platform_dashboard', ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({ name: 'platform_dashboard', ok: false, detail: msg });
  }

  const critical = checks.filter((c) => c.name !== 'hermes');
  const ok = critical.every((c) => c.ok);
  return { ok, checks, databaseUrl: dbUrl, hermesOptional: true };
}
