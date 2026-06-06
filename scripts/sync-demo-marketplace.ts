import { ensureDemoMarketplaceReady } from '../server/lib/ensure-demo-marketplace.js';
import { prisma } from '../server/db/client.js';

await ensureDemoMarketplaceReady();

const published = await prisma.taskOrder.count({ where: { status: 'published' } });
const demoPublished = await prisma.taskOrder.count({
  where: { status: 'published', title: { startsWith: '[演示]' } },
});

console.log(`演示任务大厅已同步：published=${published}，其中演示=${demoPublished}`);
await prisma.$disconnect();
