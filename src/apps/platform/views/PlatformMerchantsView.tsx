import { useEffect, useMemo, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import { includesText } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface MerchantRow {
  id: string;
  name: string;
  industry: string;
  city: string;
  status: string;
  taskCount: number;
  orderCount: number;
  balance: number;
  frozen: number;
  aiCredits: number;
}

interface MerchantDetail {
  brand: Record<string, unknown>;
  tasks: Array<Record<string, unknown>>;
  failedTasks: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  websiteOrders: Array<Record<string, unknown>>;
  budget: { balance: number; frozen: number };
  credits: { balance: number };
  ledger: Array<Record<string, unknown>>;
  ledgerSummary: { freezeTotal: number; releaseTotal: number; anomaly: boolean };
}

export default function PlatformMerchantsView() {
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [selected, setSelected] = useState<MerchantRow | null>(null);
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = () => {
    platformApiFetch('/api/platform/merchants')
      .then((r) => r.json())
      .then((d) => setMerchants(d.merchants ?? []));
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    platformApiFetch(`/api/platform/merchants/${encodeURIComponent(selected.name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast(d.error, 'error');
          return;
        }
        setDetail(d as MerchantDetail);
      })
      .finally(() => setDetailLoading(false));
  }, [selected, toast]);

  const industries = useMemo(
    () => [...new Set(merchants.map((m) => m.industry).filter(Boolean))].sort(),
    [merchants]
  );

  const filtered = useMemo(() => {
    return merchants.filter((m) => {
      if (!includesText(m.name, brandName)) return false;
      if (industry && m.industry !== industry) return false;
      if (status && m.status !== status) return false;
      if (riskOnly && !(m.frozen > m.balance)) return false;
      return true;
    });
  }, [merchants, brandName, industry, status, riskOnly]);

  const stats = useMemo(() => {
    const highRisk = merchants.filter((m) => m.frozen > m.balance).length;
    const disabled = merchants.filter((m) => m.status === 'disabled').length;
    return {
      total: merchants.length,
      active: merchants.length - disabled,
      missing: merchants.filter((m) => !m.industry || !m.city).length,
      highRisk,
    };
  }, [merchants]);

  const refreshDetail = async (name: string) => {
    const res = await platformApiFetch(`/api/platform/merchants/${encodeURIComponent(name)}`);
    const d = await res.json();
    if (!d.error) setDetail(d as MerchantDetail);
    loadList();
  };

  const toggleStatus = async (next: 'active' | 'disabled') => {
    if (!selected) return;
    if (next === 'disabled' && !statusReason.trim()) {
      toast('请填写禁用原因', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/merchants/${encodeURIComponent(selected.name)}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status: next,
        reason: statusReason || (next === 'active' ? '恢复启用' : ''),
        role,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(next === 'disabled' ? '已禁用' : '已启用', next === 'disabled' ? 'info' : 'success');
    setStatusReason('');
    void refreshDetail(selected.name);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '总商家', value: stats.total },
            { label: '正常运营', value: stats.active },
            { label: '资料缺失', value: stats.missing },
            { label: '高风险', value: stats.highRisk },
          ]}
        />
        <PlatformFilterBar onReset={() => { setBrandName(''); setIndustry(''); setStatus(''); setRiskOnly(false); }}>
          <PlatformFilterField label="品牌">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="行业">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              {industries.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </PlatformFilterField>
          <PlatformFilterField label="品牌状态">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
            </select>
          </PlatformFilterField>
          <PlatformFilterField label="余额风险" className="platform-filter-field--checkbox">
            <label className="platform-filter-checkbox-row">
              <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} />
              <span>仅高风险</span>
            </label>
          </PlatformFilterField>
        </PlatformFilterBar>
        <PlatformDataTable<MerchantRow>
          rows={filtered}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          columns={[
            { key: 'name', header: '品牌', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'industry', header: '行业', render: (r) => r.industry },
            { key: 'tasks', header: 'Agent', render: (r) => r.taskCount },
            { key: 'orders', header: '订单', render: (r) => r.orderCount },
            { key: 'balance', header: '余额', render: (r) => `¥${r.balance}` },
            { key: 'credits', header: '算力', render: (r) => r.aiCredits },
            {
              key: 'status',
              header: '状态',
              render: (r) => (
                <PlatformStatusTag
                  label={r.status === 'disabled' ? '已禁用' : r.frozen > r.balance ? '余额风险' : '正常'}
                  kind={r.status === 'disabled' ? 'muted' : r.frozen > r.balance ? 'danger' : 'success'}
                />
              ),
            },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              {r.status === 'active' ? (
                <PlatformTableAction label="停用" variant="danger" disabled={!can('merchant.disable')} onClick={() => setSelected(r)} />
              ) : (
                <PlatformTableAction label="启用" variant="primary" onClick={() => setSelected(r)} />
              )}
            </PlatformTableActions>
          )}
        />
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={selected.status === 'disabled' ? '已禁用' : '正常'}
          statusKind={selected.status === 'disabled' ? 'muted' : 'success'}
          onClose={() => { setSelected(null); setStatusReason(''); }}
          footer={!detailLoading ? (
            <div className="space-y-2">
              <input
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="禁用/启用原因"
                className="platform-filter-input w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs flex-1"
                  onClick={() => void toggleStatus('disabled')}
                  disabled={!can('merchant.disable')}
                >
                  停用
                </button>
                <button type="button" className="geo-btn-primary geo-btn-xs flex-1" onClick={() => void toggleStatus('active')}>
                  启用
                </button>
              </div>
            </div>
          ) : undefined}
        >
          {detailLoading || !detail ? (
            <p className="text-sm text-[var(--platform-text-tertiary)]">详情加载中…</p>
          ) : (
          <>
          <p className="text-xs text-[var(--platform-text-secondary)]">
            {String(detail.brand.industry ?? '—')} · {String(detail.brand.city ?? '—')}
            {detail.brand.website ? ` · ${String(detail.brand.website)}` : ''}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-[var(--platform-border-subtle)] p-3">
              <p className="text-xs text-[var(--platform-text-secondary)]">投放余额</p>
              <p className="font-semibold">¥{detail.budget.balance}</p>
              <p className="text-xs text-[var(--platform-text-secondary)]">冻结 ¥{detail.budget.frozen}</p>
            </div>
            <div className="rounded-lg border border-[var(--platform-border-subtle)] p-3">
              <p className="text-xs text-[var(--platform-text-secondary)]">AI 算力</p>
              <p className="font-semibold">{detail.credits.balance} 点</p>
            </div>
          </div>
          {detail.ledgerSummary.anomaly && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              余额风险：冻结金额超过可用余额，请核查流水。
            </p>
          )}

          {detail.failedTasks.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold">失败 Agent 任务</h4>
              <div className="space-y-1">
                {detail.failedTasks.map((t) => (
                  <p key={String(t.id)} className="text-xs text-red-700">
                    {String(t.title)} · {String(t.type)}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold">最近 Agent 任务</h4>
            <div className="space-y-1">
              {detail.tasks.map((t) => (
                <p key={String(t.id)} className="text-xs">
                  {String(t.title)} · {String(t.status)}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold">最近订单</h4>
            <div className="space-y-1">
              {detail.orders.map((o) => (
                <p key={String(o.id)} className="text-xs">
                  {String(o.title)} · {String(o.status)} · ¥{Number(o.budget ?? 0)}
                </p>
              ))}
            </div>
          </div>

          {detail.websiteOrders.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold">网站订单</h4>
              <div className="space-y-1">
                {detail.websiteOrders.map((o) => (
                  <p key={String(o.id)} className="text-xs">
                    {String((o.request as Record<string, unknown> | undefined)?.pageType ?? '页面')} · {String(o.status)}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold">资金流水（最近）</h4>
            <div className="space-y-1">
              {detail.ledger.map((l) => (
                <p key={String(l.id)} className="text-xs">
                  {String(l.type)} · ¥{Number(l.amount)} · {new Date(String(l.createdAt)).toLocaleDateString('zh-CN')}
                </p>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[var(--platform-text-secondary)]">
              冻结合计 ¥{detail.ledgerSummary.freezeTotal} · 释放合计 ¥{detail.ledgerSummary.releaseTotal}
            </p>
          </div>
          </>
          )}
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
