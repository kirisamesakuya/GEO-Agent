import { prisma } from './client.js';
import {
  DEMO_PROVIDER_PAYOUT_PROFILES,
  DEMO_WITHDRAWAL_REQUESTS,
  demoChannelLabel,
} from './demo-provider-finance-fixtures.js';

const DEMO_FINANCE_KEY = 'demo_finance_v';
const DEMO_FINANCE_VERSION = '6';

/** 收益中心演示：已完成且已结算的订单（标题不含订单阶段前缀） */
const DEMO_EARNINGS_ORDER_SPECS = [
  {
    providerName: '晨光传媒',
    brandName: '云杉口腔',
    title: '[演示] 小红书探店 · 河西门店体验',
    type: '探店',
    platform: '小红书',
    budget: 4200,
    daysAgo: 18,
  },
  {
    providerName: '晨光传媒',
    brandName: '云杉口腔',
    title: '[演示] 知乎问答 · 种植牙选购指南',
    type: '问答覆盖',
    platform: '知乎',
    budget: 1500,
    daysAgo: 25,
  },
  {
    providerName: '蓝海内容',
    brandName: '云杉口腔',
    title: '[演示] 公众号软文 · 暑期矫正活动',
    type: '文章',
    platform: '公众号',
    budget: 2200,
    daysAgo: 20,
  },
] as const;

function profileData(profile: (typeof DEMO_PROVIDER_PAYOUT_PROFILES)[number]) {
  return {
    applicationStatus: profile.applicationStatus,
    status: 'active' as const,
    contactName: profile.contactName,
    phone: profile.phone,
    ...(profile.city ? { city: profile.city } : {}),
    identityRealName: profile.identityRealName,
    identityIdNumberMask: profile.identityIdNumberMask,
    identityVerifiedAt: new Date(profile.identityVerifiedAt),
    payoutChannel: profile.payoutChannel,
    payoutAccountName: profile.payoutAccountName,
    payoutAccountLabel: profile.payoutAccountLabel,
  };
}

/** 幂等同步演示接单方实名与提现账户（开发/演示环境每次启动可跑） */
export async function syncDemoProviderFinanceProfiles(): Promise<number> {
  let synced = 0;
  for (const profile of DEMO_PROVIDER_PAYOUT_PROFILES) {
    const data = profileData(profile);
    const existing = await prisma.provider.findFirst({ where: { name: profile.providerName } });
    if (existing) {
      await prisma.provider.update({ where: { id: existing.id }, data });
    } else {
      await prisma.provider.create({
        data: {
          name: profile.providerName,
          type: profile.type,
          capabilities: JSON.stringify(profile.capabilities),
          ...data,
        },
      });
    }
    synced += 1;
  }
  return synced;
}

async function settleProviderOrders(providerName: string, take = 3) {
  const provider = await prisma.provider.findFirst({ where: { name: providerName } });
  if (!provider) return;

  const completedOrders = await prisma.taskOrder.findMany({
    where: { providerId: provider.id, status: 'completed' },
    include: { settlement: true },
    take,
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
}

async function seedDemoEarningsOrders() {
  const now = Date.now();
  const dayMs = 86400000;

  for (const spec of DEMO_EARNINGS_ORDER_SPECS) {
    const exists = await prisma.taskOrder.findFirst({ where: { title: spec.title } });
    if (exists) continue;

    const provider = await prisma.provider.findFirst({ where: { name: spec.providerName } });
    if (!provider) continue;

    const updatedAt = new Date(now - spec.daysAgo * dayMs);
    await prisma.taskOrder.create({
      data: {
        brandName: spec.brandName,
        title: spec.title,
        type: spec.type,
        platform: spec.platform,
        budget: spec.budget,
        deliverable: '演示结算订单',
        acceptance: '链接回传',
        status: 'completed',
        providerId: provider.id,
        providerName: provider.name,
        updatedAt,
        settlement: {
          create: {
            status: 'settled',
            amount: spec.budget,
          },
        },
      },
    });
  }
}

async function seedDemoWithdrawals() {
  const now = Date.now();
  const dayMs = 86400000;

  for (const spec of DEMO_WITHDRAWAL_REQUESTS) {
    const provider = await prisma.provider.findFirst({
      where: { name: spec.providerName },
      select: {
        id: true,
        payoutChannel: true,
        payoutAccountName: true,
        payoutAccountLabel: true,
      },
    });
    if (!provider) continue;

    const createdAt = new Date(now - spec.daysAgo * dayMs);
    const channel = provider.payoutChannel ?? 'alipay';
    const channelLabel = demoChannelLabel(provider);

    const exists = await prisma.providerWithdrawalRequest.findFirst({
      where: {
        providerId: provider.id,
        amount: spec.amount,
        status: spec.status,
        createdAt: {
          gte: new Date(createdAt.getTime() - dayMs / 2),
          lte: new Date(createdAt.getTime() + dayMs / 2),
        },
      },
    });
    if (exists) continue;

    await prisma.providerWithdrawalRequest.create({
      data: {
        providerId: provider.id,
        amount: spec.amount,
        channel,
        channelLabel,
        status: spec.status,
        note: spec.note ?? null,
        paidNote: spec.paidNote ?? null,
        createdAt,
        reviewedAt:
          spec.reviewedDaysAgo != null
            ? new Date(now - spec.reviewedDaysAgo * dayMs)
            : null,
        paidAt: spec.paidDaysAgo != null ? new Date(now - spec.paidDaysAgo * dayMs) : null,
      },
    });
  }
}

export async function ensureDemoFinance(): Promise<void> {
  await syncDemoProviderFinanceProfiles();
  await seedDemoEarningsOrders();

  const marker = await prisma.systemConfig.findUnique({ where: { key: DEMO_FINANCE_KEY } });
  if (marker?.value === DEMO_FINANCE_VERSION) return;

  await settleProviderOrders('晨光传媒');
  await settleProviderOrders('蓝海内容', 2);
  await seedDemoWithdrawals();

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
