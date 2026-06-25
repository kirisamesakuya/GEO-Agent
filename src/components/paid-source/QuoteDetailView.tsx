import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import PageHeaderWithBrand from '../common/PageHeaderWithBrand';
import { parseTaskOrderIdFromHint } from '../../lib/website-requirement-nav';

interface QuoteDetail {
  id: string;
  providerId: string;
  providerName: string;
  publisherPayAmountYuan?: string;
  publisherPayAmountCents: number;
  mediaName?: string | null;
  estimatedPublishAt?: string | null;
  deliveryPromise?: string | null;
  message?: string | null;
  status?: string;
  providerProfile?: {
    caseLinks?: string[];
    industryTags?: string[];
    platforms?: string[];
    resourceNote?: string;
  };
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  orderHint?: string;
  onNavigate: (view: ViewType, hint?: string) => void;
}

export default function QuoteDetailView({ brandName, onBrandChange, orderHint, onNavigate }: Props) {
  const orderId = parseTaskOrderIdFromHint(orderHint) ?? orderHint?.replace(/^order:/, '');
  const [order, setOrder] = useState<{ title?: string; quotes?: QuoteDetail[] } | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then(async (d) => {
        const base = d.order;
        if (!base?.quotes?.length) {
          setOrder(base);
          return;
        }
        const enriched = await Promise.all(
          base.quotes.map(async (q: QuoteDetail) => {
            try {
              const pr = await fetch(`/api/providers/${q.providerId}`);
              const pd = await pr.json();
              const p = pd.provider;
              let caseLinks: string[] = [];
              let platforms: string[] = [];
              let industryTags: string[] = [];
              if (p?.caseLinks) {
                try {
                  caseLinks = JSON.parse(p.caseLinks);
                } catch {
                  caseLinks = [];
                }
              }
              if (p?.platforms) {
                try {
                  platforms = JSON.parse(p.platforms);
                } catch {
                  platforms = [];
                }
              }
              if (p?.industryTags) {
                try {
                  industryTags = JSON.parse(p.industryTags);
                } catch {
                  industryTags = [];
                }
              }
              return {
                ...q,
                providerProfile: {
                  caseLinks,
                  platforms,
                  industryTags,
                  resourceNote: p?.capabilities ?? '',
                },
              };
            } catch {
              return q;
            }
          })
        );
        setOrder({ ...base, quotes: enriched });
      })
      .catch(() => setOrder(null));
  }, [orderId, brandName]);

  const handleAccept = async (quoteId: string, gYuan: string) => {
    if (!orderId || !confirm(`确认并冻结 ¥${gYuan}？`)) return;
    setAccepting(quoteId);
    try {
      const r = await fetch(`/api/orders/${orderId}/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: `${orderId}:${quoteId}` }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? '确认失败');
      onNavigate('content_delivery', `delivery:order:${orderId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '确认失败');
    } finally {
      setAccepting(null);
    }
  };

  const pending = (order?.quotes ?? []).filter((q) => q.status === 'pending' || !('status' in q));

  return (
    <div className="geo-page-content space-y-4">
      <PageHeaderWithBrand
        title={`报价详情${order?.title ? `：${order.title}` : ''}`}
        titleClassName="text-lg font-bold"
        brandName={brandName}
        onBrandChange={onBrandChange}
        actions={
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm"
            onClick={() => onNavigate('quote_compare', orderHint)}
          >
            表格比价
          </button>
        }
      />

      <div className="space-y-4">
        {(order?.quotes ?? pending).map((q) => {
          const g =
            q.publisherPayAmountYuan ?? (q.publisherPayAmountCents / 100).toFixed(2);
          const profile = q.providerProfile;
          return (
            <div key={q.id} className="geo-card p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{q.providerName}</h3>
                <span className="text-[var(--color-accent)] font-bold">成交支付价 G：¥{g}</span>
              </div>
              <p className="text-sm text-[var(--neutral-text-03)]">
                媒体：{q.mediaName ?? '—'} · 预计上线：
                {q.estimatedPublishAt
                  ? new Date(q.estimatedPublishAt).toLocaleDateString('zh-CN')
                  : '—'}
              </p>
              <p className="text-sm">交付承诺：{q.deliveryPromise ?? '—'}</p>
              {profile?.caseLinks && profile.caseLinks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--neutral-text-03)] mb-1">案例信息</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.caseLinks.slice(0, 5).map((link, i) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--color-accent)] underline"
                      >
                        案例{i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {profile?.resourceNote && (
                <p className="text-xs text-[var(--neutral-text-03)]">资源说明：{profile.resourceNote}</p>
              )}
              {q.message && <p className="text-xs text-[var(--neutral-text-03)]">备注：{q.message}</p>}
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                disabled={accepting === q.id}
                onClick={() => void handleAccept(q.id, g)}
              >
                {accepting === q.id ? '处理中…' : '确认并冻结'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
