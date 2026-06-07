export type ProviderPageId =
  | 'home'
  | 'tasks'
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

export interface EarningsTransaction {
  id: string;
  title: string;
  brand?: string;
  orderId?: string;
  type: 'income' | 'withdrawal' | 'refund';
  status: 'settled' | 'pending' | 'success';
  amount: number;
  grossAmount?: number;
  platformFee?: number;
  withdrawalStatus?: string;
  time: string;
  platform?: string;
}
