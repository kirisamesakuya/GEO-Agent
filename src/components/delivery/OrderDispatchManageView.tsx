import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ViewType } from '../../types';
import GeoListPageShell from '../common/GeoListPageShell';
import OrderDeliveryEmptyState from '../common/OrderDeliveryEmptyState';
import {
  formatTaskOrderListTime,
  isArticleContentOrder,
  taskOrderStatusClass,
  taskOrderStatusLabel,
} from '../../lib/task-order-flow';
import {
  ORDER_DISPATCH_STATUS_TABS,
  countOrdersByDispatchFilter,
  orderMatchesDispatchFilter,
  parseOrderDispatchStageFromUrl,
  type OrderDispatchStatusFilter,
} from '../../lib/order-delivery-filters';
import { taskOrderDetailHint } from '../../lib/website-requirement-nav';

interface TaskOrder {
  id: string;
  brandName?: string;
  title: string;
  platform: string;
  budget: number;
  status: string;
  providerName?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialStatusFilter?: OrderDispatchStatusFilter;
}

export default function OrderDispatchManageView({
  brandName,
  onBrandChange,
  onNavigate,
  initialStatusFilter,
}: Props) {
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderDispatchStatusFilter>(
    initialStatusFilter ?? parseOrderDispatchStageFromUrl()
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

  const articleOrders = useMemo(
    () => orders.filter((o) => isArticleContentOrder(o)),
    [orders]
  );

  const statusCounts = useMemo(
    () => countOrdersByDispatchFilter(articleOrders),
    [articleOrders]
  );

  const filteredOrders = useMemo(
    () => articleOrders.filter((o) => orderMatchesDispatchFilter(o.status, statusFilter)),
    [articleOrders, statusFilter]
  );

  const switchStatus = (next: OrderDispatchStatusFilter) => {
    setStatusFilter(next);
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('orderDispatchStage');
    else url.searchParams.set('orderDispatchStage', next);
    window.history.replaceState({}, '', url);
  };

  return (
    <GeoListPageShell
      brandLabel="查看哪个品牌"
      brandName={brandName}
      onBrandChange={onBrandChange}
      allowAllBrands
      hidePageHeader
      title="发单管理"
      description="发单后在此跟踪待接单与撤回；服务商接单后任务进入「文章交付」"
      statusTabs={ORDER_DISPATCH_STATUS_TABS.map((t) => ({
        id: t.id,
        label: t.label,
        count: statusCounts[t.id],
      }))}
      activeStatus={statusFilter}
      onStatusChange={(id) => switchStatus(id as OrderDispatchStatusFilter)}
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
                  <th>预算</th>
                  <th>发单时间</th>
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
                    <td className="text-xs tabular-nums">¥{o.budget}</td>
                    <td className="text-xs tabular-nums text-[var(--neutral-text-03)] whitespace-nowrap">
                      {formatTaskOrderListTime(o.createdAt)}
                    </td>
                    <td className="text-xs">{o.providerName ?? '—'}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${taskOrderStatusClass(o.status)}`}
                      >
                        {taskOrderStatusLabel(o.status)}
                      </span>
                    </td>
                    <td className="geo-table__actions">
                      <button
                        type="button"
                        className="geo-link text-xs"
                        onClick={() =>
                          onNavigate?.('content_delivery', taskOrderDetailHint(o.id))
                        }
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
