/**
 * 将近期失败的 AI 任务重新入队（修复 MiniMax 解析后使用）
 * npx tsx scripts/retry-failed-agent-tasks.ts
 */
import { prisma } from '../server/db/client.js';
import { retryAgentTask, enqueueAgentTask, startAgentWorker } from '../server/agent/worker.js';

const RETRY_TYPES = ['geo_analysis', 'website_preview', 'article_generation', 'campaign_plan', 'brand_extract'];

async function main() {
  startAgentWorker(500);

  const failed = await prisma.agentTask.findMany({
    where: {
      status: 'failed',
      type: { in: RETRY_TYPES },
      executor: 'direct_model',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (failed.length === 0) {
    console.log('没有需要重试的失败任务');
    return;
  }

  console.log(`重试 ${failed.length} 个任务…`);
  for (const row of failed) {
    const task = await retryAgentTask(row.id);
    if (task) {
      void enqueueAgentTask(task);
      console.log('已入队:', row.title);
    }
  }

  console.log('已提交重试，请等待 worker 执行（约 10–30 秒）');
  await new Promise((r) => setTimeout(r, 60000));
  for (const row of failed) {
    const updated = await prisma.agentTask.findUnique({ where: { id: row.id } });
    console.log(updated?.title, '->', updated?.status, updated?.userErrorMessage ?? '');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
