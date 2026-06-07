#!/usr/bin/env node
/**
 * 清理历史 mock 绑定 key（hermes:device_binding）
 * 运行: node scripts/cleanup-hermes-device-binding.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.systemConfig.deleteMany({
    where: { key: 'hermes:device_binding' },
  });
  console.log(`已删除 hermes:device_binding 记录: ${result.count} 条`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
