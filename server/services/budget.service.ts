import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';

export async function getBudgetAccount(brandName: string) {
  let row = await prisma.budgetAccount.findUnique({ where: { brandName } });
  if (!row) {
    row = await prisma.budgetAccount.create({ data: { brandName, balance: 10000, frozen: 0 } });
  }
  return { brandName: row.brandName, balance: row.balance, frozen: row.frozen, available: row.balance - row.frozen };
}

export async function listBudgetLedger(brandName: string, limit = 50) {
  return prisma.budgetLedger.findMany({
    where: { brandName },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function applyManualDeposit(brandName: string, amount: number, note?: string) {
  const account = await getBudgetAccount(brandName);
  const newBalance = account.balance + amount;
  await prisma.budgetAccount.update({
    where: { brandName },
    data: { balance: newBalance },
  });
  await prisma.budgetLedger.create({
    data: { brandName, type: 'manual_deposit', amount, balance: newBalance, note: note ?? '人工入账' },
  });
  await appendAuditLog({ action: 'budget_deposit_apply', entity: 'BudgetAccount', entityId: brandName, detail: String(amount) });
  return getBudgetAccount(brandName);
}

export async function createRechargeOrder(brandName: string, amount: number, note?: string) {
  const order = await prisma.budgetRechargeOrder.create({
    data: { brandName, amount, note: note ?? '前台充值' },
  });
  await appendAuditLog({
    action: 'budget_recharge_order_create',
    entity: 'BudgetRechargeOrder',
    entityId: order.id,
    detail: `${brandName} ¥${amount}`,
  });
  return order;
}

/** 演示环境：模拟支付成功并入账 */
export async function completeRechargeOrder(orderId: string) {
  const order = await prisma.budgetRechargeOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('充值订单不存在');
  if (order.status === 'paid') throw new Error('订单已支付');

  await applyManualDeposit(order.brandName, order.amount, `前台充值 ${orderId}`);
  const updated = await prisma.budgetRechargeOrder.update({
    where: { id: orderId },
    data: { status: 'paid', paidAt: new Date() },
  });
  await appendAuditLog({
    action: 'budget_recharge_order_paid',
    entity: 'BudgetRechargeOrder',
    entityId: orderId,
    detail: String(order.amount),
  });
  return updated;
}

export async function listRechargeOrders(brandName: string, limit = 20) {
  return prisma.budgetRechargeOrder.findMany({
    where: { brandName },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function createDepositRequest(brandName: string, amount: number, note?: string) {
  const request = await prisma.budgetDepositRequest.create({
    data: { brandName, amount, note: note ?? '人工入账申请' },
  });
  await appendAuditLog({
    action: 'budget_deposit_request',
    entity: 'BudgetDepositRequest',
    entityId: request.id,
    detail: `${brandName} +${amount}`,
  });
  return request;
}

export async function listDepositRequests(brandName?: string, status = 'pending') {
  return prisma.budgetDepositRequest.findMany({
    where: {
      ...(brandName ? { brandName } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveDepositRequest(requestId: string) {
  const request = await prisma.budgetDepositRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error('申请不存在');
  if (request.status !== 'pending') throw new Error('申请已处理');

  await applyManualDeposit(request.brandName, request.amount, request.note ?? '平台审核入账');
  const updated = await prisma.budgetDepositRequest.update({
    where: { id: requestId },
    data: { status: 'approved', reviewedAt: new Date() },
  });
  await appendAuditLog({
    action: 'budget_deposit_approve',
    entity: 'BudgetDepositRequest',
    entityId: requestId,
    detail: String(request.amount),
  });
  return updated;
}

export async function rejectDepositRequest(requestId: string, reason?: string) {
  const updated = await prisma.budgetDepositRequest.update({
    where: { id: requestId },
    data: { status: 'rejected', reviewedAt: new Date(), note: reason ?? undefined },
  });
  await appendAuditLog({
    action: 'budget_deposit_reject',
    entity: 'BudgetDepositRequest',
    entityId: requestId,
    detail: reason,
  });
  return updated;
}

export async function freezeBudget(brandName: string, amount: number, refId?: string) {
  const account = await getBudgetAccount(brandName);
  if (account.available < amount) {
    return { ok: false as const, error: '投放余额不足，请申请人工入账或保存草稿', account };
  }
  const newFrozen = account.frozen + amount;
  await prisma.budgetAccount.update({ where: { brandName }, data: { frozen: newFrozen } });
  await prisma.budgetLedger.create({
    data: { brandName, type: 'freeze', amount, balance: account.balance, refId, note: '任务发布冻结' },
  });
  return { ok: true as const, account: await getBudgetAccount(brandName) };
}

export async function releaseBudget(brandName: string, amount: number, refId?: string) {
  const account = await getBudgetAccount(brandName);
  const newFrozen = Math.max(0, account.frozen - amount);
  await prisma.budgetAccount.update({ where: { brandName }, data: { frozen: newFrozen } });
  await prisma.budgetLedger.create({
    data: { brandName, type: 'release', amount, balance: account.balance, refId, note: '预算释放' },
  });
  return getBudgetAccount(brandName);
}

export async function checkBudget(brandName: string, amount: number) {
  const account = await getBudgetAccount(brandName);
  if (account.available < amount) {
    return { ok: false, account, error: '投放余额不足，可保存计划或申请人工入账' };
  }
  return { ok: true, account };
}

export async function listPlatformBudgetLedgers(options?: {
  type?: string;
  anomaly?: boolean;
  limit?: number;
}) {
  const accounts = await prisma.budgetAccount.findMany();
  const accountMap = new Map(accounts.map((a) => [a.brandName, a]));

  let rows = await prisma.budgetLedger.findMany({
    where: options?.type ? { type: options.type } : {},
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
  });

  const enriched = rows.map((r) => {
    const acc = accountMap.get(r.brandName);
    const frozenExceeds = acc ? acc.frozen > acc.balance : false;
    return { ...r, anomaly: frozenExceeds };
  });

  if (options?.anomaly) {
    return enriched.filter((r) => r.anomaly);
  }
  return enriched;
}

export async function platformAdjustBudget(
  brandName: string,
  amount: number,
  reason: string
) {
  if (!reason.trim()) throw new Error('请填写调整原因');
  if (amount === 0) throw new Error('调整金额不能为 0');

  const account = await getBudgetAccount(brandName);
  const newBalance = account.balance + amount;
  if (newBalance < 0) throw new Error('调整后余额不能为负');

  await prisma.budgetAccount.update({
    where: { brandName },
    data: { balance: newBalance },
  });
  await prisma.budgetLedger.create({
    data: {
      brandName,
      type: amount > 0 ? 'platform_credit' : 'platform_debit',
      amount,
      balance: newBalance,
      note: reason,
    },
  });
  await appendAuditLog({
    action: 'platform_budget_adjust',
    entity: 'BudgetAccount',
    entityId: brandName,
    detail: `${amount}:${reason}`,
    source: 'platform',
  });
  return getBudgetAccount(brandName);
}
