import { useEffect, useMemo, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformStatusKind } from '../types';

interface OrderRow {
  id: string;
  title: string;
  brandName: string;
  providerName?: string | null;
  providerId?: string | null;
  status: string;
  budget?: number;
  createdAt?: string;
}

interface Delivery {
  id: string;
  content?: string | null;
  attachments?: string | null;
  status?: string;
  createdAt: string;
}

interface Revision {
  id: string;
  reason?: string | null;
  status: string;
  createdAt: string;
}

interface OrderDetail extends OrderRow {
  description?: string;
  deliverable?: string;
  acceptance?: string;
  deliveries?: Delivery[];
  revisions?: Revision[];
  settlement?: { status: string; note?: string | null } | null;
  assignments?: Array<{ providerName: string; reason?: string | null; createdAt: string; active: boolean }>;
}

interface ReassignPreview {
  deliveryCount: number;
  openRevisions: number;
  riskHints: string[];
  currentProviderName?: string | null;
}

const ORDER_TABS = [
  { id: 'all', label: '全部' },
  { id: 'unassigned', label: '待派单' },
  { id: 'in_progress', label: '执行中' },
  { id: 'pending_review', label: '待验收' },
  { id: 'revision', label: '返修' },
  { id: 'disputed', label: '争议' },
  { id: 'completed', label: '已完成' },
];

const STATUS_LABELS: Record<string, string> = {
  published: '待派单',
  in_progress: '执行中',
  pending_review: '待验收',
  revision: '返修中',
  disputed: '争议中',
  completed: '已完成',
};

function statusKind(status: string): PlatformStatusKind {
  if (status === 'disputed') return 'danger';
  if (status === 'revision' || status === 'pending_review') return 'warning';
  if (status === 'completed') return 'success';
  return 'pending';
}

function matchesTab(order: OrderRow, tab: string) {
  if (tab === 'all') return true;
  if (tab === 'unassigned') return order.status === 'published' && !order.providerId;
  return order.status === tab;
}

const RELEASE_BLOCKED_STATUSES = new Set(['completed', 'published']);

function canReleaseOrder(order: OrderRow) {
  return Boolean(order.providerId) && !RELEASE_BLOCKED_STATUSES.has(order.status);
}

export default function PlatformOrdersView() {
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState('all');
  const [brandName, setBrandName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [preview, setPreview] = useState<ReassignPreview | null>(null);
  const [providers, setProviders] = useState<Array<{ id: string; name: string; type?: string }>>([]);
  const [assignProviderId, setAssignProviderId] = useState('');
  const [assignProviderName, setAssignProviderName] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [releaseTarget, setReleaseTarget] = useState<OrderRow | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  const loadOrders = (p: number, append: boolean) => {
    platformApiFetch(`/api/platform/task-orders?page=${p}&pageSize=30`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(append ? (prev) => [...prev, ...(d.orders ?? [])] : (d.orders ?? []));
        setHasMore(Boolean(d.hasMore));
      });
  };

  useEffect(() => {
    loadOrders(1, false);
    platformApiFetch('/api/platform/providers?status=approved')
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []));
  }, []);

  useEffect(() => {
    if (page > 1) loadOrders(page, true);
  }, [page]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!matchesTab(o, tab)) return false;
      if (brandName && !o.brandName.includes(brandName)) return false;
      if (providerName && !(o.providerName ?? '').includes(providerName)) return false;
      if (orderStatus && o.status !== orderStatus) return false;
      if (!matchesDateRange(o.createdAt, dateSince, dateUntil)) return false;
      return true;
    });
  }, [orders, tab, brandName, providerName, orderStatus, dateSince, dateUntil]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of ORDER_TABS) {
      counts[t.id] = orders.filter((o) => matchesTab(o, t.id)).length;
    }
    return counts;
  }, [orders]);

  const selectOrder = async (id: string) => {
    const [orderRes, previewRes] = await Promise.all([
      platformApiFetch(`/api/platform/task-orders/${id}`),
      platformApiFetch(`/api/platform/task-orders/${id}/reassign-preview`),
    ]);
    const orderData = await orderRes.json();
    const o = orderData.order as OrderDetail | undefined;
    setSelected(o ?? null);
    const previewData = await previewRes.json();
    setPreview(previewData.preview ?? null);
    if (o?.providerId) {
      setAssignProviderId(String(o.providerId));
      setAssignProviderName(String(o.providerName ?? ''));
    } else {
      setAssignProviderId('');
      setAssignProviderName('');
    }
    setNextStatus(o?.status ?? '');
  };

  const reloadSelected = async () => {
    if (!selected) return;
    await selectOrder(selected.id);
    loadOrders(1, false);
    setPage(1);
  };

  const assignOrder = async () => {
    if (!selected || !assignProviderId) return;
    const res = await platformFetch(role, `/api/platform/task-orders/${selected.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ providerId: assignProviderId, providerName: assignProviderName, reason: statusReason, role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('派单成功', 'success');
    void reloadSelected();
  };

  const reassignOrder = async () => {
    if (!selected || !assignProviderId || !statusReason.trim()) {
      toast('请填写新接单方与改派原因', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/task-orders/${selected.id}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ providerId: assignProviderId, providerName: assignProviderName, reason: statusReason, role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('改派成功', 'success');
    void reloadSelected();
  };

  const releaseOrder = async (orderId: string, reason: string) => {
    if (!reason.trim()) {
      toast('请填写释放原因', 'error');
      return;
    }
    setReleaseSubmitting(true);
    try {
      const res = await platformFetch(role, `/api/platform/task-orders/${orderId}/release`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), role }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      toast('已释放到任务大厅，接单方可重新领取', 'success');
      setReleaseTarget(null);
      setReleaseReason('');
      if (selected?.id === orderId) {
        setSelected(null);
        setPreview(null);
      }
      loadOrders(1, false);
      setPage(1);
    } finally {
      setReleaseSubmitting(false);
    }
  };

  const advanceSettlement = async (status: string) => {
    if (!selected) return;
    const res = await platformFetch(role, `/api/platform/task-orders/${selected.id}/settlement`, {
      method: 'POST',
      body: JSON.stringify({ status, note: statusReason, operatorId: role, role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('结算状态已更新', 'success');
    void reloadSelected();
  };

  const updateStatus = async () => {
    if (!selected || !nextStatus || !statusReason.trim()) {
      toast('请选择状态并填写原因', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/task-orders/${selected.id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: nextStatus, reason: statusReason, role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('订单状态已更新', 'success');
    void reloadSelected();
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformTabBar
          tabs={ORDER_TABS.map((t) => ({ ...t, count: tabCounts[t.id] }))}
          active={tab}
          onChange={setTab}
        />
        <PlatformFilterBar onReset={() => { setBrandName(''); setProviderName(''); setOrderStatus(''); setDateSince(''); setDateUntil(''); }}>
          <PlatformFilterField label="品牌">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="接单方">
            <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="接单方名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="订单状态">
            <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="published">待派单</option>
              <option value="in_progress">执行中</option>
              <option value="pending_review">待验收</option>
              <option value="revision">返修中</option>
              <option value="disputed">争议中</option>
              <option value="completed">已完成</option>
            </select>
          </PlatformFilterField>
          <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
        </PlatformFilterBar>
        <PlatformDataTable<OrderRow>
          rows={filtered}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={(r) => void selectOrder(r.id)}
          columns={[
            { key: 'title', header: '标题', render: (r) => <span className="max-w-[200px] truncate block">{r.title}</span> },
            { key: 'brand', header: '品牌', render: (r) => r.brandName },
            { key: 'provider', header: '接单方', render: (r) => r.providerName ?? '—' },
            {
              key: 'status',
              header: '状态',
              render: (r) => (
                <PlatformStatusTag
                  label={STATUS_LABELS[r.status] ?? r.status}
                  kind={statusKind(r.status)}
                />
              ),
            },
            { key: 'budget', header: '预算', render: (r) => `¥${Number(r.budget ?? 0)}` },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => void selectOrder(r.id)} />
              {!r.providerId && (
                <PlatformTableAction label="派单" variant="primary" disabled={!can('orders.assign')} onClick={() => void selectOrder(r.id)} />
              )}
              {r.providerId && can('orders.reassign') && (
                <PlatformTableAction label="改派" onClick={() => void selectOrder(r.id)} />
              )}
              {canReleaseOrder(r) && can('orders.reassign') && (
                <PlatformTableAction
                  label="释放"
                  variant="danger"
                  onClick={() => {
                    setReleaseTarget(r);
                    setReleaseReason('');
                  }}
                />
              )}
            </PlatformTableActions>
          )}
        />
        {hasMore && (
          <button type="button" className="geo-btn-secondary text-sm" onClick={() => setPage((p) => p + 1)}>
            加载更多订单
          </button>
        )}
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={selected.title}
          statusLabel={STATUS_LABELS[selected.status] ?? selected.status}
          statusKind={statusKind(selected.status)}
          onClose={() => { setSelected(null); setPreview(null); }}
          footer={(
            <div className="space-y-2">
              {selected.status === 'disputed' && (
                <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  争议在线下沟通解决后，请通过<strong className="font-semibold">改派</strong>或<strong className="font-semibold">释放</strong>登记平台侧处理结果。
                </p>
              )}
              <select
                className="platform-filter-input w-full"
                value={assignProviderId}
                onChange={(e) => {
                  const id = e.target.value;
                  setAssignProviderId(id);
                  const p = providers.find((x) => x.id === id);
                  if (p) setAssignProviderName(p.name);
                }}
              >
                <option value="">选择接单方…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.type ? ` (${p.type})` : ''}</option>
                ))}
              </select>
              <input
                value={assignProviderName}
                onChange={(e) => setAssignProviderName(e.target.value)}
                placeholder="接单方名称"
                className="platform-filter-input w-full"
              />
              <input
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="操作原因"
                className="platform-filter-input w-full"
              />
              <button type="button" className="geo-btn-primary text-sm w-full" onClick={() => void assignOrder()} disabled={!can('orders.assign')}>
                {selected.providerId ? '更新指派' : '人工派单'}
              </button>
              {selected.providerId && (
                <button type="button" className="geo-btn-secondary text-sm w-full" onClick={() => void reassignOrder()} disabled={!can('orders.reassign')}>
                  改派给其他接单方
                </button>
              )}
              {canReleaseOrder(selected) && (
                <button
                  type="button"
                  className="geo-btn-secondary text-sm w-full text-[var(--color-danger)] border-[var(--color-danger)]/30"
                  disabled={!can('orders.reassign')}
                  onClick={() => {
                    setReleaseTarget({
                      id: selected.id,
                      title: selected.title,
                      brandName: selected.brandName,
                      providerName: selected.providerName,
                      providerId: selected.providerId,
                      status: selected.status,
                      budget: selected.budget,
                      createdAt: selected.createdAt,
                    });
                    setReleaseReason(statusReason);
                  }}
                >
                  释放到任务大厅
                </button>
              )}
              <select className="platform-filter-input w-full" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                <option value="published">待派单</option>
                <option value="in_progress">执行中</option>
                <option value="pending_review">待验收</option>
                <option value="revision">返修中</option>
                <option value="disputed">争议中</option>
                <option value="completed">已完成</option>
              </select>
              <button type="button" className="geo-btn-secondary text-sm w-full" onClick={() => void updateStatus()}>
                状态调整
              </button>
              {selected.status === 'completed' && (
                <div className="flex gap-2">
                  <button type="button" className="geo-btn-secondary geo-btn-xs flex-1" onClick={() => void advanceSettlement('pending_offline')} disabled={!can('settlement.write')}>
                    待线下结算
                  </button>
                  <button type="button" className="geo-btn-primary geo-btn-xs flex-1" onClick={() => void advanceSettlement('settled')} disabled={!can('settlement.write')}>
                    标记已结算
                  </button>
                </div>
              )}
              <button
                type="button"
                className="geo-btn-secondary text-sm w-full"
                onClick={async () => {
                  if (!statusReason.trim()) { toast('请填写原因', 'error'); return; }
                  await platformApiFetch(`/api/platform/task-orders/${selected.id}/revision`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: statusReason }),
                  });
                  toast('已要求返修', 'info');
                  void reloadSelected();
                }}
              >
                要求返修
              </button>
            </div>
          )}
        >
          <p className="text-xs text-[var(--platform-text-secondary)]">
            {selected.brandName} · ¥{Number(selected.budget ?? 0)}
          </p>
          {selected.description && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">需求说明</h4>
              <p className="text-xs">{selected.description}</p>
            </div>
          )}
          {(selected.deliverable || selected.acceptance) && (
            <div className="text-xs space-y-1">
              {selected.deliverable && <p>交付物：{selected.deliverable}</p>}
              {selected.acceptance && <p>验收标准：{selected.acceptance}</p>}
            </div>
          )}

          {preview && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
              <p className="font-semibold text-amber-800">改派预览</p>
              <p>当前接单方：{preview.currentProviderName ?? '—'}</p>
              <p>交付记录 {preview.deliveryCount} 条 · 开放返修 {preview.openRevisions} 条</p>
              {preview.riskHints.map((h) => (
                <p key={h} className="text-amber-700">· {h}</p>
              ))}
            </div>
          )}

          {(selected.revisions?.length ?? 0) > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold">返修记录</h4>
              <div className="space-y-1">
                {selected.revisions!.map((r) => (
                  <p key={r.id} className="text-xs">
                    {r.status} · {r.reason ?? '—'} · {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {(selected.deliveries?.length ?? 0) > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold">交付物</h4>
              <div className="space-y-2">
                {selected.deliveries!.map((d) => {
                  let attachments: unknown[] = [];
                  try {
                    attachments = d.attachments ? JSON.parse(d.attachments) : [];
                  } catch { /* ignore */ }
                  return (
                    <div key={d.id} className="rounded-lg border border-[var(--platform-border-subtle)] p-2 text-xs">
                      <p>{d.status ?? 'draft'} · {new Date(d.createdAt).toLocaleString('zh-CN')}</p>
                      {d.content && <p className="mt-1 line-clamp-3">{d.content}</p>}
                      {attachments.length > 0 && <p className="mt-1 text-[var(--platform-text-secondary)]">附件 {attachments.length} 个</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selected.settlement && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">结算状态</h4>
              <PlatformStatusTag label={selected.settlement.status} kind={selected.settlement.status === 'settled' ? 'success' : 'pending'} />
              {selected.settlement.note && <p className="mt-1 text-xs">{selected.settlement.note}</p>}
            </div>
          )}

          {(selected.assignments?.length ?? 0) > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold">指派记录</h4>
              <div className="space-y-1">
                {selected.assignments!.map((a, i) => (
                  <p key={`${a.providerName}-${i}`} className="text-xs">
                    {a.providerName}{a.active ? '（当前）' : ''} · {a.reason ?? '—'}
                  </p>
                ))}
              </div>
            </div>
          )}
        </PlatformDetailDrawer>
      )}

      {releaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--platform-border)] bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-[var(--platform-text-title)]">释放到任务大厅</h3>
            <p className="mt-2 text-xs text-[var(--platform-text-secondary)] leading-relaxed">
              将解除当前接单方「{releaseTarget.providerName ?? '—'}」的指派，订单恢复为待领取状态，接单端任务大厅可重新抢单。
              已有交付记录将保留，请确认后再操作。
            </p>
            <label className="mt-4 block text-xs font-semibold text-[var(--platform-text-secondary)]">释放原因（必填）</label>
            <textarea
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              rows={3}
              placeholder="如：接单方无法履约、商家要求换人、误派单撤回"
              className="platform-filter-input mt-1.5 w-full resize-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="geo-btn-secondary text-sm flex-1"
                disabled={releaseSubmitting}
                onClick={() => {
                  setReleaseTarget(null);
                  setReleaseReason('');
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary text-sm flex-1"
                disabled={releaseSubmitting}
                onClick={() => void releaseOrder(releaseTarget.id, releaseReason)}
              >
                {releaseSubmitting ? '释放中…' : '确认释放'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
