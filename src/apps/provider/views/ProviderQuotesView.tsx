import { useEffect, useState } from 'react';

interface Props {
  providerId: string;
  onSelectOrder: (id: string) => void;
}

export default function ProviderQuotesView({ providerId, onSelectOrder }: Props) {
  const [quotes, setQuotes] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch(`/api/provider/quotes?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes ?? []));
  }, [providerId]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-provider-title">我的报价</h1>
      {quotes.length === 0 ? (
        <p className="text-sm text-provider-muted">暂无报价记录</p>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const order = q.order as { id?: string; title?: string; brandName?: string; status?: string } | undefined;
            return (
              <div key={String(q.id)} className="provider-card rounded-xl p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-provider-title">{order?.title ?? '任务'}</p>
                  <p className="text-xs text-provider-muted mt-1">
                    {order?.brandName} · 到手 ¥{String(q.providerExpectedIncomeYuan ?? '—')} · G ¥
                    {String(q.publisherPayAmountYuan ?? '—')}
                  </p>
                  <p className="text-[10px] text-provider-muted mt-1">状态：{String(q.status)}</p>
                </div>
                {order?.id && (
                  <button
                    type="button"
                    className="text-xs text-brand font-medium"
                    onClick={() => onSelectOrder(order.id!)}
                  >
                    查看订单
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
