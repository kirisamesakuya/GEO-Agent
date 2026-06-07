import { prisma } from '../server/db/client.js';

const tasks = await prisma.agentTask.updateMany({
  where: { status: 'partial', userErrorMessage: { contains: '降级' } },
  data: { status: 'succeeded' },
});

const batches = await prisma.contentBatch.updateMany({
  where: { status: 'partial', articleCount: { gt: 0 } },
  data: { status: 'ready' },
});

console.log(JSON.stringify({ tasksUpdated: tasks.count, batchesUpdated: batches.count }));
await prisma.$disconnect();
