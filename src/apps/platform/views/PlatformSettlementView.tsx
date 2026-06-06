import { useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';

interface BatchRow {
  providerId: string;
  providerName: string;
  period: string;
  totalAmount: number;
  status: string;
  anomalyCount: number;
  orders: Array<{
    id: string;
    title: string;
    brandName: string;
    amount: number;
    status: string;
    anomaly: boolean;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  pending_platform: '待平台确认',
  pending_offline: '待线下结算',
  settled: '已结算',
};

function statusKind(status: string) {
  if (status === 'settled') return 'success' as const;
  if (status === 'pending_offline') return 'warning' as const;
  return 'pending' as const;
}

export default function PlatformSettlementView() {
  const [stats, setStats] = useState({ pending: 0, offline: 0, settled: 0, anomaly: 0 });
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selected, setSelected] = useState<BatchRow | null>(null);
  const [providerName, setProviderName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const q = new URLSearchParams();
    if (providerName) q.set('providerName', providerName);
    if (status) q.set('status', status);
    fetch(`/api/platform/settlement-batches?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { pending: 0, offline: 0, settled: 0, anomaly: 0 });
        setBatches(d.batches ?? []);
      });
  }, [providerName, status]);

  const tableRows = batches.map((b) => ({
    id: `${b.providerId}-${b.status}`,
    providerName: b.providerName,
    period: b.period,
    totalAmount: b.totalAmount,
    status: b.status,
    anomalyCount: b.anomalyCount,
    orderCount: b.orders.length,
    _batch: b,
  }));

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '待平台确认', value: stats.pending },
            { label: '待线下结算', value: stats.offline },
            { label: '已结算', value: stats.settled },
            { label: '异常批次', value: stats.anomaly },
          ]}
        />
        <PlatformFilterBar onReset={() => { setProviderName(''); setStatus(''); }}>
          <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="接单方" className="platform-filter-input" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="platform-filter-input">
            <option value="">全部状态</option>
            <option value="pending_platform">待平台确认</option>
            <option value="pending_offline">待线下结算</option>
            <option value="settled">已结算</option>
          </select>
        </PlatformFilterBar>
        <PlatformDataTable<(typeof tableRows)[number]>
          rows={tableRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r._batch)}
          columns={[
            { key: 'provider', header: '接单方', render: (r) => r.providerName },
            { key: 'period', header: '周期', render: (r) => r.period },
            { key: 'amount', header: '金额', render: (r) => `¥${r.totalAmount.toLocaleString('zh-CN')}` },
            { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={STATUS_LABELS[r.status] ?? r.status} kind={statusKind(r.status)} /> },
            { key: 'anomaly', header: '异常', render: (r) => (r.anomalyCount > 0 ? r.anomalyCount : '—') },
          ]}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={`${selected.providerName} · ${selected.period}`}
          statusLabel={STATUS_LABELS[selected.status] ?? selected.status}
          statusKind={statusKind(selected.status)}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-2">
              <button type="button" className="geo-btn-secondary text-sm flex-1">退回核对</button>
              <button type="button" className="geo-btn-primary text-sm flex-1">通过结算</button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-lg font-bold">¥{selected.totalAmount.toLocaleString('zh-CN')}</p>
            <div>
              <h4 className="mb-2 text-xs font-semibold">订单明细</h4>
              {selected.orders.map((o) => (
                <div key={o.id} className="border-b border-[var(--platform-border-subtle)] py-2 text-xs">
                  <p className="font-medium">{o.title}</p>
                  <p className="text-[var(--platform-text-tertiary)]">{o.brandName} · ¥{o.amount}{o.anomaly ? ' · 异常' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
