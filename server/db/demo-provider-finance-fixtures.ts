import { formatProviderPayoutBrief } from '../../lib/provider-payout.js';

/** 平台财务演示：接单方实名（脱敏）+ 支付宝收款账号（完整，供线下打款） */
export const DEMO_PROVIDER_PAYOUT_PROFILES = [
  {
    providerName: '晨光传媒',
    type: '达人',
    capabilities: ['小红书', '探店'],
    applicationStatus: 'approved' as const,
    contactName: '张晨',
    phone: '13800001111',
    city: '南京',
    identityRealName: '张晨',
    identityIdNumberMask: '320***********1234',
    identityVerifiedAt: '2025-01-15T08:00:00.000Z',
    payoutChannel: 'alipay',
    payoutAccountName: '张晨',
    /** 财务线下打款用：支付宝登录手机号 */
    payoutAccountLabel: '13812348888',
  },
  {
    providerName: '蓝海内容',
    type: '内容写手',
    capabilities: ['知乎', '公众号'],
    applicationStatus: 'approved' as const,
    contactName: '李蓝',
    phone: '13800002222',
    identityRealName: '李蓝',
    identityIdNumberMask: '310***********5678',
    identityVerifiedAt: '2025-03-01T08:00:00.000Z',
    payoutChannel: 'alipay',
    payoutAccountName: '李蓝',
    payoutAccountLabel: 'lanhai_content@qq.com',
  },
  {
    providerName: '北辰工作室',
    type: 'GEO顾问',
    capabilities: ['GEO分析', '投放计划'],
    applicationStatus: 'approved' as const,
    contactName: '王北辰',
    phone: '13800003301',
    identityRealName: '王北辰',
    identityIdNumberMask: '110***********9012',
    identityVerifiedAt: '2025-04-10T08:00:00.000Z',
    payoutChannel: null as string | null,
    payoutAccountName: null as string | null,
    payoutAccountLabel: null as string | null,
  },
] as const;

export type DemoWithdrawalSpec = {
  providerName: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  daysAgo: number;
  note?: string;
  paidNote?: string;
  reviewedDaysAgo?: number;
  paidDaysAgo?: number;
};

export const DEMO_WITHDRAWAL_REQUESTS: DemoWithdrawalSpec[] = [
  { providerName: '晨光传媒', amount: 800, status: 'pending', daysAgo: 1 },
  { providerName: '晨光传媒', amount: 1200, status: 'pending', daysAgo: 2 },
  { providerName: '晨光传媒', amount: 1500, status: 'approved', daysAgo: 3, reviewedDaysAgo: 0.5 },
  {
    providerName: '晨光传媒',
    amount: 2000,
    status: 'paid',
    daysAgo: 12,
    reviewedDaysAgo: 10,
    paidDaysAgo: 9,
    paidNote: '支付宝转账 · 流水号 202606010001',
  },
  {
    providerName: '晨光传媒',
    amount: 500,
    status: 'paid',
    daysAgo: 21,
    reviewedDaysAgo: 20,
    paidDaysAgo: 19,
    paidNote: '支付宝批量付款 202605280088',
  },
  {
    providerName: '晨光传媒',
    amount: 3000,
    status: 'rejected',
    daysAgo: 6,
    reviewedDaysAgo: 5,
    note: '提现金额超过可提现余额',
  },
  { providerName: '蓝海内容', amount: 680, status: 'pending', daysAgo: 1 },
  { providerName: '蓝海内容', amount: 950, status: 'approved', daysAgo: 4, reviewedDaysAgo: 1 },
  {
    providerName: '蓝海内容',
    amount: 1200,
    status: 'paid',
    daysAgo: 15,
    reviewedDaysAgo: 14,
    paidDaysAgo: 13,
    paidNote: '支付宝转账 · 流水号 202605150032',
  },
];

export function demoChannelLabel(profile: {
  payoutChannel?: string | null;
  payoutAccountName?: string | null;
  payoutAccountLabel?: string | null;
}): string {
  return formatProviderPayoutBrief(profile);
}
