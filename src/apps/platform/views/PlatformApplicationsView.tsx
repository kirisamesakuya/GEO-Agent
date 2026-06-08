import { platformApiFetch } from '../../../lib/platform-api';
import { useCallback, useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { includesText, matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { useToast } from '../../../context/ToastContext';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface AppRow {
  id: string;
  providerName: string;
  message?: string | null;
  createdAt: string;
  order: {
    id: string;
    title: string;
    brandName: string;
    platform: string;
    budget: number;
    type: string;
  };
}

export default function PlatformApplicationsView() {
  const { toast } = useToast();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [platform, setPlatform] = useState('');
  const [brandName, setBrandName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (platform) q.set('platform', platform);
    if (providerName) q.set('providerName', providerName);
    platformApiFetch(`/api/platform/order-applications?${q}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.applications ?? []) as Array<Record<string, unknown>>;
        setApps(
          rows.map((a) => ({
            id: String(a.id),
            providerName: String(a.providerName),
            message: a.message as string | null | undefined,
            createdAt: String(a.createdAt),
            order: a.order as AppRow['order'],
          }))
        );
      });
  }, [platform, providerName]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (id: string) => {
    setConfirming(true);
    const res = await platformApiFetch(`/api/platform/order-applications/${id}/confirm`, { method: 'POST' });
    const data = await res.json();
    setConfirming(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已确认接单', 'success');
    setSelected(null);
    load();
  };

  const platforms = [...new Set(apps.map((a) => a.order.platform))];
  const filteredApps = apps.filter(
    (a) =>
      includesText(a.order.brandName, brandName)
      && matchesDateRange(a.createdAt, dateSince, dateUntil)
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '待确认', value: filteredApps.length },
            { label: '涉及平台', value: platforms.length },
            { label: '接单方', value: new Set(filteredApps.map((a) => a.providerName)).size },
          ]}
        />
        <PlatformFilterBar onReset={() => { setPlatform(''); setBrandName(''); setProviderName(''); setDateSince(''); setDateUntil(''); }}>
          <PlatformFilterField label="品牌">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="商家品牌" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="投放平台">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              {platforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </PlatformFilterField>
          <PlatformFilterField label="接单方">
            <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="接单方名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
        </PlatformFilterBar>
        <PlatformDataTable<AppRow>
          rows={filteredApps}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          emptyText="暂无待处理申请"
          columns={[
            { key: 'title', header: '任务', render: (r) => <span className="max-w-[220px] truncate block font-medium">{r.order.title}</span> },
            { key: 'brand', header: '品牌', render: (r) => r.order.brandName },
            { key: 'platform', header: '平台', render: (r) => r.order.platform },
            { key: 'provider', header: '接单方', render: (r) => r.providerName },
            { key: 'budget', header: '预算', render: (r) => `¥${r.order.budget}` },
            {
              key: 'time',
              header: '申请时间',
              render: (r) => new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            },
            {
              key: 'status',
              header: '状态',
              render: () => <PlatformStatusTag label="待确认" kind="pending" />,
            },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              <PlatformTableAction label="确认接单" variant="primary" disabled={confirming} onClick={() => void confirm(r.id)} />
            </PlatformTableActions>
          )}
        />
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={selected.order.title}
          statusLabel="待确认"
          statusKind="pending"
          onClose={() => setSelected(null)}
          footer={(
            <button
              type="button"
              className="geo-btn-primary text-sm w-full"
              disabled={confirming}
              onClick={() => void confirm(selected.id)}
            >
              {confirming ? '确认中…' : '确认接单'}
            </button>
          )}
        >
          <div className="space-y-3 text-sm">
            <p><span className="text-[var(--platform-text-tertiary)]">品牌：</span>{selected.order.brandName}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">平台 / 类型：</span>{selected.order.platform} · {selected.order.type}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">预算：</span>¥{selected.order.budget}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">接单方：</span>{selected.providerName}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">申请时间：</span>{new Date(selected.createdAt).toLocaleString('zh-CN')}</p>
            {selected.message && (
              <div className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 text-xs">
                <p className="mb-1 font-semibold text-[var(--platform-text-secondary)]">申请说明</p>
                <p>{selected.message}</p>
              </div>
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
