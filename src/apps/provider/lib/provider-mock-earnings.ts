import type { EarningsTransaction, WalletSummary } from '../types';

/** 演示数据，字段结构与 GET /api/provider/earnings 一致 */
export const MOCK_PROVIDER_WALLET: WalletSummary = {
  extractable: 12480,
  frozen: 5600,
  accumulatedIncome: 32480,
};

export const MOCK_PROVIDER_TRANSACTIONS: EarningsTransaction[] = [
  {
    id: 'mock-trans-1',
    title: '小红书种草笔记 · 青岚咖啡新品推广',
    brand: '青岚咖啡',
    orderId: 'mock-order-1',
    type: 'income',
    settlementStatus: 'settled',
    amount: 2576,
    grossAmount: 2800,
    platformFee: 224,
    time: '2024-05-20T10:30:00.000Z',
    platform: 'xiaohongshu',
  },
  {
    id: 'mock-trans-2',
    title: '成都火锅探店短视频',
    brand: '蜀味火锅',
    orderId: 'mock-order-2',
    type: 'income',
    settlementStatus: 'settled',
    amount: 4140,
    grossAmount: 4500,
    platformFee: 360,
    time: '2024-05-18T16:20:00.000Z',
    platform: 'douyin',
  },
  {
    id: 'mock-trans-3',
    title: '知乎问答覆盖 · AI 办公工具推荐',
    brand: '智办科技',
    orderId: 'mock-order-3',
    type: 'income',
    settlementStatus: 'pending_platform',
    amount: 1840,
    grossAmount: 2000,
    platformFee: 160,
    time: '2024-05-19T09:15:00.000Z',
    platform: 'zhihu',
  },
  {
    id: 'mock-trans-4',
    title: '公众号软文 · 家居收纳技巧',
    brand: '收纳研究所',
    orderId: 'mock-order-4',
    type: 'income',
    settlementStatus: 'settled',
    amount: 2925.6,
    grossAmount: 3180,
    platformFee: 254.4,
    time: '2024-05-15T11:20:00.000Z',
    platform: 'official_account',
  },
  {
    id: 'mock-trans-5',
    title: '提现申请',
    channelLabel: '支付宝 · 张晨 · 138****8888',
    payoutChannelLabel: '支付宝',
    payoutAccountName: '张晨',
    payoutAccountLabel: '138****8888',
    type: 'withdrawal',
    withdrawalStatus: 'paid',
    amount: 2000,
    time: '2024-05-12T14:45:00.000Z',
  },
  {
    id: 'mock-trans-6',
    title: '提现申请',
    channelLabel: '支付宝 · 张晨 · 138****8888',
    payoutChannelLabel: '支付宝',
    payoutAccountName: '张晨',
    payoutAccountLabel: '138****8888',
    type: 'withdrawal',
    withdrawalStatus: 'pending',
    amount: 800,
    time: '2024-06-10T09:17:00.000Z',
  },
];

export function hasRealEarningsData(
  wallet: WalletSummary | undefined,
  transactions: EarningsTransaction[] | undefined
): boolean {
  if (!wallet) return false;
  if ((transactions?.length ?? 0) > 0) return true;
  return wallet.accumulatedIncome > 0 || wallet.extractable > 0 || wallet.frozen > 0;
}

export function resolveProviderWallet(
  apiWallet: Partial<WalletSummary> | undefined,
  transactions?: EarningsTransaction[]
): WalletSummary {
  if (hasRealEarningsData(apiWallet as WalletSummary | undefined, transactions)) {
    return {
      extractable: Number(apiWallet?.extractable ?? 0),
      frozen: Number(apiWallet?.frozen ?? 0),
      accumulatedIncome: Number(apiWallet?.accumulatedIncome ?? 0),
    };
  }
  return {
    extractable: MOCK_PROVIDER_WALLET.extractable,
    frozen: MOCK_PROVIDER_WALLET.frozen,
    accumulatedIncome: MOCK_PROVIDER_WALLET.accumulatedIncome,
  };
}
