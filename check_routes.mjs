
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const row = await prisma.systemConfig.findUnique({ where: { key: 'skill_routes' } });
console.log(JSON.stringify(row, null, 2));
await prisma.$disconnect();
