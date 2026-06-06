import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AGENT_CLOUD_RECHARGE_URL = 'https://www.agentsyun.com/hub/keys';

type AccountTab = 'token' | 'delivery';

interface Props {
  brandName: string;
  /** 嵌入其他页面时不单独占满页头 */
  embedded?: boolean;
}

const TOKEN_COSTS = [
  { action: '文章生成', cost: 10 },
  { action: 'GEO 分析', cost: 20 },
  { action: '投放计划', cost: 15 },
  { action: '网页预览', cost: 15 },
  { action: '品牌提取', cost: 5 },
];

const LEDGER_LABELS: Record<string, string> = {
  manual_deposit: '入账',
  freeze: '预算冻结',
  release: '预算释放',
};

const ORDER_STATUS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
};

function formatCny(amount: number) {
  return `¥${amount.toLocaleString('zh-CN')}`;
}

export default function AccountFundsView({ brandName, embedded }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<AccountTab>('token');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [delivery, setDelivery] = useState({ balance: 0, frozen: 0, available: 0 });
  const [ledger, setLedger] = useState<Array<{ type: string; amount: number; note: string | null; createdAt: string }>>([]);
  const [rechargeOrders, setRechargeOrders] = useState<Array<{ id: string; amount: number; status: string; createdAt: string }>>([]);
  const [rechargeAmount, setRechargeAmount] = useState(5000);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    if (brandName === '__all__') return;
    const [credits, acc, led, orders] = await Promise.all([
      fetch(`/api/ai-credits/${encodeURIComponent(brandName)}`).then((r) => r.json()),
      fetch(`/api/budget/${encodeURIComponent(brandName)}`).then((r) => r.json()),
      fetch(`/api/budget/${encodeURIComponent(brandName)}/ledger`).then((r) => r.json()),
      fetch(`/api/budget/${encodeURIComponent(brandName)}/recharge-orders`).then((r) => r.json()),
    ]);
    setTokenBalance(credits.balance ?? 0);
    setDelivery(acc);
    setLedger(led.ledger ?? []);
    setRechargeOrders(orders.orders ?? []);
  };

  useEffect(() => {
    void load();
  }, [brandName]);

  const rechargeDelivery = async () => {
    setPaying(true);
    const createRes = await fetch('/api/budget/recharge-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, amount: rechargeAmount, note: '前台充值' }),
    });
    const created = await createRes.json();
    if (created.error) {
      toast(created.error, 'error');
      setPaying(false);
      return;
    }
    const payRes = await fetch(`/api/budget/recharge-orders/${created.order.id}/pay`, { method: 'POST' });
    const paid = await payRes.json();
    setPaying(false);
    if (paid.error) {
      toast(paid.error, 'error');
      return;
    }
    toast('投放余额充值成功', 'success');
    void load();
  };

  if (brandName === '__all__') {
    return (
      <div className={embedded ? 'p-6' : 'geo-page-content max-w-3xl'}>
        <p className="text-sm" style={{ color: 'var(--neutral-text-03)' }}>请选择具体品牌查看账户余额。</p>
      </div>
    );
  }

  const tabs: { id: AccountTab; label: string; balance: string }[] = [
    { id: 'token', label: '词元账户', balance: formatCny(tokenBalance) },
    { id: 'delivery', label: '投放账户', balance: formatCny(delivery.available) },
  ];

  return (
    <div
      className={
        embedded
          ? 'p-6 max-w-3xl mx-auto space-y-4'
          : 'geo-page-content max-w-3xl space-y-4 overflow-y-auto h-full'
      }
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-2 rounded-lg border ${tab === t.id ? 'geo-nav-active' : 'geo-nav-item'}`}
            style={{ borderColor: tab === t.id ? undefined : 'var(--neutral-divider-02)' }}
          >
            <span className="font-medium">{t.label}</span>
            <span className="ml-2 opacity-80">{t.balance}</span>
          </button>
        ))}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
        两个账户均为人民币计价、分池管理，不可互相抵扣。
      </p>

      {tab === 'token' && (
        <div className="space-y-4">
          <div className="geo-card p-6">
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>词元账户可用余额</p>
              <p className="text-4xl font-bold mt-2" style={{ color: 'var(--color-accent)' }}>
                {formatCny(tokenBalance)}
              </p>
            </div>
            <div
              className="mt-6 pt-6 border-t space-y-3 text-center"
              style={{ borderColor: 'var(--neutral-divider-02)' }}
            >
              <h3 className="text-sm font-semibold">充值</h3>
              <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                词元余额在 Agent 云 Token 工场充值，用于文章生成、GEO 分析等 AI 任务。
              </p>
              <a
                href={AGENT_CLOUD_RECHARGE_URL}
                target="_blank"
                rel="noreferrer"
                className="geo-btn-primary text-sm inline-flex items-center gap-2"
              >
                前往 Agent 云充值
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="geo-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              词元消耗参考
            </div>
            <table className="w-full text-sm geo-table">
              <thead><tr><th>操作</th><th>消耗</th></tr></thead>
              <tbody>
                {TOKEN_COSTS.map((row) => (
                  <tr key={row.action}>
                    <td>{row.action}</td>
                    <td>{formatCny(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'delivery' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '总余额', value: delivery.balance },
              { label: '已冻结', value: delivery.frozen },
              { label: '可用', value: delivery.available },
            ].map((item) => (
              <div key={item.label} className="geo-card p-4">
                <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>{item.label}</p>
                <p className="text-xl font-bold mt-1">{formatCny(item.value)}</p>
              </div>
            ))}
          </div>

          <div className="geo-card p-4">
            <h3 className="text-sm font-semibold mb-3">充值投放余额</h3>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="geo-label block mb-1">充值金额（元）</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(Number(e.target.value))}
                  className="geo-input w-full"
                />
              </div>
              <button
                type="button"
                className="geo-btn-primary text-sm"
                onClick={() => void rechargeDelivery()}
                disabled={paying}
              >
                {paying ? '支付中…' : '确认充值'}
              </button>
            </div>
          </div>

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
                      <td>{formatCny(row.amount)}</td>
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
                    <td>{formatCny(row.amount)}</td>
                    <td>{row.note ?? '—'}</td>
                    <td>{new Date(row.createdAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
