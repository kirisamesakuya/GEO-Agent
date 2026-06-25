import { useEffect, useState } from 'react';
import AgentInputCard from './common/AgentInputCard';
import { DUAL_ACCOUNT_HINT, DELIVERY_ACCOUNT_HINT } from '../../lib/platform-legal-copy';

interface Props {
  brandName: string;
}

const LEDGER_LABELS: Record<string, string> = {
  manual_deposit: '入账',
  freeze: '预算冻结',
  release: '预算释放',
};

const ORDER_STATUS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
};

export default function BudgetView({ brandName }: Props) {
  const { toast } = useToast();
  const [account, setAccount] = useState({ balance: 0, frozen: 0, available: 0 });
  const [ledger, setLedger] = useState<Array<{ type: string; amount: number; note: string | null; createdAt: string }>>([]);
  const [rechargeOrders, setRechargeOrders] = useState<Array<{ id: string; amount: number; status: string; createdAt: string }>>([]);
  const [rechargeAmount, setRechargeAmount] = useState(5000);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    if (brandName === '__all__') return;
    const [acc, led, orders] = await Promise.all([
      fetch(`/api/budget/${encodeURIComponent(brandName)}`).then((r) => r.json()),
      fetch(`/api/budget/${encodeURIComponent(brandName)}/ledger`).then((r) => r.json()),
      fetch(`/api/budget/${encodeURIComponent(brandName)}/recharge-orders`).then((r) => r.json()),
    ]);
    setAccount(acc);
    setLedger(led.ledger ?? []);
    setRechargeOrders(orders.orders ?? []);
  };

  useEffect(() => { void load(); }, [brandName]);

  const createAndPay = async () => {
    setPayingId('new');
    const createRes = await fetch('/api/budget/recharge-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, amount: rechargeAmount, note: '前台充值' }),
    });
    const created = await createRes.json();
    if (created.error) {
      toast(created.error, 'error');
      setPayingId(null);
      return;
    }
    const payRes = await fetch(`/api/budget/recharge-orders/${created.order.id}/pay`, { method: 'POST' });
    const paid = await payRes.json();
    setPayingId(null);
    if (paid.error) {
      toast(paid.error, 'error');
      return;
    }
    toast('充值成功，投放余额已到账', 'success');
    void load();
  };

  if (brandName === '__all__') {
    return (
      <p className="geo-page-content text-sm" style={{ color: 'var(--neutral-text-03)' }}>
        请选择具体品牌查看投放余额
      </p>
    );
  }

  return (
    <div className="geo-page-content max-w-3xl space-y-4">
      <div className="geo-card p-4 text-xs" style={{ color: 'var(--neutral-text-02)' }}>
        <strong>投放余额</strong>用于任务包预算、接单任务冻结与结算；{DUAL_ACCOUNT_HINT}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '总余额', value: account.balance },
          { label: '已冻结', value: account.frozen },
          { label: '可用', value: account.available },
        ].map((item) => (
          <div key={item.label} className="geo-card p-4">
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>{item.label}</p>
            <p className="text-xl font-bold mt-1">¥{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <AgentInputCard title="充值投放余额" description={DELIVERY_ACCOUNT_HINT}>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs block mb-1">充值金额（元）</label>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: 'var(--neutral-divider-02)' }}
            />
          </div>
          <button
            type="button"
            className="geo-btn-primary text-sm"
            onClick={() => void createAndPay()}
            disabled={payingId !== null}
          >
            {payingId ? '支付中…' : '充值投放余额'}
          </button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--neutral-text-03)' }}>
          平台端仅处理异常退款与流水校正；正常充值请使用本页面前台流程。
        </p>
      </AgentInputCard>

      {rechargeOrders.length > 0 && (
        <div className="geo-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            充值订单
          </div>
          <table className="w-full text-sm geo-table">
            <thead><tr><th>金额</th><th>状态</th><th>时间</th></tr></thead>
            <tbody>
              {rechargeOrders.map((row) => (
                <tr key={row.id}>
                  <td>¥{row.amount.toLocaleString()}</td>
                  <td>{ORDER_STATUS[row.status] ?? row.status}</td>
                  <td>{new Date(row.createdAt).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="geo-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          资金流水
        </div>
        <table className="w-full text-sm geo-table">
          <thead><tr><th>类型</th><th>金额</th><th>备注</th><th>时间</th></tr></thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6" style={{ color: 'var(--neutral-text-03)' }}>暂无流水</td></tr>
            ) : ledger.map((row, i) => (
              <tr key={i}>
                <td>{LEDGER_LABELS[row.type] ?? row.type}</td>
                <td>¥{row.amount.toLocaleString()}</td>
                <td>{row.note ?? '—'}</td>
                <td>{new Date(row.createdAt).toLocaleString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
