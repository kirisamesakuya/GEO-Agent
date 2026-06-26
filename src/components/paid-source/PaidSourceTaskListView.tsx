import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Inbox, Loader2, Search } from 'lucide-react';
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

function ListState({
  mode,
  title,
  description,
  action,
}: {
  mode: 'loading' | 'empty' | 'error';
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const defaults = {
    loading: { title: '加载中…', description: '正在获取任务列表' },
    empty: { title: '暂无付费信源任务', description: '可新建任务或调整筛选条件' },
    error: { title: '加载失败', description: '请检查网络后重试' },
  }[mode];

  return (
    <div className="geo-card flex flex-col items-center justify-center text-center py-14 px-6">
      {mode === 'loading' && <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin mb-3" />}
      {mode === 'empty' && <Inbox className="w-8 h-8 text-[var(--neutral-text-03)] mb-3" />}
      {mode === 'error' && <AlertCircle className="w-8 h-8 text-red-500 mb-3" />}
      <p className="text-sm font-semibold text-[var(--color-title)]">{title ?? defaults.title}</p>
      <p className="text-xs text-[var(--neutral-text-03)] mt-1 max-w-sm">{description ?? defaults.description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function PaidSourceTaskListView({ brandName, onBrandChange, onNavigate }: Props) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    const status = tab === 'all' ? '' : tab;
    const q = status ? `&status=${encodeURIComponent(status)}` : '';
    fetch(`/api/orders?brandName=${encodeURIComponent(brandName)}${q}`)
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((d) => {
        const rows = (d.orders ?? []).filter(
          (o: { pricingMode?: string }) => o.pricingMode === 'provider_quote' || !o.pricingMode
        );
        setOrders(rows);
      })
      .catch(() => {
        setOrders([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [brandName, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const title = String(o.title ?? '').toLowerCase();
      const platform = String(o.platform ?? '').toLowerCase();
      const brand = String(o.brandName ?? '').toLowerCase();
      return title.includes(q) || platform.includes(q) || brand.includes(q);
    });
  }, [orders, search]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const t of STATUS_TABS) {
      if (t.id === 'all') continue;
      counts[t.id] = orders.filter((o) => String(o.status ?? '') === t.id).length;
    }
    return counts;
  }, [orders]);

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

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--neutral-text-03)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索任务名、平台…"
            className="geo-input w-full pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-xs px-3 py-1.5 rounded-lg ${tab === t.id ? 'geo-nav-active' : 'geo-nav-item border'}`}
          >
            {t.label}
            {tabCounts[t.id] != null && tabCounts[t.id] > 0 ? ` (${tabCounts[t.id]})` : ''}
          </button>
        ))}
      </div>

      {loading && <ListState mode="loading" />}
      {!loading && error && (
        <ListState
          mode="error"
          action={
            <button type="button" className="geo-btn-primary geo-btn-sm" onClick={load}>
              重试
            </button>
          }
        />
      )}
      {!loading && !error && filtered.length === 0 && (
        <ListState
          mode="empty"
          description={search ? '没有符合搜索条件的任务' : '点击右上角新建任务，开始付费信源投放'}
          action={
            !search ? (
              <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => onNavigate('create_order', 'paid_quote')}>
                新建任务
              </button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
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
              {filtered.map((o) => {
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
