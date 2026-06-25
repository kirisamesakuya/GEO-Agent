/** 收益中心 · 收支明细展示（字段与平台后台一致，不做前端自造语义） */

import {
  providerSettlementStatusLabel,
  providerWithdrawalStatusLabel,
} from './provider-finance-labels.js';

const DEMO_PREFIX = '[演示]';
const ORDER_STATUS_PREFIX =
  /^(待接单|执行中|待审稿|审稿返修|待发布|待验收|已完成|最终返修|争议中|已撤回)\s*·\s*/u;

export function formatEarningsTxTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 订单标题 → 收益明细主标题（去掉演示前缀与订单阶段前缀） */
export function formatEarningsIncomeTitle(rawTitle: string, taskType?: string | null): string {
  let title = rawTitle.trim();
  if (title.startsWith(DEMO_PREFIX)) title = title.slice(DEMO_PREFIX.length).trim();
  title = title.replace(ORDER_STATUS_PREFIX, '').trim();
  if (title) return title;
  return taskType?.trim() || rawTitle.trim() || '合作结算';
}

/** 与平台端结算批次订单行一致：品牌 · 平台 · 订单金额 */
export function formatEarningsIncomeSubtitle(input: {
  brand?: string | null;
  platform?: string | null;
  platformLabel?: string | null;
  grossAmount?: number | null;
}): string {
  const parts: string[] = [];
  if (input.brand?.trim()) parts.push(input.brand.trim());
  const platform = input.platformLabel?.trim() || input.platform?.trim();
  if (platform) parts.push(platform);
  if (input.grossAmount != null && Number.isFinite(input.grossAmount)) {
    parts.push(`¥${input.grossAmount.toLocaleString('zh-CN')}`);
  }
  return parts.join(' · ');
}

/** 与平台端提现列表列一致：账户实名 | 收款账号 */
export function formatEarningsWithdrawalSubtitle(input: {
  payoutAccountName?: string | null;
  payoutAccountLabel?: string | null;
  channelLabel?: string | null;
}): string {
  const parts: string[] = [];
  if (input.payoutAccountName?.trim()) {
    parts.push(`账户实名: ${input.payoutAccountName.trim()}`);
  }
  const account = input.payoutAccountLabel?.trim() || input.channelLabel?.trim();
  if (account) parts.push(`收款账号: ${account}`);
  return parts.join(' | ');
}

export type EarningsTransactionLike = {
  title: string;
  brand?: string | null;
  orderId?: string | null;
  platform?: string | null;
  grossAmount?: number | null;
  type: 'income' | 'withdrawal' | 'refund';
  settlementStatus?: string | null;
  withdrawalStatus?: string | null;
  payoutChannelLabel?: string | null;
  payoutAccountName?: string | null;
  payoutAccountLabel?: string | null;
  channelLabel?: string | null;
  amount: number;
  time: string;
};

export type EarningsTransactionRowView = {
  typeBadge: '提现' | '收益';
  title: string;
  subtitle: string;
  statusLabel: string;
  timeLabel: string;
  amountPrefix: '+' | '-';
  amountText: string;
  searchText: string;
};

export function buildEarningsTransactionRowView(
  tx: EarningsTransactionLike,
  platformLabel?: string | null
): EarningsTransactionRowView {
  const typeBadge = tx.type === 'withdrawal' ? '提现' : '收益';
  const statusLabel =
    tx.type === 'withdrawal'
      ? providerWithdrawalStatusLabel(tx.withdrawalStatus)
      : providerSettlementStatusLabel(tx.settlementStatus);
  const timeLabel = formatEarningsTxTime(tx.time);
  const amountPrefix = tx.type === 'withdrawal' ? '-' : '+';
  const amountText = tx.amount.toLocaleString('zh-CN');

  const title = tx.title;
  const subtitle =
    tx.type === 'withdrawal'
      ? formatEarningsWithdrawalSubtitle({
          payoutAccountName: tx.payoutAccountName,
          payoutAccountLabel: tx.payoutAccountLabel,
          channelLabel: tx.channelLabel,
        })
      : formatEarningsIncomeSubtitle({
          brand: tx.brand,
          platform: tx.platform,
          platformLabel: platformLabel ?? tx.platform,
          grossAmount: tx.grossAmount,
        });

  const searchText = [
    typeBadge,
    title,
    subtitle,
    statusLabel,
    timeLabel,
    amountPrefix,
    amountText,
    String(tx.amount),
    tx.brand,
    tx.orderId,
    tx.platform,
    platformLabel,
    tx.payoutChannelLabel,
    tx.payoutAccountName,
    tx.payoutAccountLabel,
    tx.channelLabel,
    tx.settlementStatus,
    tx.withdrawalStatus,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    typeBadge,
    title,
    subtitle,
    statusLabel,
    timeLabel,
    amountPrefix,
    amountText,
    searchText,
  };
}

export function matchesEarningsTransactionSearch(searchText: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const text = searchText.toLowerCase();
  if (text.includes(q)) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return false;
  return tokens.every((token) => text.includes(token));
}
