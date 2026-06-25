/** 投放账户充值：商品说明与合规文案（充值弹窗、扫码支付页共用） */

import {
  BRAND_RECHARGE_AGREEMENT_LABEL,
  LEGAL_OPERATOR,
  RECHARGE_COMPLIANCE_SHORT,
  RECHARGE_PAY_FOOTER,
} from './platform-legal-copy.js';

export const DELIVERY_RECHARGE_PRODUCT = {
  name: '汇智AIGC媒体收单平台投放服务预存',
  shortName: '投放服务预存',
  provider: `${LEGAL_OPERATOR} · 汇智GEO-AI智联项目平台`,
  category: '媒体投放服务费（预存）',
} as const;

/** 投放账户专项用途 */
export const DELIVERY_RECHARGE_SERVICE_ITEMS = [
  '第三方媒体平台发布与分发费用',
  '达人 / 写手接单任务验收结算',
  '投放订单预算冻结与任务结算',
] as const;

export const DELIVERY_RECHARGE_COMPLIANCE_LINES = [
  '充值金额仅用于本品牌媒体投放订单结算，不可提现、不可转让、不可代他人充值。',
  '请勿替陌生人扫码付款，警惕「兼职刷单」「代收代付」等诈骗与洗钱风险。',
  `付款即视为已阅读并同意${BRAND_RECHARGE_AGREEMENT_LABEL}。`,
] as const;

/** 弹窗 / H5 底部精简版安全提示 */
export const DELIVERY_RECHARGE_COMPLIANCE_SHORT = RECHARGE_COMPLIANCE_SHORT;

export const DELIVERY_RECHARGE_PAY_FOOTER = RECHARGE_PAY_FOOTER;

export type RechargePayChannel = 'wechat' | 'alipay';

export interface MockRechargeOrder {
  id: string;
  brandName: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: string;
  payerNote?: string;
}

/** 演示用：根据订单号解析 mock 订单（生产环境应改由 API 查询） */
export function resolveMockRechargeOrder(
  orderId: string,
  params?: { brandName?: string; amount?: number }
): MockRechargeOrder {
  const amount = Number(params?.amount);
  return {
    id: orderId,
    brandName: params?.brandName?.trim() || '演示品牌',
    amount: Number.isFinite(amount) && amount > 0 ? amount : 5000,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function buildRechargePayUrl(order: Pick<MockRechargeOrder, 'id' | 'brandName' | 'amount'>, channel?: RechargePayChannel) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('payRecharge', order.id);
  url.searchParams.set('brand', order.brandName);
  url.searchParams.set('amount', String(order.amount));
  if (channel) url.searchParams.set('channel', channel);
  return url.toString();
}

export function formatRechargeOrderTitle(amount: number) {
  return `余额充值 ${amount.toFixed(2)}元`;
}

export function rechargeProductSummary(amount: number) {
  return `${DELIVERY_RECHARGE_PRODUCT.name} · ${amount.toFixed(2)} 元`;
}
