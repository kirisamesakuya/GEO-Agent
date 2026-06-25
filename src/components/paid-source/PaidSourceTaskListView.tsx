import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import PageHeaderWithBrand from '../common/PageHeaderWithBrand';
import { QUOTE_STATUS_LABELS } from '../../../lib/quote-order';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate: (view: ViewType, hint?: string) => void;
}

const STATUS_TABS = [
  { id: 'all', label: '全部' },
  { id: 'quote_open', label: '待报价' },
  { id: 'quote_review', label: '报价中' },
  { id: 'matched', label: '待确认' },
  { id: 'in_progress', label: '执行中' },
  { id: 'pending_review', label: '待验收' },
  { id: 'completed', label: '已完成' },
];

export default function PaidSourceTaskListView({ brandName, onBrandChange, onNavigate }: Props) {
  const [tab, setTab] = useState('all');
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const status = tab === 'all' ? '' : tab;
    const q = status ? `&status=${encodeURIComponent(status)}` : '';
    fetch(`/api/orders?brandName=${encodeURIComponent(brandName)}${q}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.orders ?? []).filter(
          (o: { pricingMode?: string }) => o.pricingMode === 'provider_quote' || !o.pricingMode
        );
        setOrders(rows);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [brandName, tab]);

  return (
    <div className="geo-page-content space-y-4">
      <PageHeaderWithBrand
        title="付费信源发单 · 任务管理"
        titleClassName="text-lg font-bold"
        brandName={brandName}
        onBrandChange={onBrandChange}
        actions={
          <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => onNavigate('create_order', 'paid_quote')}>
            新建任务
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-xs px-3 py-1.5 rounded-lg ${tab === t.id ? 'geo-nav-active' : 'geo-nav-item border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载中…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-[var(--neutral-text-03)]">暂无付费信源任务</p>
      ) : (
        <div className="geo-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[var(--neutral-text-03)]">
                <th className="p-3 font-medium">任务名称</th>
                <th className="p-3 font-medium">平台</th>
                <th className="p-3 font-medium">状态</th>
                <th className="p-3 font-medium">报价数</th>
                <th className="p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const id = String(o.id);
                const status = String(o.status ?? '');
                const quoteCount = Array.isArray(o.quotes) ? o.quotes.length : 0;
                const action =
                  status === 'quote_review' || status === 'quote_open'
                    ? '比价'
                    : status === 'pending_review'
                      ? '验收'
                      : '查看';
                return (
                  <tr key={id} className="border-b last:border-0 hover:bg-[var(--neutral-bg-02)]">
                    <td className="p-3 font-medium">{String(o.title)}</td>
                    <td className="p-3">{String(o.platform)}</td>
                    <td className="p-3">{QUOTE_STATUS_LABELS[status] ?? status}</td>
                    <td className="p-3">{quoteCount || '—'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-[var(--color-accent)] text-xs font-medium"
                              onClick={() => onNavigate('quote_detail', `order:${id}`)}
                            >
                              详情
                            </button>
                            <button
                              type="button"
                              className="text-[var(--color-accent)] text-xs font-medium"
                              onClick={() =>
                                onNavigate(
                                  action === '比价' ? 'quote_compare' : 'content_delivery',
                                  action === '比价' ? `order:${id}` : `delivery:order:${id}`
                                )
                              }
                            >
                              {action}
                            </button>
                          </div>
                        </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
