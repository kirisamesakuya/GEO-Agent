/** 接单端财务状态文案 — 与平台端「接单端提现管理 / 订单结算」一致 */

export const PROVIDER_WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  approved: '待线下打款',
  paid: '已打款',
  rejected: '已驳回',
};

export const PROVIDER_SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  pending_platform: '待平台确认',
  pending_offline: '待线下结算',
  settled: '已结算',
};

export function providerWithdrawalStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return PROVIDER_WITHDRAWAL_STATUS_LABEL[status] ?? status;
}

export function providerSettlementStatusLabel(status?: string | null): string {
  if (!status) return PROVIDER_SETTLEMENT_STATUS_LABEL.pending_platform;
  return PROVIDER_SETTLEMENT_STATUS_LABEL[status] ?? status;
}
