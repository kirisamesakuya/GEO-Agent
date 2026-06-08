import { prisma } from './client.js';

const DEMO_FINANCE_KEY = 'demo_finance_v';
const DEMO_FINANCE_VERSION = '2';

export async function ensureDemoFinance(): Promise<void> {
  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_FINANCE_KEY } });
  if (marker?.value === DEMO_FINANCE_VERSION) return;

  const chenguang = await prisma.provider.findFirst({ where: { name: '晨光传媒' } });
  if (chenguang) {
    await prisma.provider.update({
      where: { id: chenguang.id },
      data: {
        identityRealName: '张晨',
        identityIdNumberMask: '320***********1234',
        identityVerifiedAt: new Date('2025-01-15'),
        payoutChannel: 'bank',
        payoutAccountName: '张晨',
        payoutAccountLabel: '银行卡 招商银行储蓄卡 ****8821',
      },
    });
    const completedOrders = await prisma.taskOrder.findMany({
      where: { providerId: chenguang.id, status: 'completed' },
      include: { settlement: true },
      take: 3,
    });
    for (const order of completedOrders) {
      if (order.settlement) {
        await prisma.settlementRecord.update({
          where: { id: order.settlement.id },
          data: { status: 'settled' },
        });
      } else {
        await prisma.settlementRecord.create({
          data: {
            orderId: order.id,
            status: 'settled',
            amount: order.budget,
          },
        });
      }
    }

    const existingWithdrawals = await prisma.providerWithdrawalRequest.count({
      where: { providerId: chenguang.id },
    });
    if (existingWithdrawals === 0) {
      const now = Date.now();
      await prisma.providerWithdrawalRequest.createMany({
        data: [
          {
            providerId: chenguang.id,
            amount: 1200,
            channel: 'bank',
            channelLabel: '招商银行 **** 8821',
            status: 'pending',
            createdAt: new Date(now - 2 * 86400000),
          },
          {
            providerId: chenguang.id,
            amount: 800,
            channel: 'alipay',
            channelLabel: '支付宝 张晨',
            status: 'pending',
            createdAt: new Date(now - 86400000),
          },
          {
            providerId: chenguang.id,
            amount: 1500,
            channel: 'bank',
            channelLabel: '招商银行 **** 8821',
            status: 'approved',
            reviewedAt: new Date(now - 43200000),
            createdAt: new Date(now - 3 * 86400000),
          },
          {
            providerId: chenguang.id,
            amount: 2000,
            channel: 'bank',
            channelLabel: '招商银行 **** 8821',
            status: 'paid',
            reviewedAt: new Date(now - 10 * 86400000),
            paidAt: new Date(now - 9 * 86400000),
            paidNote: '线下转账流水号 202606010001',
            createdAt: new Date(now - 12 * 86400000),
          },
          {
            providerId: chenguang.id,
            amount: 500,
            channel: 'alipay',
            channelLabel: '支付宝 张晨',
            status: 'paid',
            reviewedAt: new Date(now - 20 * 86400000),
            paidAt: new Date(now - 19 * 86400000),
            paidNote: '支付宝批量付款 202605280088',
            createdAt: new Date(now - 21 * 86400000),
          },
          {
            providerId: chenguang.id,
            amount: 3000,
            channel: 'bank',
            channelLabel: '招商银行 **** 8821',
            status: 'rejected',
            note: '提现金额超过可提现余额',
            reviewedAt: new Date(now - 5 * 86400000),
            createdAt: new Date(now - 6 * 86400000),
          },
        ],
      });
    }
  }

  const pendingDeposits = await prisma.budgetDepositRequest.count({ where: { status: 'pending' } });
  if (pendingDeposits === 0) {
    await prisma.budgetDepositRequest.createMany({
      data: [
        {
          brandName: '云杉口腔',
          amount: 50000,
          note: '线下对公转账，凭证号 GS20260608001',
          status: 'pending',
        },
        {
          brandName: '瑞美齿科华东',
          amount: 20000,
          note: '银行转账待核实',
          status: 'pending',
        },
      ],
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: DEMO_FINANCE_KEY },
    create: { key: DEMO_FINANCE_KEY, value: DEMO_FINANCE_VERSION },
    update: { value: DEMO_FINANCE_VERSION },
  });
}
