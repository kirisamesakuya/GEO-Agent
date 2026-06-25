import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { parseTaskBrief, type PaidSourceTaskBrief } from '../../../lib/paid-source-brief';
import { parseTaskOrderIdFromHint } from '../../lib/website-requirement-nav';
import {
  paidSourceDispatchRowStatusClass,
  paidSourceDispatchRowStatusLabel,
} from '../../lib/paid-source-dispatch-filters';
import { formatTaskOrderListTime } from '../../lib/task-order-flow';

interface QuoteRow {
  id: string;
  providerId: string;
  providerName: string;
  publisherPayAmountYuan?: string;
  publisherPayAmountCents: number;
  mediaName?: string | null;
  estimatedPublishAt?: string | null;
  deliveryPromise?: string | null;
  message?: string | null;
  includeLink: boolean;
  includeScreenshot: boolean;
  includeIndexingProof: boolean;
  status: string;
}

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
  quotes?: QuoteRow[];
  pricingMode?: string;
}

interface Props {
  brandName: string;
  onBrandChange?: (name: string) => void;
  orderHint?: string;
  onNavigate: (view: ViewType, hint?: string) => void;
  /** 嵌入内容交付 · 发单管理时隐藏独立页头 */
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

function formatEarliestOnline(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `前 ${d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
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
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/orders/${orderId}?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        const o = d.order ?? null;
        setOrder(o);
        const firstPending = (o?.quotes ?? []).find((q: QuoteRow) => q.status === 'pending');
        if (firstPending) setSelectedQuoteId(firstPending.id);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId, brandName]);

  const brief = useMemo(
    () => parseTaskBrief(order?.taskBriefJson),
    [order?.taskBriefJson]
  );

  const pendingQuotes = (order?.quotes ?? []).filter((q) => q.status === 'pending');
  const selectedQuote = pendingQuotes.find((q) => q.id === selectedQuoteId) ?? null;

  const pendingCount = pendingQuotes.length;
  const canConfirm = ['quote_open', 'quote_review'].includes(order?.status ?? '');

  const handleConfirm = async () => {
    if (!orderId || !selectedQuote) return;
    const g =
      selectedQuote.publisherPayAmountYuan ??
      (selectedQuote.publisherPayAmountCents / 100).toFixed(2);
    if (!confirm(`确认选用「${selectedQuote.providerName}」的报价并冻结 ¥${g}？`)) return;
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

  const backToList = () => {
    onNavigate('content_delivery', 'order_manage');
  };

  if (loading) {
    return (
      <div className={embedded ? 'px-6 py-8' : 'geo-page-content'}>
        <p className="text-sm text-[var(--neutral-text-03)]">加载报价…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={embedded ? 'px-6 py-8' : 'geo-page-content'}>
        <p className="text-sm text-[var(--neutral-text-03)]">任务不存在或无权查看</p>
        <button type="button" className="geo-link text-sm mt-2" onClick={backToList}>
          返回发单管理
        </button>
      </div>
    );
  }

  const contentDirection =
    brief?.contentDirection ??
    order.contentDirection ??
    brief?.taskType ??
    order.deliverable ??
    '—';
  const publishRequirements =
    brief?.deliveryNote ??
    ([order.deliverable, brief?.wordCountRange, brief?.publishDeadline].filter(Boolean).join(' · ') ||
      '—');
  const deliveryProof = deliveryProofFromBrief(brief, order.acceptance);

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
              <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]">
                服务商
              </span>
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
              {pendingCount > 0 ? `已收 ${pendingCount} 份报价` : '暂无报价'}
              {order.createdAt ? ` · 发布于 ${formatTaskOrderListTime(order.createdAt)}` : ''}
            </p>
          </div>
          {!embedded && (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm"
              onClick={() => onNavigate('quote_detail', orderHint)}
            >
              交付信息
            </button>
          )}
        </div>
      </div>

      <div className={embedded ? 'px-6 space-y-4 pb-28' : 'space-y-4'}>
        <section className="geo-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-title)]">任务要求与报价</h3>
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
              <p className="text-xs text-[var(--neutral-text-03)] mb-1">交付证明</p>
              <p className="text-[var(--neutral-text-02)] leading-relaxed">{deliveryProof}</p>
            </div>
          </div>
        </section>

        <div className="geo-card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b text-left text-[var(--neutral-text-03)]">
                <th className="p-3 w-10" />
                <th className="p-3 font-medium">接单方</th>
                <th className="p-3 font-medium">可发媒体</th>
                <th className="p-3 font-medium">报价金额</th>
                <th className="p-3 font-medium">最早上线</th>
                <th className="p-3 font-medium">说明</th>
                <th className="p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {pendingQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--neutral-text-03)]">
                    暂无待确认报价，请等待接单方提交
                  </td>
                </tr>
              ) : (
                pendingQuotes.map((q) => {
                  const g =
                    q.publisherPayAmountYuan ??
                    (q.publisherPayAmountCents / 100).toFixed(2);
                  const selected = selectedQuoteId === q.id;
                  return (
                    <tr
                      key={q.id}
                      className={`border-b last:border-0 transition-colors ${
                        selected ? 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-200' : ''
                      }`}
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
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-medium">
                          {q.providerName}
                          <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-label="企业认证" />
                        </div>
                      </td>
                      <td className="p-3 text-xs text-[var(--neutral-text-02)] max-w-[200px]">
                        {q.mediaName ?? '—'}
                      </td>
                      <td className="p-3 font-semibold text-[var(--color-accent)] whitespace-nowrap">
                        ¥ {Number(g).toLocaleString('zh-CN')}
                        <span className="text-[10px] font-normal text-[var(--neutral-text-03)] ml-1">
                          含税
                        </span>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        {formatEarliestOnline(q.estimatedPublishAt)}
                      </td>
                      <td className="p-3 text-xs text-[var(--neutral-text-02)] max-w-[220px]">
                        {q.message ?? q.deliveryPromise ?? '—'}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          className={`text-xs font-medium ${selected ? 'text-emerald-700' : 'text-[var(--color-accent)]'}`}
                          onClick={() => setSelectedQuoteId(q.id)}
                        >
                          {selected ? '已选用' : '选用此报价'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canConfirm && pendingQuotes.length > 0 && (
        <div
          className={`${
            embedded ? 'fixed bottom-0 left-0 right-0 z-20' : 'sticky bottom-0'
          } border-t bg-white/95 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-3`}
          style={{ borderColor: 'var(--neutral-divider-02)' }}
        >
          <p className="text-sm text-[var(--neutral-text-02)]">
            {selectedQuote ? (
              <>
                已选报价：
                <span className="font-medium text-[var(--color-title)]">
                  {selectedQuote.providerName}
                </span>
                {' · '}
                <span className="font-semibold text-[var(--color-accent)]">
                  ¥{' '}
                  {(
                    selectedQuote.publisherPayAmountYuan ??
                    (selectedQuote.publisherPayAmountCents / 100).toFixed(2)
                  ).toLocaleString('zh-CN')}
                </span>
                {selectedQuote.estimatedPublishAt && (
                  <>
                    {' · '}
                    最早{' '}
                    {new Date(selectedQuote.estimatedPublishAt).toLocaleDateString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                    })}{' '}
                    上线
                  </>
                )}
              </>
            ) : (
              '请选择一份报价'
            )}
          </p>
          <button
            type="button"
            className="geo-btn-primary"
            disabled={!selectedQuote || accepting}
            onClick={() => void handleConfirm()}
          >
            {accepting ? '处理中…' : '确认发布'}
          </button>
        </div>
      )}
    </div>
  );
}
