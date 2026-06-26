import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, ShieldAlert, Star, ExternalLink } from 'lucide-react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { parseTaskBrief, type PaidSourceTaskBrief } from '../../../lib/paid-source-brief';
import { parseTaskOrderIdFromHint } from '../../lib/website-requirement-nav';
import {
  paidSourceDispatchRowStatusClass,
  paidSourceDispatchRowStatusLabel,
} from '../../lib/paid-source-dispatch-filters';
import { formatTaskOrderListTime } from '../../lib/task-order-flow';
import {
  mapQuoteCompareRows,
  type QuoteCompareRowViewModel,
  type RawPublisherQuoteRow,
} from '../../lib/view-models/quote-compare';

interface OrderData {
  id?: string;
  title?: string;
  platform?: string;
  status?: string;
  createdAt?: string;
  deliverable?: string;
  acceptance?: string;
  contentDirection?: string;
  taskBriefJson?: string;
  quotes?: RawPublisherQuoteRow[];
  suggestedMinCents?: number | null;
  suggestedMaxCents?: number | null;
}

interface Props {
  brandName: string;
  onBrandChange?: (name: string) => void;
  orderHint?: string;
  onNavigate: (view: ViewType, hint?: string) => void;
  embedded?: boolean;
}

function deliveryProofFromBrief(brief: PaidSourceTaskBrief | null, acceptance?: string) {
  if (brief) {
    const parts: string[] = [];
    if (brief.requireLink) parts.push('文章链接（必填）');
    if (brief.requireScreenshot) parts.push('媒体截图（必填）');
    if (brief.requireIndexingProof) parts.push('收录证明（选填）');
    if (parts.length) return parts.join('、');
  }
  return acceptance || '—';
}

function formatSuggestedRange(minCents?: number | null, maxCents?: number | null) {
  if (minCents == null || maxCents == null) return null;
  return `¥${(minCents / 100).toLocaleString()} – ¥${(maxCents / 100).toLocaleString()}（到手价参考）`;
}

export default function QuoteCompareView({
  brandName,
  orderHint,
  onNavigate,
  embedded = false,
}: Props) {
  const { toast } = useToast();
  const orderId = parseTaskOrderIdFromHint(orderHint) ?? orderHint?.replace(/^order:/, '');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setError(false);
    fetch(`/api/orders/${orderId}?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => {
        if (!r.ok) throw new Error('load failed');
        return r.json();
      })
      .then((d) => {
        const o = d.order ?? null;
        setOrder(o);
        const firstPending = (o?.quotes ?? []).find((q: RawPublisherQuoteRow) => q.status === 'pending');
        if (firstPending) setSelectedQuoteId(firstPending.id);
      })
      .catch(() => {
        setOrder(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [orderId, brandName]);

  const brief = useMemo(() => parseTaskBrief(order?.taskBriefJson), [order?.taskBriefJson]);

  const quoteRows: QuoteCompareRowViewModel[] = useMemo(() => {
    const pending = (order?.quotes ?? []).filter((q) => q.status === 'pending');
    return mapQuoteCompareRows(pending);
  }, [order?.quotes]);

  const selectedQuote = quoteRows.find((q) => q.id === selectedQuoteId) ?? null;
  const canConfirm = ['quote_open', 'quote_review'].includes(order?.status ?? '');

  const handleConfirm = async () => {
    if (!orderId || !selectedQuote) return;
    if (
      !confirm(
        `确认选用「${selectedQuote.providerName}」的方案并冻结 ¥${Number(selectedQuote.publisherPayAmountYuan).toLocaleString('zh-CN')}？`
      )
    ) {
      return;
    }
    setAccepting(true);
    try {
      const r = await fetch(`/api/orders/${orderId}/quotes/${selectedQuote.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: `${orderId}:${selectedQuote.id}` }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? '确认失败');
      toast('已确认报价，任务进入执行阶段', 'success');
      onNavigate('content_delivery', `delivery:order:${orderId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '确认失败', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const backToList = () => onNavigate('content_delivery', 'order_manage');

  if (loading) {
    return (
      <div className={embedded ? 'px-6 py-8' : 'geo-page-content'}>
        <p className="text-sm text-[var(--neutral-text-03)]">加载报价…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={embedded ? 'px-6 py-8' : 'geo-page-content'}>
        <p className="text-sm text-[var(--neutral-text-03)]">
          {error ? '加载失败，请稍后重试' : '任务不存在或无权查看'}
        </p>
        <button type="button" className="geo-link text-sm mt-2" onClick={backToList}>
          返回发单管理
        </button>
      </div>
    );
  }

  const contentDirection =
    brief?.contentDirection ?? order.contentDirection ?? brief?.taskType ?? order.deliverable ?? '—';
  const publishRequirements =
    brief?.deliveryNote ??
    ([order.deliverable, brief?.wordCountRange, brief?.publishDeadline].filter(Boolean).join(' · ') || '—');
  const deliveryProof = deliveryProofFromBrief(brief, order.acceptance);
  const suggestedRange = formatSuggestedRange(order.suggestedMinCents, order.suggestedMaxCents);

  return (
    <div className={embedded ? 'flex flex-col min-h-0' : 'geo-page-content space-y-4'}>
      <div className={embedded ? 'px-6 pt-4 pb-0' : undefined}>
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--neutral-text-03)] hover:text-[var(--color-title)] mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回发单管理
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-title)]">{order.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {order.platform && (
                <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-sky-50 text-sky-700">
                  {order.platform}
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${paidSourceDispatchRowStatusClass(order.status ?? '', order)}`}
              >
                {paidSourceDispatchRowStatusLabel(order)}
              </span>
            </div>
            <p className="text-xs text-[var(--neutral-text-03)] mt-2">
              {quoteRows.length > 0 ? `已收 ${quoteRows.length} 份待确认报价` : '暂无报价，等待接单方提交'}
              {order.createdAt ? ` · 发布于 ${formatTaskOrderListTime(order.createdAt)}` : ''}
            </p>
            {suggestedRange && (
              <p className="text-xs text-sky-700 mt-1 bg-sky-50 inline-block px-2 py-1 rounded-lg">
                平台建议区间 {suggestedRange} · 仅作参考，不展示给接单方您的预算上限
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={embedded ? 'px-6 space-y-4 pb-36' : 'space-y-4'}>
        <section className="geo-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-title)]">任务要求</h3>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-[var(--neutral-text-03)] mb-1">内容方向</p>
              <p className="text-[var(--neutral-text-02)] leading-relaxed">{contentDirection}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--neutral-text-03)] mb-1">发布要求</p>
              <p className="text-[var(--neutral-text-02)] leading-relaxed">{publishRequirements}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--neutral-text-03)] mb-1">验收 / 交付证明</p>
              <p className="text-[var(--neutral-text-02)] leading-relaxed">{deliveryProof}</p>
            </div>
          </div>
        </section>

        {selectedQuote && (
          <section className="geo-card p-4 border border-emerald-200 bg-emerald-50/40">
            <h3 className="text-sm font-semibold text-[var(--color-title)] mb-2">当前选用方案</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <p className="text-[var(--neutral-text-03)]">接单方</p>
                <p className="font-medium mt-0.5">{selectedQuote.providerName}</p>
              </div>
              <div>
                <p className="text-[var(--neutral-text-03)]">成交支付价 G</p>
                <p className="font-semibold text-[var(--color-accent)] mt-0.5">
                  ¥ {Number(selectedQuote.publisherPayAmountYuan).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-[var(--neutral-text-03)]">最早上线</p>
                <p className="mt-0.5">{selectedQuote.earliestOnlineLabel}</p>
              </div>
              <div>
                <p className="text-[var(--neutral-text-03)]">交付承诺</p>
                <p className="mt-0.5">{selectedQuote.deliveryPromiseLabel}</p>
              </div>
            </div>
            <p className="text-[10px] text-[var(--neutral-text-03)] mt-2">
              确认后将冻结对应金额并开始履约；不向发布方展示接单方到手价 P0 与平台服务费 F。
            </p>
          </section>
        )}

        <div className="geo-card overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b text-left text-[var(--neutral-text-03)]">
                <th className="p-3 w-10" />
                <th className="p-3 font-medium">接单方</th>
                <th className="p-3 font-medium">认证</th>
                <th className="p-3 font-medium">可发媒体</th>
                <th className="p-3 font-medium">成交价 G</th>
                <th className="p-3 font-medium">最早上线</th>
                <th className="p-3 font-medium">交付承诺</th>
                <th className="p-3 font-medium">履约表现</th>
              </tr>
            </thead>
            <tbody>
              {quoteRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-[var(--neutral-text-03)]">
                    暂无待确认报价，请等待接单方在任务大厅提交方案
                  </td>
                </tr>
              ) : (
                quoteRows.map((q) => {
                  const selected = selectedQuoteId === q.id;
                  return (
                    <tr
                      key={q.id}
                      className={`border-b last:border-0 transition-colors cursor-pointer ${
                        selected ? 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-200' : 'hover:bg-[var(--neutral-bg-02)]'
                      }`}
                      onClick={() => setSelectedQuoteId(q.id)}
                    >
                      <td className="p-3">
                        <input
                          type="radio"
                          name="selected-quote"
                          checked={selected}
                          onChange={() => setSelectedQuoteId(q.id)}
                          className="accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="p-3 font-medium">{q.providerName}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                            q.verified ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {q.verified ? (
                            <BadgeCheck className="w-3 h-3 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                          )}
                          {q.verificationLabel}
                        </span>
                      </td>
                      <td className="p-3 text-xs max-w-[160px]">
                        <div className="font-medium truncate" title={q.mediaLabel}>{q.mediaLabel}</div>
                        {q.mediaAccountLink && (
                          <a
                            href={q.mediaAccountLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-sky-600 hover:text-sky-700 mt-1"
                          >
                            查看主页
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-[var(--color-accent)] whitespace-nowrap">
                        ¥ {Number(q.publisherPayAmountYuan).toLocaleString('zh-CN')}
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">{q.earliestOnlineLabel}</td>
                      <td className="p-3 text-xs max-w-[180px]">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {q.deliveryProofTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--neutral-bg-03)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {q.message && (
                          <p className="text-[var(--neutral-text-03)] truncate" title={q.message}>
                            {q.message}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        <div className="flex items-center gap-1 text-[var(--neutral-text-02)]">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {q.fulfillmentScore}
                        </div>
                        <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5">
                          {q.fulfillmentSummary}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canConfirm && quoteRows.length > 0 && (
        <div
          className={`${
            embedded ? 'fixed bottom-0 left-0 right-0 z-20' : 'sticky bottom-0'
          } border-t bg-white/95 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-3`}
          style={{ borderColor: 'var(--neutral-divider-02)' }}
        >
          <p className="text-sm text-[var(--neutral-text-02)]">
            {selectedQuote ? (
              <>
                将冻结{' '}
                <span className="font-semibold text-[var(--color-accent)]">
                  ¥ {Number(selectedQuote.publisherPayAmountYuan).toLocaleString('zh-CN')}
                </span>
                {' · '}
                {selectedQuote.providerName}
              </>
            ) : (
              '请选择一份报价方案'
            )}
          </p>
          <button
            type="button"
            className="geo-btn-primary"
            disabled={!selectedQuote || accepting}
            onClick={() => void handleConfirm()}
          >
            {accepting ? '处理中…' : '确认选用并冻结预算'}
          </button>
        </div>
      )}
    </div>
  );
}
