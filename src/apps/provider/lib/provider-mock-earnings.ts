import type { EarningsTransaction, WalletSummary } from '../types';

/** 演示数据，对齐 geo-接单助手 initialData，无真实结算记录时使用 */
export const MOCK_PROVIDER_WALLET: WalletSummary = {
  extractable: 12480,
  frozen: 5600,
  accumulatedIncome: 32480,
};

export const MOCK_PROVIDER_TRANSACTIONS: EarningsTransaction[] = [
  {
    id: 'mock-trans-1',
    title: '小红书种草笔记 | 青岚咖啡新品推广',
    brand: '青岚咖啡',
    orderId: 'ORD202405160001',
    type: 'income',
    status: 'settled',
    amount: 2800,
    time: '2024-05-20T10:30:00.000Z',
    platform: 'xiaohongshu',
  },
  {
    id: 'mock-trans-2',
    title: '成都火锅探店短视频',
    brand: '蜀味火锅',
    orderId: 'ORD202405150097',
    type: 'income',
    status: 'settled',
    amount: 4500,
    time: '2024-05-18T16:20:00.000Z',
    platform: 'douyin',
  },
  {
    id: 'mock-trans-3',
    title: '知乎问答覆盖 | AI 办公工具推荐',
    brand: '智办科技',
    orderId: 'ORD202405140055',
    type: 'income',
    status: 'pending',
    amount: 2000,
    time: '2024-05-19T09:15:00.000Z',
    platform: 'zhihu',
  },
  {
    id: 'mock-trans-4',
    title: '公众号软文撰写 | 家居收纳技巧',
    brand: '收纳研究所',
    orderId: 'ORD202405120032',
    type: 'income',
    status: 'settled',
    amount: 3180,
    time: '2024-05-15T11:20:00.000Z',
    platform: 'official_account',
  },
  {
    id: 'mock-trans-5',
    title: '提现到招商银行 (尾号 6688)',
    type: 'withdrawal',
    status: 'success',
    amount: 2000,
    time: '2024-05-12T14:45:00.000Z',
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
