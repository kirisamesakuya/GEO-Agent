import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ViewType } from '../../types';
import GeoListPageShell from '../common/GeoListPageShell';
import OrderDeliveryEmptyState from '../common/OrderDeliveryEmptyState';
import { formatTaskOrderListTime } from '../../lib/task-order-flow';
import {
  PAID_SOURCE_DISPATCH_STATUS_TABS,
  countPaidSourceDispatchOrders,
  isPaidSourceDispatchOrder,
  orderMatchesPaidSourceDispatchFilter,
  paidSourceDispatchRowStatusClass,
  paidSourceDispatchRowStatusLabel,
  paidSourceQuoteProgressLabel,
  parsePaidSourceDispatchStageFromUrl,
  type PaidSourceDispatchFilter,
} from '../../lib/paid-source-dispatch-filters';

interface TaskOrderQuote {
  id: string;
  status?: string;
}

interface TaskOrder {
  id: string;
  brandName?: string;
  title: string;
  platform: string;
  status: string;
  pricingMode?: string;
  providerName?: string;
  createdAt?: string;
  quotes?: TaskOrderQuote[];
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialStatusFilter?: PaidSourceDispatchFilter;
}

export default function OrderDispatchManageView({
  brandName,
  onBrandChange,
  onNavigate,
  initialStatusFilter,
}: Props) {
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaidSourceDispatchFilter>(
    initialStatusFilter ?? parsePaidSourceDispatchStageFromUrl()
  );

  useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const loadOrders = useCallback(() => {
    const url =
      brandName === '__all__'
        ? '/api/orders'
        : `/api/orders?brandName=${encodeURIComponent(brandName)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]));
  }, [brandName]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const quoteOrders = useMemo(() => orders.filter(isPaidSourceDispatchOrder), [orders]);

  const statusCounts = useMemo(() => countPaidSourceDispatchOrders(orders), [orders]);

  const filteredOrders = useMemo(
    () => quoteOrders.filter((o) => orderMatchesPaidSourceDispatchFilter(o, statusFilter)),
    [quoteOrders, statusFilter]
  );

  const switchStatus = (next: PaidSourceDispatchFilter) => {
    setStatusFilter(next);
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('orderDispatchStage');
    else url.searchParams.set('orderDispatchStage', next);
    window.history.replaceState({}, '', url);
  };

  const openOrder = (order: TaskOrder) => {
    if (['quote_open', 'quote_review'].includes(order.status)) {
      onNavigate?.('content_delivery', `order:${order.id}`);
      return;
    }
    onNavigate?.('content_delivery', `delivery:order:${order.id}`);
  };

  return (
    <GeoListPageShell
      brandLabel="查看哪个品牌"
      brandName={brandName}
      onBrandChange={onBrandChange}
      allowAllBrands
      hidePageHeader
      title="发单管理"
      description="付费信源报价任务：跟踪报价进度、比价确认与撤回"
      statusTabs={PAID_SOURCE_DISPATCH_STATUS_TABS.map((t) => ({
        id: t.id,
        label: t.label,
        count: statusCounts[t.id],
      }))}
      activeStatus={statusFilter}
      onStatusChange={(id) => switchStatus(id as PaidSourceDispatchFilter)}
    >
      <div className="geo-list-table-panel">
        {filteredOrders.length === 0 ? (
          <OrderDeliveryEmptyState kind="task" brandName={brandName} />
        ) : (
          <div className="geo-table-wrap">
            <table className="geo-table">
              <thead>
                <tr>
                  <th>任务名称</th>
                  <th>平台</th>
                  <th>报价进度</th>
                  <th>发布时间</th>
                  <th>接单方</th>
                  <th>状态</th>
                  <th className="geo-table__actions">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <p className="font-medium text-sm">{o.title}</p>
                      {brandName === '__all__' && o.brandName && (
                        <p className="text-[11px] text-[var(--neutral-text-03)]">{o.brandName}</p>
                      )}
                    </td>
                    <td className="text-xs">{o.platform}</td>
                    <td className="text-xs text-[var(--neutral-text-02)]">
                      {paidSourceQuoteProgressLabel(o)}
                    </td>
                    <td className="text-xs tabular-nums text-[var(--neutral-text-03)] whitespace-nowrap">
                      {formatTaskOrderListTime(o.createdAt)}
                    </td>
                    <td className="text-xs">{o.providerName ?? '—'}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${paidSourceDispatchRowStatusClass(o.status, o)}`}
                      >
                        {paidSourceDispatchRowStatusLabel(o)}
                      </span>
                    </td>
                    <td className="geo-table__actions">
                      <button
                        type="button"
                        className="geo-link text-xs"
                        onClick={() => openOrder(o)}
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </GeoListPageShell>
  );
}
