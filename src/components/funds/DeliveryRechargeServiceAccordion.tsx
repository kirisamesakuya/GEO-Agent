import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DELIVERY_RECHARGE_PRODUCT,
  DELIVERY_RECHARGE_SERVICE_ITEMS,
} from '../../../lib/delivery-recharge';

interface Props {
  /** PC 弹窗略紧凑 */
  dense?: boolean;
}

export default function DeliveryRechargeServiceAccordion({ dense }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={dense ? 'space-y-2' : 'space-y-2.5'}>
      <div>
        <p className="text-[10px]" style={{ color: 'var(--neutral-text-03, #9ca3af)' }}>
          商品名称
        </p>
        <p className={`font-semibold text-gray-900 leading-snug ${dense ? 'text-xs' : 'text-sm'}`}>
          {DELIVERY_RECHARGE_PRODUCT.name}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        aria-expanded={open}
      >
        <span>{open ? '收起服务详情' : '查看服务详情'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`rounded-lg border border-gray-100 bg-gray-50 text-xs text-gray-600 leading-relaxed ${dense ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2'}`}>
          <p className="text-[10px] text-gray-500">
            {DELIVERY_RECHARGE_PRODUCT.category} · {DELIVERY_RECHARGE_PRODUCT.provider}
          </p>
          <ul className="space-y-1 text-[11px]">
            {DELIVERY_RECHARGE_SERVICE_ITEMS.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
