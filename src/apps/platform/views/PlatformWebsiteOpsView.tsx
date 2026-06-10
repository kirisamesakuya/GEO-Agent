import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import {
  formatWebsiteLeadGoal,
  formatWebsiteLeadListLabel,
  resolveWebsiteLeadFields,
  type WebsiteLeadSource,
} from '../../../../lib/website-lead-intake';
import WebsiteRequirementLeadDetail from '../../../components/delivery/WebsiteRequirementLeadDetail';
import { hasWebsiteGeoAnalysisNotes } from '../../../lib/website-requirement-nav';
import { WEBSITE_PAGE_TYPES } from '../../../../lib/website-order-flow';
import { useToast } from '../../../context/ToastContext';
import { platformApiFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { includesText } from '../lib/platform-filter-utils';
import type { PlatformStatusKind } from '../types';

type MainTab = 'requests' | 'orders';

interface WebsiteRequestRow extends WebsiteLeadSource {
  id: string;
  brandName: string;
  pageType: string;
  status: string;
  createdAt: string;
  orders?: Array<{ id: string; status: string }>;
  attachments?: Array<{ name: string; url: string; mimeType?: string }>;
}

interface WebsiteOrderRow {
  id: string;
  brandName: string;
  status: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  previewUrl?: string | null;
  deliveryNote?: string | null;
  revisionReason?: string | null;
  createdAt: string;
  request?: WebsiteRequestRow | null;
}

interface ProviderOption {
  id: string;
  name: string;
}

interface RequestFormState {
  brandName: string;
  pageType: string;
  referenceUrl: string;
  keywords: string;
  notes: string;
  contact: string;
}

const EMPTY_FORM: RequestFormState = {
  brandName: '',
  pageType: WEBSITE_PAGE_TYPES[0],
  referenceUrl: '',
  keywords: '',
  notes: '',
  contact: '',
};

const REQUEST_STATUS_LABEL: Record<string, string> = {
  submitted: '待接单',
  ordered: '已转订单',
  preview_ready: '待确认',
  draft: '草稿',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待交付',
  in_progress: '处理中',
  pending_review: '待验收',
  revision: '需补充',
  completed: '已交付',
};

function orderStatusKind(status: string): PlatformStatusKind {
  if (status === 'completed') return 'success';
  if (status === 'revision') return 'warning';
  if (status === 'pending' || status === 'in_progress') return 'pending';
  return 'muted';
}

function requestStatusKind(status: string): PlatformStatusKind {
  if (status === 'ordered') return 'success';
  if (status === 'submitted') return 'pending';
  return 'muted';
}

function stopRowClick(handler: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    handler();
  };
}

function ActionLink({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`text-xs font-medium ${danger ? 'text-red-600 hover:underline' : 'text-[var(--platform-primary)] hover:underline'}`}
      onClick={stopRowClick(onClick)}
    >
      {label}
    </button>
  );
}

export default function PlatformWebsiteOpsView() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<MainTab>('orders');
  const [requests, setRequests] = useState<WebsiteRequestRow[]>([]);
  const [orders, setOrders] = useState<WebsiteOrderRow[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [reqStatusFilter, setReqStatusFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WebsiteRequestRow | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WebsiteOrderRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestModal, setRequestModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<RequestFormState>(EMPTY_FORM);

  const load = useCallback(() => {
    const rq = new URLSearchParams();
    if (reqStatusFilter) rq.set('status', reqStatusFilter);
    void platformApiFetch(`/api/platform/website-requests?${rq}`)
      .then((r) => r.json())
      .then((d) => setRequests((d.requests ?? []) as WebsiteRequestRow[]));
    void platformApiFetch('/api/platform/website-orders')
      .then((r) => r.json())
      .then((d) => setOrders((d.orders ?? []) as WebsiteOrderRow[]));
  }, [reqStatusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void platformApiFetch('/api/platform/providers?status=approved')
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.providers ?? []) as Array<{ id: string; name: string }>;
        setProviders(rows.map((p) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  const filteredRequests = useMemo(
    () => requests.filter((r) => includesText(r.brandName, brandFilter)),
    [requests, brandFilter]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!includesText(o.brandName, brandFilter)) return false;
      if (!orderStatusFilter) return true;
      if (orderStatusFilter === 'pending') {
        return o.status === 'pending' || o.status === 'in_progress' || o.status === 'pending_review';
      }
      return o.status === orderStatusFilter;
    });
  }, [orders, brandFilter, orderStatusFilter]);

  const openCreateRequest = () => {
    setForm(EMPTY_FORM);
    setRequestModal({ mode: 'create' });
  };

  const openEditRequest = (row: WebsiteRequestRow) => {
    const fields = resolveWebsiteLeadFields(row);
    setForm({
      brandName: row.brandName,
      pageType: fields.pageType || row.pageType,
      referenceUrl: fields.referenceUrl,
      keywords: fields.keywords,
      notes: fields.notes,
      contact: fields.contact,
    });
    setRequestModal({ mode: 'edit', id: row.id });
  };

  const saveRequest = async () => {
    if (!form.brandName.trim() || !form.keywords.trim() || !form.contact.trim()) {
      toast('请填写品牌、目标关键词与联系方式', 'error');
      return;
    }
    setSubmitting(true);
    const payload = {
      brandName: form.brandName.trim(),
      pageType: form.pageType,
      referenceUrl: form.referenceUrl.trim() || undefined,
      keywords: form.keywords.trim(),
      contact: form.contact.trim(),
      notes: form.notes.trim() || undefined,
      goal: formatWebsiteLeadGoal({
        keywords: form.keywords.trim(),
        notes: form.notes.trim(),
        contact: form.contact.trim(),
      }),
    };
    const res =
      requestModal?.mode === 'edit' && requestModal.id
        ? await platformApiFetch(`/api/platform/website-requests/${requestModal.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await platformApiFetch('/api/platform/website-requests', {
            method: 'POST',
            body: JSON.stringify({ ...payload, modules: ['平台录入'] }),
          });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(requestModal?.mode === 'edit' ? '需求已更新' : '需求已创建', 'success');
    setRequestModal(null);
    load();
  };

  const deleteRequest = async (id: string) => {
    if (!window.confirm('确定删除该需求？已转订单的需求需先删除订单。')) return;
    const res = await platformApiFetch(`/api/platform/website-requests/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('需求已删除', 'success');
    if (selectedRequest?.id === id) setSelectedRequest(null);
    load();
  };

  const openOrder = async (order: WebsiteOrderRow) => {
    const res = await platformApiFetch(`/api/platform/website-orders/${order.id}`);
    const data = await res.json();
    const row = (data.order ?? order) as WebsiteOrderRow;
    setSelectedOrder(row);
    setPreviewUrl(String(row.previewUrl ?? ''));
    setDeliveryNote(String(row.deliveryNote ?? ''));
    setRevisionReason('');
    setAssigneeId(row.assigneeId ?? '');
  };

  const assignOrder = async () => {
    if (!selectedOrder || !assigneeId) {
      toast('请选择接单方', 'error');
      return;
    }
    const provider = providers.find((p) => p.id === assigneeId);
    if (!provider) return;
    setSubmitting(true);
    const res = await platformApiFetch(`/api/platform/website-orders/${selectedOrder.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId: provider.id, assigneeName: provider.name }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已指派接单方', 'success');
    setSelectedOrder((data.order ?? null) as WebsiteOrderRow | null);
    load();
  };

  const offlineDeliver = async () => {
    if (!selectedOrder) return;
    if (!previewUrl.trim()) {
      toast('请填写交付预览链接', 'error');
      return;
    }
    setSubmitting(true);
    const res = await platformApiFetch(
      `/api/platform/website-orders/${selectedOrder.id}/offline-deliver`,
      {
        method: 'POST',
        body: JSON.stringify({ previewUrl: previewUrl.trim(), deliveryNote: deliveryNote.trim() || undefined }),
      }
    );
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已登记交付', 'success');
    setSelectedOrder(null);
    load();
  };

  const markRevision = async () => {
    if (!selectedOrder) return;
    if (!revisionReason.trim()) {
      toast('请填写需补充说明', 'error');
      return;
    }
    setSubmitting(true);
    const res = await platformApiFetch(
      `/api/platform/website-orders/${selectedOrder.id}/revision`,
      { method: 'POST', body: JSON.stringify({ reason: revisionReason.trim() }) }
    );
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已标记需补充', 'info');
    setSelectedOrder(null);
    load();
  };

  const createOrderFromRequest = async (requestId: string) => {
    setSubmitting(true);
    const res = await platformApiFetch(`/api/platform/website-requests/${requestId}/create-order`, {
      method: 'POST',
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已创建执行订单', 'success');
    setSelectedRequest(null);
    setMainTab('orders');
    load();
  };

  const deleteOrder = async (id: string) => {
    if (!window.confirm('确定删除该执行订单？')) return;
    const res = await platformApiFetch(`/api/platform/website-orders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('订单已删除', 'success');
    if (selectedOrder?.id === id) setSelectedOrder(null);
    load();
  };

  const renderLeadFields = (source: WebsiteRequestRow | WebsiteLeadSource) => (
    <WebsiteRequirementLeadDetail source={source} variant="platform" />
  );

  const pendingOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'in_progress' || o.status === 'pending_review'
  ).length;
  const revisionOrders = orders.filter((o) => o.status === 'revision').length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">网站需求与订单</h2>
          <div className="flex flex-wrap items-center gap-2">
            {mainTab === 'requests' && (
              <button type="button" className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1" onClick={openCreateRequest}>
                <Plus className="w-3.5 h-3.5" />
                新建需求
              </button>
            )}
            <PlatformTabBar
              tabs={[
                { id: 'orders', label: '执行订单' },
                { id: 'requests', label: '需求列表' },
              ]}
              active={mainTab}
              onChange={(id) => setMainTab(id as MainTab)}
            />
          </div>
        </div>

        <PlatformStatSummary
          items={[
            { label: '待交付', value: pendingOrders },
            { label: '需补充', value: revisionOrders },
            { label: '已交付', value: completedOrders },
            { label: '需求总数', value: requests.length },
          ]}
        />

        <PlatformFilterBar onReset={() => { setBrandFilter(''); setReqStatusFilter(''); setOrderStatusFilter(''); }}>
          <PlatformFilterField label="品牌">
            <input
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="商家品牌"
              className="platform-filter-input"
            />
          </PlatformFilterField>
          {mainTab === 'requests' ? (
            <PlatformFilterField label="需求状态">
              <select
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
                className="platform-filter-input"
              >
                <option value="">全部</option>
                <option value="submitted">待接单</option>
                <option value="ordered">已转订单</option>
              </select>
            </PlatformFilterField>
          ) : (
            <PlatformFilterField label="订单状态">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="platform-filter-input"
              >
                <option value="">全部</option>
                <option value="pending">待交付</option>
                <option value="revision">需补充</option>
                <option value="completed">已交付</option>
              </select>
            </PlatformFilterField>
          )}
        </PlatformFilterBar>

        {mainTab === 'requests' ? (
          <PlatformDataTable<WebsiteRequestRow>
            rows={filteredRequests}
            rowKey={(r) => r.id}
            selectedKey={selectedRequest?.id}
            onRowClick={setSelectedRequest}
            emptyText="暂无网站需求"
            renderActions={(r) => (
              <div className="flex flex-wrap gap-2">
                <ActionLink label="详情" onClick={() => setSelectedRequest(r)} />
                <ActionLink label="编辑" onClick={() => openEditRequest(r)} />
                {r.status !== 'ordered' && !(r.orders?.length) && (
                  <ActionLink label="转订单" onClick={() => void createOrderFromRequest(r.id)} />
                )}
                <ActionLink label="删除" danger onClick={() => void deleteRequest(r.id)} />
              </div>
            )}
            columns={[
              { key: 'brand', header: '品牌', render: (r) => r.brandName },
              { key: 'page', header: '页面类型', render: (r) => r.pageType },
              {
                key: 'keywords',
                header: '目标关键词',
                render: (r) => (
                  <span className="max-w-[180px] truncate block">{formatWebsiteLeadListLabel(r)}</span>
                ),
              },
              {
                key: 'analysis',
                header: '分析报告',
                render: (r) =>
                  hasWebsiteGeoAnalysisNotes(resolveWebsiteLeadFields(r).notes) ? (
                    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700">
                      含分析
                    </span>
                  ) : (
                    <span className="text-[var(--platform-text-tertiary)]">—</span>
                  ),
              },
              {
                key: 'contact',
                header: '联系方式',
                render: (r) => resolveWebsiteLeadFields(r).contact || '—',
              },
              {
                key: 'time',
                header: '提交时间',
                render: (r) =>
                  new Date(r.createdAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
              },
              {
                key: 'status',
                header: '状态',
                render: (r) => (
                  <PlatformStatusTag
                    label={REQUEST_STATUS_LABEL[r.status] ?? r.status}
                    kind={requestStatusKind(r.status)}
                  />
                ),
              },
            ]}
          />
        ) : (
          <PlatformDataTable<WebsiteOrderRow>
            rows={filteredOrders}
            rowKey={(o) => o.id}
            selectedKey={selectedOrder?.id}
            onRowClick={(o) => void openOrder(o)}
            emptyText="暂无执行订单"
            renderActions={(o) => (
              <div className="flex flex-wrap gap-2">
                <ActionLink label="处理" onClick={() => void openOrder(o)} />
                {o.status !== 'completed' && (
                  <ActionLink label="删除" danger onClick={() => void deleteOrder(o.id)} />
                )}
              </div>
            )}
            columns={[
              { key: 'brand', header: '品牌', render: (o) => o.brandName },
              {
                key: 'page',
                header: '页面类型',
                render: (o) => o.request?.pageType ?? '—',
              },
              {
                key: 'keywords',
                header: '目标关键词',
                render: (o) =>
                  o.request ? (
                    <span className="max-w-[180px] truncate block">
                      {formatWebsiteLeadListLabel(o.request)}
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'assignee',
                header: '指派',
                render: (o) => o.assigneeName ?? '平台自营',
              },
              {
                key: 'status',
                header: '状态',
                render: (o) => (
                  <PlatformStatusTag
                    label={ORDER_STATUS_LABEL[o.status] ?? o.status}
                    kind={orderStatusKind(o.status)}
                  />
                ),
              },
              {
                key: 'time',
                header: '创建时间',
                render: (o) =>
                  new Date(o.createdAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
              },
            ]}
          />
        )}
      </div>

      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="platform-card w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold">{requestModal.mode === 'create' ? '新建网站需求' : '编辑网站需求'}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="platform-filter-label">品牌 *</label>
                <input className="platform-filter-input w-full mt-1" value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))} />
              </div>
              <div>
                <label className="platform-filter-label">页面类型 *</label>
                <select className="platform-filter-input w-full mt-1" value={form.pageType} onChange={(e) => setForm((f) => ({ ...f, pageType: e.target.value }))}>
                  {WEBSITE_PAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="platform-filter-label">官网链接</label>
                <input className="platform-filter-input w-full mt-1" value={form.referenceUrl} onChange={(e) => setForm((f) => ({ ...f, referenceUrl: e.target.value }))} placeholder="https://" />
              </div>
              <div>
                <label className="platform-filter-label">目标关键词 *</label>
                <input className="platform-filter-input w-full mt-1" value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} />
              </div>
              <div>
                <label className="platform-filter-label">联系方式 *</label>
                <input className="platform-filter-input w-full mt-1" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              </div>
              <div>
                <label className="platform-filter-label">参考说明</label>
                <textarea className="platform-filter-input w-full mt-1 min-h-[72px]" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="geo-btn-secondary text-sm" onClick={() => setRequestModal(null)} disabled={submitting}>取消</button>
              <button type="button" className="geo-btn-primary text-sm" onClick={() => void saveRequest()} disabled={submitting}>
                {submitting ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && mainTab === 'requests' && (
        <PlatformDetailDrawer
          title={selectedRequest.pageType}
          statusLabel={REQUEST_STATUS_LABEL[selectedRequest.status] ?? selectedRequest.status}
          statusKind={requestStatusKind(selectedRequest.status)}
          onClose={() => setSelectedRequest(null)}
          footer={
            <div className="space-y-2 w-full">
              {selectedRequest.status !== 'ordered' && !(selectedRequest.orders?.length) && (
                <button
                  type="button"
                  className="geo-btn-primary text-sm w-full"
                  disabled={submitting}
                  onClick={() => void createOrderFromRequest(selectedRequest.id)}
                >
                  {submitting ? '处理中…' : '从需求创建订单'}
                </button>
              )}
              <button type="button" className="geo-btn-secondary text-sm w-full" onClick={() => openEditRequest(selectedRequest)}>
                编辑需求
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-[var(--platform-text-tertiary)]">
              {selectedRequest.brandName} · 提交于{' '}
              {new Date(selectedRequest.createdAt).toLocaleString('zh-CN')}
            </p>
            {renderLeadFields(selectedRequest)}
          </div>
        </PlatformDetailDrawer>
      )}

      {selectedOrder && mainTab === 'orders' && (
        <PlatformDetailDrawer
          title={selectedOrder.request?.pageType ?? '网站订单'}
          statusLabel={ORDER_STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}
          statusKind={orderStatusKind(selectedOrder.status)}
          onClose={() => setSelectedOrder(null)}
          footer={
            selectedOrder.status !== 'completed' ? (
              <div className="space-y-2 w-full">
                <button
                  type="button"
                  className="geo-btn-primary text-sm w-full"
                  disabled={submitting}
                  onClick={() => void offlineDeliver()}
                >
                  {submitting ? '提交中…' : '登记交付并完成'}
                </button>
                <button
                  type="button"
                  className="geo-btn-secondary text-sm w-full"
                  disabled={submitting}
                  onClick={() => void markRevision()}
                >
                  标记需补充
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--platform-text-tertiary)]">
              {selectedOrder.brandName} · 创建于{' '}
              {new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}
            </p>
            {selectedOrder.request && renderLeadFields(selectedOrder.request)}
            {selectedOrder.status !== 'completed' && (
              <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: 'var(--platform-border)' }}>
                <p className="text-xs font-semibold">指派接单方</p>
                <div className="flex gap-2">
                  <select
                    className="platform-filter-input flex-1"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">平台自营（未指派）</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button type="button" className="geo-btn-secondary text-sm shrink-0" disabled={submitting || !assigneeId} onClick={() => void assignOrder()}>
                    指派
                  </button>
                </div>
              </div>
            )}
            {selectedOrder.status === 'revision' && selectedOrder.revisionReason && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold mb-1">需补充说明</p>
                <p>{selectedOrder.revisionReason}</p>
              </div>
            )}
            {selectedOrder.status !== 'completed' && (
              <div className="space-y-2">
                <div>
                  <label className="platform-filter-label">交付预览链接</label>
                  <input
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    placeholder="https://"
                    className="platform-filter-input w-full mt-1"
                  />
                </div>
                <div>
                  <label className="platform-filter-label">交付说明（可选）</label>
                  <textarea
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="上线说明、注意事项等"
                    className="platform-filter-input w-full mt-1 min-h-[72px]"
                  />
                </div>
                <div>
                  <label className="platform-filter-label">需补充原因（标记需补充时填写）</label>
                  <textarea
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="请说明发布方需补充的信息"
                    className="platform-filter-input w-full mt-1 min-h-[56px]"
                  />
                </div>
              </div>
            )}
            {selectedOrder.status === 'completed' && selectedOrder.previewUrl && (
              <div className="space-y-1 text-sm">
                <p className="text-xs text-[var(--platform-text-tertiary)]">交付结果</p>
                <a
                  href={selectedOrder.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="geo-link break-all"
                >
                  {selectedOrder.previewUrl}
                </a>
                {selectedOrder.deliveryNote && (
                  <p className="text-xs text-[var(--platform-text-tertiary)]">{selectedOrder.deliveryNote}</p>
                )}
              </div>
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}
