import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { netEarnings } from './withdrawal.service.js';

export type SettlementStatus = 'pending_platform' | 'pending_offline' | 'settled';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending_platform: '待平台确认',
  pending_offline: '待线下结算',
  settled: '已结算',
};

export async function ensureSettlementOnAcceptance(orderId: string, amount: number) {
  const existing = await prisma.settlementRecord.findUnique({ where: { orderId } });
  if (existing) return existing;
  return prisma.settlementRecord.create({
    data: { orderId, amount, status: 'pending_platform' },
  });
}

export async function advanceSettlement(
  orderId: string,
  status: SettlementStatus,
  note?: string,
  operatorId?: string
) {
  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'completed') {
    throw new Error('仅已完成订单可更新结算状态');
  }

  const record = await prisma.settlementRecord.upsert({
    where: { orderId },
    create: { orderId, amount: order.budget, status, note, operatorId },
    update: { status, note, operatorId },
  });

  await appendAuditLog({
    action: 'settlement_status_change',
    entity: 'SettlementRecord',
    entityId: record.id,
    detail: `${status}:${note ?? ''}`,
    source: 'platform',
  });

  return record;
}

export async function getSettlementByOrderId(orderId: string) {
  return prisma.settlementRecord.findUnique({ where: { orderId } });
}

export async function countPendingSettlementForProvider(providerId: string) {
  const orders = await prisma.taskOrder.findMany({
    where: { providerId, status: 'completed' },
    select: { id: true, budget: true, settlement: true },
  });
  let count = 0;
  let amount = 0;
  for (const o of orders) {
    const st = o.settlement?.status ?? 'pending_platform';
    if (st !== 'settled') {
      count += 1;
      const gross = o.settlement?.amount ?? o.budget;
      amount += netEarnings(gross);
    }
  }
  return { count, amount };
}
