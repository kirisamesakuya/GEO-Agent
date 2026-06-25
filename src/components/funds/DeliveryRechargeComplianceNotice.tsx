import { ShieldAlert } from 'lucide-react';
import { DELIVERY_RECHARGE_COMPLIANCE_SHORT } from '../../../lib/delivery-recharge';

interface Props {
  title?: string;
  className?: string;
}

export default function DeliveryRechargeComplianceNotice({
  title = '支付安全提示',
  className = '',
}: Props) {
  return (
    <section
      className={`rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-2 ${className}`}
    >
      <p className="text-[10px] font-medium text-amber-900 flex items-center gap-1 mb-1">
        <ShieldAlert className="w-3 h-3 shrink-0" />
        {title}
      </p>
      <div className="space-y-0.5">
        {DELIVERY_RECHARGE_COMPLIANCE_SHORT.map((line) => (
          <p key={line} className="text-[10px] leading-snug text-amber-900/85">
            · {line}
          </p>
        ))}
      </div>
    </section>
  );
}
