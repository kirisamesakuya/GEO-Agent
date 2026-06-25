import { useMemo, useState } from 'react';
import { Copy, X } from 'lucide-react';
import {
  buildRechargePayUrl,
  formatRechargeOrderTitle,
  type MockRechargeOrder,
  type RechargePayChannel,
} from '../../../lib/delivery-recharge';
import { BRAND_RECHARGE_AGREEMENT_LABEL } from '../../../lib/platform-legal-copy';
import DeliveryRechargeComplianceNotice from './DeliveryRechargeComplianceNotice';
import DeliveryRechargeServiceAccordion from './DeliveryRechargeServiceAccordion';
import MockQrCode from './MockQrCode';

interface Props {
  order: MockRechargeOrder;
  onClose: () => void;
  onPaid?: () => void;
}

const CHANNELS: { id: RechargePayChannel; label: string }[] = [
  { id: 'wechat', label: '微信扫码' },
  { id: 'alipay', label: '支付宝扫码' },
];

function formatCny(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DeliveryRechargeModal({ order, onClose, onPaid }: Props) {
  const [channel, setChannel] = useState<RechargePayChannel>('wechat');
  const payUrl = useMemo(() => buildRechargePayUrl(order, channel), [order, channel]);

  const copyPayLink = async () => {
    try {
      await navigator.clipboard.writeText(payUrl);
    } catch {
      /* ignore */
    }
  };

  const simulateScan = () => {
    window.open(payUrl, '_blank', 'noopener,noreferrer');
  };

  const mockPayComplete = async () => {
    const res = await fetch(`/api/budget/recharge-orders/${order.id}/pay`, { method: 'POST' });
    const data = await res.json();
    if (data.error) return;
    onPaid?.();
    onClose();
  };

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="geo-modal max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg"
          style={{ color: 'var(--neutral-text-03)' }}
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="geo-modal-head pb-3">
          <h3 className="font-bold text-sm" style={{ color: 'var(--neutral-text-01)' }}>
            充值投放余额
          </h3>
        </div>

        <div className="geo-modal-body space-y-4">
          {/* 1. 金额与订单 */}
          <div className="text-center space-y-0.5 pb-1 border-b" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
              {formatRechargeOrderTitle(order.amount)}
            </p>
            <p className="text-3xl font-bold tracking-tight" style={{ color: '#16a34a' }}>
              {formatCny(order.amount)}
            </p>
            <p className="text-[10px] font-mono pt-0.5" style={{ color: 'var(--neutral-text-03)' }}>
              订单号：{order.id}
            </p>
          </div>

          {/* 2. 支付方式与二维码 */}
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    channel === c.id ? 'geo-nav-active' : 'geo-nav-item'
                  }`}
                  style={{ borderColor: channel === c.id ? undefined : 'var(--neutral-divider-02)' }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center">
              <MockQrCode value={payUrl} size={168} />
              <p className="text-[10px] text-center mt-1.5 max-w-[220px]" style={{ color: 'var(--neutral-text-03)' }}>
                请使用{channel === 'wechat' ? '微信' : '支付宝'}扫码，确认商品与金额后付款
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  className="text-[11px] inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
                  onClick={() => void copyPayLink()}
                >
                  <Copy className="w-3 h-3" />
                  复制链接
                </button>
                <span className="text-gray-200">|</span>
                <button
                  type="button"
                  className="text-[11px] text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
                  onClick={simulateScan}
                >
                  模拟扫码
                </button>
              </div>
            </div>
          </div>

          {/* 3. 商品说明（折叠） */}
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            <DeliveryRechargeServiceAccordion dense />
          </div>

          {/* 4. 安全提示 */}
          <DeliveryRechargeComplianceNotice />
          <p className="text-[10px] text-center leading-snug" style={{ color: 'var(--neutral-text-03)' }}>
            付款即视为同意{BRAND_RECHARGE_AGREEMENT_LABEL}
          </p>
        </div>

        <div className="geo-modal-foot flex gap-2">
          <button type="button" className="geo-btn-secondary text-sm flex-1" onClick={onClose}>
            稍后支付
          </button>
          <button type="button" className="geo-btn-primary text-sm flex-1" onClick={() => void mockPayComplete()}>
            演示：支付已完成
          </button>
        </div>
      </div>
    </div>
  );
}
