/** 接单方提现账户：渠道枚举与展示（平台审核 / 接单端绑定共用） */

export const PAYOUT_CHANNEL_LABELS: Record<string, string> = {
  alipay: '支付宝',
  bank: '银行卡',
  wechat: '微信',
};

/** 当前 MVP：仅开放支付宝绑定，财务线下人工打款 */
export const MVP_PAYOUT_CHANNEL = 'alipay' as const;

export function payoutChannelLabel(channel: string | null | undefined): string {
  if (!channel) return '未设置';
  return PAYOUT_CHANNEL_LABELS[channel] ?? channel;
}

export function isMvpPayoutChannel(channel: string): boolean {
  return channel === MVP_PAYOUT_CHANNEL;
}

export type ProviderPayoutFields = {
  payoutChannel?: string | null;
  payoutAccountName?: string | null;
  payoutAccountLabel?: string | null;
};

/** 列表/摘要：支付宝 · 张晨 · 13812348888 */
export function formatProviderPayoutBrief(p: ProviderPayoutFields): string {
  const account = p.payoutAccountLabel?.trim();
  if (!account) return '未绑定';

  const channel = payoutChannelLabel(p.payoutChannel);
  const name = p.payoutAccountName?.trim();
  if (account.startsWith('支付宝') || account.startsWith('银行卡') || account.startsWith('微信')) {
    return name && !account.includes(name) ? `${account}（${name}）` : account;
  }
  return name ? `${channel} · ${name} · ${account}` : `${channel} · ${account}`;
}

export function providerPayoutNameMatch(
  p: ProviderPayoutFields & { identityRealName?: string | null; identityVerifiedAt?: Date | string | null }
): boolean | null {
  if (!p.identityVerifiedAt || !p.identityRealName || !p.payoutAccountName) return null;
  return p.identityRealName === p.payoutAccountName;
}
