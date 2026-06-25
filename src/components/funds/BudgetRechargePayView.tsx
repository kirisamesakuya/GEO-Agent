import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import {
  DELIVERY_RECHARGE_PAY_FOOTER,
  DELIVERY_RECHARGE_PRODUCT,
  buildRechargePayUrl,
  formatRechargeOrderTitle,
  resolveMockRechargeOrder,
  type RechargePayChannel,
} from '../../../lib/delivery-recharge';
import { BRAND_PLATFORM_NAME } from '../../../lib/platform-legal-copy';
import DeliveryRechargeComplianceNotice from './DeliveryRechargeComplianceNotice';
import DeliveryRechargeServiceAccordion from './DeliveryRechargeServiceAccordion';

interface Props {
  orderId: string;
}

const CHANNELS: { id: RechargePayChannel; label: string; color: string }[] = [
  { id: 'wechat', label: '微信支付', color: '#07c160' },
  { id: 'alipay', label: '支付宝支付', color: '#1677ff' },
];

function formatCny(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

export default function BudgetRechargePayView({ orderId }: Props) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const order = useMemo(
    () =>
      resolveMockRechargeOrder(orderId, {
        brandName: params.get('brand') ?? undefined,
        amount: Number(params.get('amount')),
      }),
    [orderId, params]
  );
  const initialChannel: RechargePayChannel = params.get('channel') === 'alipay' ? 'alipay' : 'wechat';
  const [channel, setChannel] = useState<RechargePayChannel>(initialChannel);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const activeChannel = CHANNELS.find((c) => c.id === channel) ?? CHANNELS[0];

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await fetch(`/api/budget/recharge-orders/${order.id}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!data.error) setPaid(true);
    } catch {
      setPaid(true);
    } finally {
      setPaying(false);
    }
  };

  const switchChannel = (next: RechargePayChannel) => {
    setChannel(next);
    const url = buildRechargePayUrl(order, next);
    window.history.replaceState(null, '', url);
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-14 h-14 text-[#16a34a] mb-4" />
        <h1 className="text-lg font-bold text-gray-900">支付成功</h1>
        <p className="text-sm text-gray-500 mt-2">{DELIVERY_RECHARGE_PRODUCT.name}</p>
        <p className="text-2xl font-bold text-[#16a34a] mt-3">{formatCny(order.amount)}</p>
        <p className="text-xs text-gray-400 mt-4 font-mono">订单号：{order.id}</p>
        <p className="text-xs text-gray-500 mt-6 max-w-xs">
          资金已计入品牌「{order.brandName}」投放账户，可在 {BRAND_PLATFORM_NAME} 查看余额与流水。
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col max-w-md mx-auto">
      <header className="flex items-center px-4 py-3 bg-white border-b border-gray-100">
        <button
          type="button"
          className="p-1 text-gray-500"
          onClick={() => window.history.back()}
          aria-label="返回"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <p className="flex-1 text-center text-sm font-medium text-gray-900 pr-7">GEO 平台充值</p>
      </header>

      <main className="flex-1 px-4 pt-4 pb-36 space-y-3">
        {/* 1. 金额与订单 */}
        <div className="bg-white rounded-2xl px-4 pt-4 pb-3 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-700">{formatRechargeOrderTitle(order.amount)}</p>
          <p className="text-[11px] text-gray-400 font-mono mt-0.5 break-all">订单号：{order.id}</p>
          <div className="border-t border-gray-100 my-3" />
          <p className="text-4xl font-bold text-[#16a34a] text-center">{formatCny(order.amount)}</p>
          <div className="border-t border-gray-100 mt-3 pt-3">
            <DeliveryRechargeServiceAccordion />
          </div>
        </div>

        {/* 2. 支付方式 */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-2">支付方式</p>
          <div className="space-y-1">
            {CHANNELS.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 py-2.5 px-1 cursor-pointer border-b border-gray-50 last:border-0"
              >
                <input
                  type="radio"
                  name="payChannel"
                  checked={channel === c.id}
                  onChange={() => switchChannel(c.id)}
                  className="w-4 h-4 accent-[#1677ff]"
                />
                <span className="text-sm text-gray-900">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </main>

      {/* 底部：安全提示 + 支付按钮 */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 pt-2 pb-4 bg-[#f3f4f6] max-w-md mx-auto space-y-2">
        <DeliveryRechargeComplianceNotice title="付款前请确认" />
        <button
          type="button"
          disabled={paying}
          onClick={() => void handlePay()}
          className="w-full py-3.5 rounded-xl text-white font-medium text-base disabled:opacity-60"
          style={{ background: activeChannel.color }}
        >
          {paying ? '支付处理中…' : `${activeChannel.label} · ${formatCny(order.amount)}`}
        </button>
        <p className="text-[10px] text-center text-gray-400 px-1 leading-snug">
          {DELIVERY_RECHARGE_PAY_FOOTER}
        </p>
      </footer>
    </div>
  );
}
