import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { createProviderNotification } from './notification.service.js';
import {
  formatProviderPayoutBrief,
  payoutChannelLabel,
  providerPayoutNameMatch,
} from '../../lib/provider-payout.js';
import {
  formatEarningsIncomeTitle,
} from '../../lib/earnings-transaction-display.js';
import { MARKETPLACE_PLATFORM_FEE_RATE } from '../../lib/marketplace-agreements.js';

/**
 * DEMO_ONLY:
 * 当前结算和提现为演示流程，不代表真实财务规则。
 *
 * PRODUCTION_TODO:
 * 真实产品中应接入财务结算、提现审核、发票、税务、风控和打款系统。
 */
export const PLATFORM_FEE_RATE = MARKETPLACE_PLATFORM_FEE_RATE;
export const DAILY_WITHDRAWAL_LIMIT = 100_000;

export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export function netEarnings(gross: number) {
  return Math.round(gross * (1 - PLATFORM_FEE_RATE) * 100) / 100;
}

function orderGrossAmount(order: { budget: number; settlement?: { amount: number } | null }) {
  return order.settlement?.amount ?? order.budget;
}

export async function getProviderWalletSummary(providerId: string) {
  const [orders, withdrawals] = await Promise.all([
    prisma.taskOrder.findMany({
      where: { providerId, status: 'completed' },
      include: { settlement: true },
    }),
    prisma.providerWithdrawalRequest.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let accumulatedIncome = 0;
  let frozen = 0;
  let settledNet = 0;

  for (const o of orders) {
    const gross = orderGrossAmount(o);
    const net = netEarnings(gross);
    accumulatedIncome += net;
    const st = o.settlement?.status ?? 'pending_platform';
    if (st === 'settled') {
      settledNet += net;
    } else {
      frozen += net;
    }
  }

  let reserved = 0;
  let withdrawn = 0;
  for (const w of withdrawals) {
    if (w.status === 'paid') {
      withdrawn += w.amount;
    } else if (w.status === 'pending' || w.status === 'approved') {
      reserved += w.amount;
    }
  }

  const extractable = Math.max(0, Math.round((settledNet - reserved - withdrawn) * 100) / 100);

  return {
    extractable,
    frozen: Math.round(frozen * 100) / 100,
    accumulatedIncome: Math.round(accumulatedIncome * 100) / 100,
    settledNet: Math.round(settledNet * 100) / 100,
    reserved: Math.round(reserved * 100) / 100,
    withdrawn: Math.round(withdrawn * 100) / 100,
  };
}

export async function listWithdrawalRequests(options?: {
  providerId?: string;
  providerName?: string;
  status?: string;
  limit?: number;
}) {
  const { providerId, providerName, status, limit = 50 } = options ?? {};
  return prisma.providerWithdrawalRequest.findMany({
    where: {
      ...(providerId ? { providerId } : {}),
      ...(status ? { status } : {}),
      ...(providerName
        ? { provider: { name: { contains: providerName, mode: 'insensitive' } } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          payoutChannel: true,
          payoutAccountName: true,
          payoutAccountLabel: true,
          identityRealName: true,
          identityIdNumberMask: true,
          identityVerifiedAt: true,
        },
      },
    },
  });
}

function mapWithdrawalRequestRow(
  r: Awaited<ReturnType<typeof listWithdrawalRequests>>[number]
) {
  const p = r.provider;
  const payoutBrief = p ? formatProviderPayoutBrief(p) : '—';
  return {
    ...r,
    payoutChannel: p?.payoutChannel ?? r.channel,
    payoutChannelLabel: p?.payoutChannel ? payoutChannelLabel(p.payoutChannel) : payoutChannelLabel(r.channel),
    payoutAccountName: p?.payoutAccountName ?? null,
    payoutAccountLabel: p?.payoutAccountLabel ?? null,
    payoutBrief,
    identityRealName: p?.identityRealName ?? null,
    identityIdNumberMask: p?.identityIdNumberMask ?? null,
    identityVerified: Boolean(p?.identityVerifiedAt),
    payoutNameMatch: p ? providerPayoutNameMatch(p) : null,
  };
}

export async function listWithdrawalRequestsMapped(options?: Parameters<typeof listWithdrawalRequests>[0]) {
  const rows = await listWithdrawalRequests(options);
  return rows.map(mapWithdrawalRequestRow);
}

export async function listPlatformProviderAccounts(options?: {
  providerName?: string;
  payoutBound?: 'yes' | 'no';
}) {
  const providers = await prisma.provider.findMany({
    where: {
      applicationStatus: 'approved',
      ...(options?.providerName
        ? { name: { contains: options.providerName, mode: 'insensitive' } }
        : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      contactName: true,
      phone: true,
      payoutChannel: true,
      payoutAccountName: true,
      payoutAccountLabel: true,
      identityRealName: true,
      identityIdNumberMask: true,
      identityVerifiedAt: true,
    },
  });

  let rows = await Promise.all(
    providers.map(async (p) => {
      const wallet = await getProviderWalletSummary(p.id);
      const pendingWithdrawal = await prisma.providerWithdrawalRequest.count({
        where: { providerId: p.id, status: { in: ['pending', 'approved'] } },
      });
      const hasPayoutAccount = Boolean(p.payoutAccountLabel?.trim());
      const identityVerified = Boolean(p.identityVerifiedAt);
      const nameMatch =
        identityVerified && p.identityRealName && p.payoutAccountName
          ? p.identityRealName === p.payoutAccountName
          : null;
      return {
        providerId: p.id,
        providerName: p.name,
        contactName: p.contactName,
        phone: p.phone,
        payoutChannel: p.payoutChannel,
        payoutAccountName: p.payoutAccountName,
        payoutAccountLabel: p.payoutAccountLabel,
        hasPayoutAccount,
        identityVerified,
        identityRealName: p.identityRealName,
        identityIdNumberMask: p.identityIdNumberMask,
        identityVerifiedAt: p.identityVerifiedAt,
        nameMatch,
        pendingWithdrawal,
        ...wallet,
      };
    })
  );

  if (options?.payoutBound === 'yes') rows = rows.filter((r) => r.hasPayoutAccount);
  if (options?.payoutBound === 'no') rows = rows.filter((r) => !r.hasPayoutAccount);
  return rows;
}

export async function getWithdrawalRequestStats() {
  const [pending, approved, paid, rejected, agg] = await Promise.all([
    prisma.providerWithdrawalRequest.count({ where: { status: 'pending' } }),
    prisma.providerWithdrawalRequest.count({ where: { status: 'approved' } }),
    prisma.providerWithdrawalRequest.count({ where: { status: 'paid' } }),
    prisma.providerWithdrawalRequest.count({ where: { status: 'rejected' } }),
    prisma.providerWithdrawalRequest.aggregate({
      where: { status: { in: ['pending', 'approved'] } },
      _sum: { amount: true },
    }),
  ]);
  return {
    pending,
    approved,
    paid,
    rejected,
    pendingAmount: Math.round((agg._sum.amount ?? 0) * 100) / 100,
  };
}

export async function listWithdrawalRequestsWithWallet(options?: {
  providerName?: string;
  status?: string;
  limit?: number;
}) {
  const requests = await listWithdrawalRequestsMapped(options);
  const walletByProvider = new Map<string, Awaited<ReturnType<typeof getProviderWalletSummary>>>();
  const enriched = await Promise.all(
    requests.map(async (r) => {
      if (!walletByProvider.has(r.providerId)) {
        walletByProvider.set(r.providerId, await getProviderWalletSummary(r.providerId));
      }
      return {
        ...r,
        walletSnapshot: walletByProvider.get(r.providerId),
      };
    })
  );
  return enriched;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getTodayWithdrawalTotal(providerId: string) {
  const today = startOfToday();
  const rows = await prisma.providerWithdrawalRequest.findMany({
    where: {
      providerId,
      createdAt: { gte: today },
      status: { in: ['pending', 'approved', 'paid'] },
    },
  });
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

export async function createWithdrawalRequest(input: {
  providerId: string;
  amount: number;
  channel?: string;
  channelLabel?: string;
}) {
  const { providerId, amount } = input;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('提现金额必须大于 0');
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error('接单方不存在');
  if (provider.applicationStatus !== 'approved') {
    throw new Error('入驻审核通过后方可提现');
  }
  if (!provider.identityVerifiedAt) {
    throw new Error('请先完成身份证实名认证');
  }
  if (!provider.payoutAccountLabel?.trim()) {
    throw new Error('请先在个人中心维护提现账户');
  }

  const payoutChannel = provider.payoutChannel ?? 'alipay';
  const payoutBrief = formatProviderPayoutBrief(provider);

  const wallet = await getProviderWalletSummary(providerId);
  if (amount > wallet.extractable) {
    throw new Error(`可提现余额不足，当前可提 ¥${wallet.extractable.toFixed(2)}`);
  }

  const todayTotal = await getTodayWithdrawalTotal(providerId);
  if (todayTotal + amount > DAILY_WITHDRAWAL_LIMIT) {
    throw new Error(`单日提现额度不超过 ¥${DAILY_WITHDRAWAL_LIMIT.toLocaleString('zh-CN')}`);
  }

  const request = await prisma.providerWithdrawalRequest.create({
    data: {
      providerId,
      amount: Math.round(amount * 100) / 100,
      channel: payoutChannel,
      channelLabel: payoutBrief,
      status: 'pending',
    },
  });

  await appendAuditLog({
    action: 'provider_withdrawal_request',
    entity: 'ProviderWithdrawalRequest',
    entityId: request.id,
    detail: `${provider.name} -${amount}`,
  });

  return request;
}

export async function approveWithdrawalRequest(requestId: string, operatorId?: string) {
  const request = await prisma.providerWithdrawalRequest.findUnique({
    where: { id: requestId },
    include: { provider: true },
  });
  if (!request) throw new Error('提现申请不存在');
  if (request.status !== 'pending') throw new Error('仅待审核申请可通过');

  const updated = await prisma.providerWithdrawalRequest.update({
    where: { id: requestId },
    data: { status: 'approved', reviewedAt: new Date(), operatorId },
  });

  await appendAuditLog({
    action: 'provider_withdrawal_approve',
    entity: 'ProviderWithdrawalRequest',
    entityId: requestId,
    detail: String(request.amount),
    source: 'platform',
  });

  await createProviderNotification({
    providerId: request.providerId,
    type: 'withdrawal',
    title: '提现申请已通过',
    body: `¥${request.amount.toFixed(2)} 提现申请已审核通过，平台将尽快打款。`,
    refId: requestId,
  });

  return updated;
}

export async function rejectWithdrawalRequest(
  requestId: string,
  reason?: string,
  operatorId?: string
) {
  const request = await prisma.providerWithdrawalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error('提现申请不存在');
  if (request.status !== 'pending') throw new Error('仅待审核申请可驳回');

  const updated = await prisma.providerWithdrawalRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedAt: new Date(),
      note: reason ?? '平台驳回',
      operatorId,
    },
  });

  await appendAuditLog({
    action: 'provider_withdrawal_reject',
    entity: 'ProviderWithdrawalRequest',
    entityId: requestId,
    detail: reason,
    source: 'platform',
  });

  await createProviderNotification({
    providerId: request.providerId,
    type: 'withdrawal',
    title: '提现申请已驳回',
    body: reason ?? '您的提现申请未通过审核，可提现余额已恢复。',
    refId: requestId,
  });

  return updated;
}

export async function markWithdrawalPaid(
  requestId: string,
  operatorId?: string,
  options?: { paidNote?: string; paidVoucher?: string }
) {
  const request = await prisma.providerWithdrawalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error('提现申请不存在');
  if (request.status !== 'approved') throw new Error('仅已审核通过的申请可标记打款');

  const updated = await prisma.providerWithdrawalRequest.update({
    where: { id: requestId },
    data: {
      status: 'paid',
      paidAt: new Date(),
      operatorId,
      paidNote: options?.paidNote?.trim() || null,
      paidVoucher: options?.paidVoucher?.trim() || null,
    },
  });

  await appendAuditLog({
    action: 'provider_withdrawal_paid',
    entity: 'ProviderWithdrawalRequest',
    entityId: requestId,
    detail: String(request.amount),
    source: 'platform',
  });

  await createProviderNotification({
    providerId: request.providerId,
    type: 'withdrawal',
    title: '提现已到账',
    body: `¥${request.amount.toFixed(2)} 已打款至 ${request.channelLabel ?? request.channel}。`,
    refId: requestId,
  });

  return updated;
}

export async function buildProviderEarningsTransactions(providerId: string) {
  const [orders, withdrawals] = await Promise.all([
    prisma.taskOrder.findMany({
      where: { providerId, status: 'completed' },
      include: { settlement: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.providerWithdrawalRequest.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        provider: {
          select: {
            payoutChannel: true,
            payoutAccountName: true,
            payoutAccountLabel: true,
          },
        },
      },
    }),
  ]);

  const incomeTx = orders.map((o) => {
    const gross = orderGrossAmount(o);
    const net = netEarnings(gross);
    const settlementStatus = o.settlement?.status ?? 'pending_platform';
    return {
      id: o.settlement?.id ?? o.id,
      title: formatEarningsIncomeTitle(o.title, o.type),
      brand: o.brandName ?? undefined,
      orderId: o.id,
      type: 'income' as const,
      settlementStatus,
      amount: net,
      grossAmount: gross,
      platformFee: Math.round((gross - net) * 100) / 100,
      time: o.updatedAt.toISOString(),
      platform: o.platform,
    };
  });

  const withdrawalTx = withdrawals
    .filter((w) => w.status !== 'rejected')
    .map((w) => {
      const p = w.provider;
      return {
        id: w.id,
        title: '提现申请',
        channelLabel: w.channelLabel ?? payoutChannelLabel(w.channel),
        payoutChannelLabel: p?.payoutChannel
          ? payoutChannelLabel(p.payoutChannel)
          : payoutChannelLabel(w.channel),
        payoutAccountName: p?.payoutAccountName ?? null,
        payoutAccountLabel: p?.payoutAccountLabel ?? null,
        type: 'withdrawal' as const,
        withdrawalStatus: w.status,
        amount: w.amount,
        time: w.createdAt.toISOString(),
      };
    });

  const transactions = [...incomeTx, ...withdrawalTx].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const wallet = await getProviderWalletSummary(providerId);
  return { wallet, transactions };
}
