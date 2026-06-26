import { useState, useEffect, useMemo } from 'react';
import type { ViewType } from '../types';
import GeoListPageShell from './common/GeoListPageShell';
import OrderDeliveryEmptyState from './common/OrderDeliveryEmptyState';
import {
  formatTaskOrderListTime,
  isArticleContentOrder,
  taskOrderStatusClass,
  taskOrderStatusLabel,
} from '../lib/task-order-flow';
import { type OrderTypeFilter } from '../lib/order-delivery-filters';
import {
  deriveWebsiteRequirementStatus,
  hasWebsiteGeoAnalysisNotes,
  WEBSITE_REQUIREMENT_STATUS_TABS,
  WEBSITE_REQUIREMENT_STATUS_LABEL,
  type WebsiteRequirementRow,
  type WebsiteRequirementStatusFilter,
  parseWebsiteRequirementStatusFromUrl,
  websiteRequirementDetailHint,
  taskOrderDetailHint,
} from '../lib/website-requirement-nav';
import { syncContentDeliveryUrl } from '../lib/content-delivery-nav';
import { formatWebsiteLeadListLabel } from '../../lib/website-lead-intake';

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

type MainTab = 'task' | 'website';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  initialOrderId?: string;
  initialMainTab?: MainTab;
  /** 嵌入内容交付时锁定分区并隐藏内层 Tab */
  embeddedTab?: MainTab;
  pageTitle?: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function OrderDeliveryView({
  brandName,
  onBrandChange,
  initialOrderId,
  initialMainTab,
  embeddedTab,
  pageTitle = '任务交付',
  onNavigate,
}: Props) {
  const [tab, setTab] = useState<MainTab>(
    embeddedTab ?? (initialMainTab === 'website' ? 'website' : 'task')
  );
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [requirements, setRequirements] = useState<WebsiteRequirementRow[]>([]);
  const [websiteStatusFilter, setWebsiteStatusFilter] = useState<WebsiteRequirementStatusFilter>(
    parseWebsiteRequirementStatusFromUrl()
  );

  const ordersQuery = () =>
    brandName === '__all__' ? '/api/orders' : `/api/orders?brandName=${encodeURIComponent(brandName)}`;

  const loadTaskOrders = () => {
    fetch(ordersQuery())
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  };

  const loadRequirements = () => {
    if (brandName === '__all__') {
      setRequirements([]);
      return;
    }
    fetch(`/api/website-requests?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setRequirements(d.requests ?? []));
  };

  useEffect(() => {
    if (tab === 'task') loadTaskOrders();
    else loadRequirements();
  }, [brandName, tab]);

  useEffect(() => {
    if (embeddedTab) setTab(embeddedTab);
    else if (initialMainTab === 'website') setTab('website');
    else if (initialMainTab === 'task') setTab('task');
  }, [embeddedTab, initialMainTab]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (typeFilter === 'article') return isArticleContentOrder(o);
      if (typeFilter === 'non_article') return !isArticleContentOrder(o);
      return true;
    });
  }, [orders, typeFilter]);

  const filteredRequirements = useMemo(() => {
    if (websiteStatusFilter === 'all') return requirements;
    return requirements.filter((r) => deriveWebsiteRequirementStatus(r) === websiteStatusFilter);
  }, [requirements, websiteStatusFilter]);

  const displayWebsiteStatus = (req: WebsiteRequirementRow) => {
    const st = deriveWebsiteRequirementStatus(req);
    if (st === 'all') return '—';
    return WEBSITE_REQUIREMENT_STATUS_LABEL[st];
  };

  const switchTab = (next: MainTab) => {
    setTab(next);
    if (embeddedTab) {
      syncContentDeliveryUrl(next === 'website' ? 'website' : 'article');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'order_delivery');
    url.searchParams.set('orderTab', next);
    window.history.replaceState({}, '', url);
  };

  const switchWebsiteStatus = (next: WebsiteRequirementStatusFilter) => {
    setWebsiteStatusFilter(next);
    const url = new URL(window.location.href);
    url.searchParams.set('orderTab', 'website');
    if (next === 'all') url.searchParams.delete('websiteStatus');
    else url.searchParams.set('websiteStatus', next);
    window.history.replaceState({}, '', url);
  };

  const taskTypeTabs = [
    { id: 'all', label: '全部类型' },
    { id: 'article', label: '文章类' },
    { id: 'non_article', label: '非文章' },
  ] as const;

  return (
    <>
      <GeoListPageShell
        brandLabel="查看哪个品牌的任务"
        brandName={brandName}
        onBrandChange={onBrandChange}
        allowAllBrands
        hidePageHeader={Boolean(embeddedTab)}
        title={pageTitle}
        sectionTabs={
          embeddedTab
            ? undefined
            : [
                { id: 'task', label: '接单任务' },
                { id: 'website', label: '网页需求' },
              ]
        }
        activeSection={tab}
        onSectionChange={embeddedTab ? undefined : (id) => switchTab(id as MainTab)}
        statusTabs={
          tab === 'website'
            ? WEBSITE_REQUIREMENT_STATUS_TABS.map((t) => ({ id: t.id, label: t.label }))
            : taskTypeTabs.map((t) => ({ id: t.id, label: t.label }))
        }
        activeStatus={tab === 'website' ? websiteStatusFilter : typeFilter}
        onStatusChange={(id) => {
          if (tab === 'website') switchWebsiteStatus(id as WebsiteRequirementStatusFilter);
          else setTypeFilter(id as OrderTypeFilter);
        }}
      >
        <div className="geo-list-table-panel">
          {tab === 'task' ? (
            filteredOrders.length === 0 ? (
              <OrderDeliveryEmptyState kind="task" brandName={brandName} />
            ) : (
              <div className="geo-table-wrap">
                <table className="geo-table">
                  <thead>
                    <tr>
                      <th>任务</th>
                      <th>平台</th>
                      <th>预算</th>
                      <th>发单时间</th>
                      <th>状态</th>
                      <th className="geo-table__actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <p className="font-medium text-sm">{o.title}</p>
                          <p className="text-[11px] text-[var(--neutral-text-03)]">
                            {o.providerName ?? '待接单'}
                            {brandName === '__all__' && o.brandName ? ` · ${o.brandName}` : ''}
                          </p>
                        </td>
                        <td className="text-xs">{o.platform}</td>
                        <td className="text-xs tabular-nums">¥{o.budget}</td>
                        <td className="text-xs tabular-nums text-[var(--neutral-text-03)] whitespace-nowrap">
                          {formatTaskOrderListTime(o.createdAt)}
                        </td>
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
                              onNavigate?.(
                                embeddedTab ? 'content_delivery' : 'order_delivery',
                                taskOrderDetailHint(o.id)
                              )
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
            )
          ) : brandName === '__all__' ? (
            <p className="p-6 text-sm text-[var(--neutral-text-03)]">请选择具体品牌查看网页需求</p>
          ) : filteredRequirements.length === 0 ? (
            <OrderDeliveryEmptyState kind="website" brandName={brandName} />
          ) : (
            <div className="geo-table-wrap">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>页面类型</th>
                    <th>目标关键词</th>
                    <th>分析报告</th>
                    <th>状态</th>
                    <th>提交时间</th>
                    <th className="geo-table__actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium text-sm">{r.pageType}</td>
                        <td className="text-xs max-w-xs truncate">{formatWebsiteLeadListLabel(r)}</td>
                        <td className="text-xs">
                          {hasWebsiteGeoAnalysisNotes(r.notes) ? (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                              含分析
                            </span>
                          ) : (
                            <span className="text-[var(--neutral-text-04)]">—</span>
                          )}
                        </td>
                        <td className="text-xs">{displayWebsiteStatus(r)}</td>
                        <td className="text-xs tabular-nums">
                          {new Date(r.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </td>
                        <td className="geo-table__actions">
                          <button
                            type="button"
                            className="geo-link text-xs"
                            onClick={() =>
                              onNavigate?.(
                                embeddedTab ? 'content_delivery' : 'order_delivery',
                                websiteRequirementDetailHint(r.id)
                              )
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
    </>
  );
}
