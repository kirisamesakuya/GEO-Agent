import { prisma } from '../db/client.js';
import { paginatedResult, parsePagination } from '../lib/pagination.js';

export async function appendAuditLog(input: {
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
  userId?: string;
  source?: string;
}) {
  return prisma.auditLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      detail: input.detail,
      userId: input.userId,
      source: input.source ?? 'web',
    },
  });
}

export async function listAuditLogs(filters?: {
  action?: string;
  entity?: string;
  source?: string;
  since?: string;
  until?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}) {
  const usePagination = filters?.page !== undefined || filters?.pageSize !== undefined;
  const { page, pageSize, skip, take } = parsePagination(
    { page: String(filters?.page ?? 1), pageSize: String(filters?.pageSize ?? filters?.limit ?? 50) },
    filters?.pageSize ?? filters?.limit ?? 50
  );

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (filters?.since) createdAt.gte = new Date(filters.since);
  if (filters?.until) createdAt.lte = new Date(filters.until);

  const where = {
    ...(filters?.action ? { action: { contains: filters.action } } : {}),
    ...(filters?.entity ? { entity: filters.entity } : {}),
    ...(filters?.source ? { source: filters.source } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  if (!usePagination && filters?.limit) {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
    });
    return { logs, total: logs.length, page: 1, pageSize: logs.length, hasMore: false };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.auditLog.count({ where }),
  ]);

  const result = paginatedResult(logs, total, page, pageSize);
  return { logs: result.items, ...result };
}

export async function getPlatformStats() {
  const [taskTotal, taskFailed, orderPending, orderDisputed, providers, pendingDeposits] =
    await Promise.all([
      prisma.agentTask.count(),
      prisma.agentTask.count({ where: { status: 'failed' } }),
      prisma.taskOrder.count({ where: { status: 'pending_review' } }),
      prisma.taskOrder.count({ where: { status: 'disputed' } }),
      prisma.provider.count({ where: { status: 'active' } }),
      prisma.budgetDepositRequest.count({ where: { status: 'pending' } }),
    ]);
  return { taskTotal, taskFailed, orderPending, orderDisputed, providers, pendingDeposits };
}
