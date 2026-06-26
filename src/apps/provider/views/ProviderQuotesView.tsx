import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  QUOTE_FUNNEL_TABS,
  QUOTE_STATUS_LABEL,
  classifyQuoteTab,
  type ProviderQuoteRowVm,
  type ProviderQuoteFunnelTab,
} from '../lib/provider-view-models';
import ProviderPageHeader from '../components/workspace/ProviderPageHeader';
import ProviderStatusTabs from '../components/workspace/ProviderStatusTabs';
import ProviderWorkbenchState from '../components/workspace/ProviderWorkbenchState';

interface Props {
  providerId: string;
  onSelectOrder: (id: string) => void;
}

export default function ProviderQuotesView({ providerId, onSelectOrder }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<ProviderQuoteFunnelTab | ''>('');
  const [quotes, setQuotes] = useState<ProviderQuoteRowVm[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/provider/quotes?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setQuotes((d.quotes ?? []) as ProviderQuoteRowVm[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [providerId]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { '': quotes.length };
    for (const q of quotes) {
      const key = classifyQuoteTab(q);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [quotes]);

  const filtered = useMemo(() => {
    if (!tab) return quotes;
    return quotes.filter((q) => classifyQuoteTab(q) === tab);
  }, [quotes, tab]);

  const tabs = QUOTE_FUNNEL_TABS.map((t) => ({
    ...t,
    count: tabCounts[t.id || ''] ?? (t.id === '' ? quotes.length : 0),
  }));

  return (
    <div className="space-y-2">
      <ProviderPageHeader
        title="我的报价"
        subtitle="按报价生命周期管理：待确认、已中标、未中标、已过期与已转订单。便于跟进品牌决策与后续履约。"
      />

      <ProviderStatusTabs tabs={tabs} active={tab} onChange={(id) => setTab(id as ProviderQuoteFunnelTab | '')} />

      {loading && <ProviderWorkbenchState mode="loading" />}
      {!loading && error && <ProviderWorkbenchState mode="error" />}
      {!loading && !error && filtered.length === 0 && (
        <ProviderWorkbenchState
          mode="empty"
          title={tab ? '该状态下暂无报价' : '还没有提交过报价'}
          description="前往任务大厅发现匹配任务，填写 P0 到手价提交结构化方案"
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="provider-section-card overflow-hidden p-0">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_100px] gap-2 px-4 py-2.5 bg-provider-subtle text-[10px] font-semibold text-provider-muted uppercase tracking-wide">
            <span>任务</span>
            <span>到手 P0 / 成交价 G</span>
            <span>报价状态</span>
            <span>提交时间</span>
            <span className="text-right">操作</span>
          </div>
          <div className="divide-y divide-provider-subtle">
            {filtered.map((q) => {
              const funnel = classifyQuoteTab(q);
              const statusLabel =
                funnel === 'expired'
                  ? '已过期'
                  : funnel === 'ordered'
                    ? '已转订单'
                    : QUOTE_STATUS_LABEL[q.status] ?? q.status;
              return (
                <div
                  key={q.id}
                  className="grid grid-cols-[1.4fr_1fr_1fr_1fr_100px] gap-2 px-4 py-3 items-center text-sm hover:bg-provider-subtle/50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-provider-title truncate">{q.order?.title ?? '任务'}</p>
                    <p className="text-[11px] text-provider-muted mt-0.5 truncate">
                      {q.order?.brandName ?? '—'} · {q.order?.platform ?? '—'}
                    </p>
                  </div>
                  <div className="text-xs">
                    <p className="font-mono text-provider-title">P0 ¥{q.providerExpectedIncomeYuan}</p>
                    <p className="font-mono text-provider-muted mt-0.5">G ¥{q.publisherPayAmountYuan}</p>
                  </div>
                  <div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        funnel === 'accepted' || funnel === 'ordered'
                          ? 'bg-green-50 text-green-700'
                          : funnel === 'pending'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-provider-subtle text-provider-secondary'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-provider-muted">
                    {q.createdAt
                      ? new Date(q.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                  <div className="text-right">
                    {q.order?.id && (funnel === 'ordered' || funnel === 'accepted') ? (
                      <button
                        type="button"
                        className="text-xs text-workbench font-medium inline-flex items-center gap-0.5"
                        onClick={() => onSelectOrder(q.order!.id!)}
                      >
                        订单 <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-provider-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
