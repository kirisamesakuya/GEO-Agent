export type ProviderPageId =
  | 'home'
  | 'tasks'
  | 'quotes'
  | 'orders'
  | 'accounts'
  | 'earnings'
  | 'profile'
  | 'messages';

export interface ProviderRecord {
  id: string;
  name: string;
  applicationStatus: string;
  platforms?: string;
  industryTags?: string;
  type?: string;
}

export interface WalletSummary {
  extractable: number;
  frozen: number;
  accumulatedIncome: number;
}

/** 与 GET /api/provider/earnings transactions 字段一致 */
export interface EarningsTransaction {
  id: string;
  title: string;
  brand?: string;
  orderId?: string;
  type: 'income' | 'withdrawal' | 'refund';
  /** 订单结算状态，与平台端 SETTLEMENT_STATUS 一致 */
  settlementStatus?: string;
  /** 提现申请状态，与平台端 WITHDRAWAL_STATUS 一致 */
  withdrawalStatus?: string;
  amount: number;
  grossAmount?: number;
  platformFee?: number;
  time: string;
  platform?: string;
  channelLabel?: string;
  payoutChannelLabel?: string;
  payoutAccountName?: string | null;
  payoutAccountLabel?: string | null;
}
