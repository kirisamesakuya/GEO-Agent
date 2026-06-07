import { prisma } from '../db/client.js';

const DEMO_PREFIX = '[演示]';

/** 与演示任务重复的「非演示」标题，同步后删除避免大厅只显示 2 条 */
const ORPHAN_PUBLISHED_TITLES = ['南京种植牙种草测评'] as const;

/**
 * 保证默认品牌下演示任务包完整（发布端订单交付 + 接单端任务大厅共用同一套 DB 数据）。
 * 幂等：仅补齐缺失的 [演示] 任务，并清理重复的非演示待接单。
 */
export async function ensureDemoMarketplaceReady(): Promise<void> {
  const brand =
    (await prisma.brand.findFirst({
      where: { status: { not: 'archived' }, isDefault: true },
      orderBy: { createdAt: 'asc' },
    })) ??
    (await prisma.brand.findFirst({
      where: { status: { not: 'archived' } },
      orderBy: { createdAt: 'asc' },
    }));

  if (!brand) return;

  const { ensureDemoTaskOrders } = await import('../db/demo-orders.js');
  await ensureDemoTaskOrders(brand.name);
  await dedupeOrphanPublishedTasks(brand.name);
}

async function dedupeOrphanPublishedTasks(brandName: string): Promise<void> {
  for (const orphanTitle of ORPHAN_PUBLISHED_TITLES) {
    const demoExists = await prisma.taskOrder.findFirst({
      where: {
        brandName,
        status: 'published',
        title: { startsWith: DEMO_PREFIX, contains: orphanTitle },
      },
    });
    if (!demoExists) continue;

    await prisma.taskOrder.deleteMany({
      where: {
        brandName,
        title: orphanTitle,
        NOT: { title: { startsWith: DEMO_PREFIX } },
      },
    });
  }
}
