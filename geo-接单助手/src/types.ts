/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PageId = 'home' | 'tasks' | 'orders' | 'accounts' | 'earnings' | 'profile';

export interface DeveloperTask {
  id: string;
  title: string;
  platform: 'xiaohongshu' | 'zhihu' | 'official_account' | 'douyin' | 'web';
  brand: string;
  budget: number;
  tags: string[];
  coverImage: string;
  deadline: string;
  matchRate: number;
  applicantsCount: number;
}

export type OrderStatus = 'applying' | 'creating' | 'checking' | 'settled';

export interface CreatorOrder {
  id: string;
  taskId: string;
  title: string;
  platform: 'xiaohongshu' | 'zhihu' | 'official_account' | 'douyin' | 'web';
  brand: string;
  budget: number;
  deadline: string;
  status: OrderStatus;
  accountId: string;
  coverImage: string;
  deliveryDate: string;
  notes?: string;
  submittedUrl?: string;
  submittedFileName?: string;
  history: {
    title: string;
    operator: string;
    time: string;
  }[];
  messages: ChatMessage[];
}

export interface ConnectedAccount {
  id: string;
  platform: 'xiaohongshu' | 'zhihu' | 'official_account' | 'douyin';
  name: string;
  avatar: string;
  followers: string;
  followersCount: number;
  isMain: boolean;
  canAccept: boolean;
  score: number;
  fields: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'brand' | 'creator';
  senderName: string;
  avatar: string;
  time: string;
  content: string;
}

export interface TransactionRecord {
  id: string;
  taskId?: string;
  title: string;
  brand?: string;
  orderId?: string;
  type: 'income' | 'withdrawal' | 'refund';
  status: 'settled' | 'pending' | 'success';
  amount: number;
  time: string;
  platform?: 'xiaohongshu' | 'zhihu' | 'official_account' | 'douyin' | 'web';
}

export interface UserProfile {
  name: string;
  avatar: string;
  status: 'accepting' | 'busy' | 'resting';
  completedOrdersCount: number;
  ratingRate: number; // e.g. 98 -> 98%
  responseTime: string; // e.g. '2h'
  verified: boolean;
  preferences: string[];
  safeLevel: 'high' | 'medium' | 'low';
}

export interface AppState {
  currentTab: PageId;
  activeTaskId: string | null; // For task details screen overlay/subpage
  activeOrderId: string | null; // For order details screen overlay/subpage
  userScore: number;
  accounts: ConnectedAccount[];
  orders: CreatorOrder[];
  tasks: DeveloperTask[];
  transactions: TransactionRecord[];
  wallet: {
    extractable: number;
    frozen?: number;
    thisMonthIncome?: number;
    pendingSettlement?: number;
    accumulatedIncome: number;
    accumulatedWithdrawal?: number;
  };
  searchQuery: string;
  profile: UserProfile;
}
