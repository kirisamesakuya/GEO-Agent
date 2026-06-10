import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  formatTaskOrderListTime,
  isArticleContentOrder,
  taskOrderStatusClass,
  taskOrderStatusLabel,
  DELIVERY_STAGE_LABEL,
  DELIVERY_REVIEW_STATUS_LABEL,
} from '../../lib/task-order-flow';

interface TaskOrder {
  id: string;
  title: string;
  platform: string;
  budget: number;
  status: string;
  providerName?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  deliveries?: Array<{
    content: string;
    link?: string;
    attachments?: string | null;
    createdAt: string;
    stage?: string;
    reviewStatus?: string | null;
    reviewNote?: string | null;
  }>;
  revisions?: Array<{ reason: string; createdAt: string }>;
  settlement?: { status: string; amount: number } | null;
}

const SETTLEMENT_LABEL: Record<string, string> = {
  pending_platform: '待平台确认',
  pending_offline: '待线下结算',
  settled: '已结算',
};

interface Props {
  orderId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onBack?: () => void;
}

export default function TaskOrderDetailView({ orderId, onNavigate, onBack }: Props) {
  const { toast } = useToast();
  const [order, setOrder] = useState<TaskOrder | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [draftRevisionNote, setDraftRevisionNote] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  const load = () => {
    void fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order ?? null));
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const latestDraft = useMemo(() => {
    if (!order?.deliveries?.length) return null;
    const drafts = order.deliveries
      .filter((d) => d.stage === 'draft' && (d.reviewStatus === 'submitted' || !d.reviewStatus))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return drafts[0] ?? null;
  }, [order]);

  const latestFinalDelivery = useMemo(() => {
    if (!order?.deliveries?.length) return null;
    const finals = order.deliveries.filter((d) => d.stage === 'final' || (!d.stage && d.link));
    return finals[finals.length - 1] ?? null;
  }, [order]);

  const accept = async () => {
    if (!order) return;
    await fetch(`/api/orders/${order.id}/acceptance`, { method: 'POST' });
    toast('验收通过', 'success');
    load();
  };

  const requestRevision = async () => {
    if (!order || !revisionReason.trim()) {
      toast('请填写返修原因', 'error');
      return;
    }
    await fetch(`/api/orders/${order.id}/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: revisionReason }),
    });
    toast('已发起最终验收返修', 'info');
    setRevisionReason('');
    load();
  };

  const approveDraft = async () => {
    if (!order) return;
    const res = await fetch(`/api/orders/${order.id}/draft/approve`, { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('文章草稿已通过', 'success');
    load();
  };

  const requestDraftRevision = async () => {
    if (!order || !draftRevisionNote.trim()) {
      toast('请填写修改意见', 'error');
      return;
    }
    const res = await fetch(`/api/orders/${order.id}/draft/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: draftRevisionNote }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已要求接单方修改文章草稿', 'info');
    setDraftRevisionNote('');
    load();
  };

  const openDispute = async () => {
    if (!order || !disputeReason.trim()) {
      toast('请填写争议说明', 'error');
      return;
    }
    await fetch(`/api/orders/${order.id}/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: disputeReason }),
    });
    toast('争议已提交', 'info');
    setDisputeReason('');
    load();
  };

  return (
    <div className="geo-page-content space-y-4">
      <button
        type="button"
        className="geo-btn-secondary geo-btn-sm flex items-center gap-2"
        onClick={onBack ?? (() => onNavigate?.('content_delivery'))}
      >
        <ArrowLeft className="w-4 h-4" />
        返回接单任务
      </button>

      {!order ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载任务…</p>
      ) : (
        <>
          <div className="geo-card p-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-title)]">{order.title}</h1>
              <p className="text-xs text-[var(--neutral-text-03)] mt-1">
                接单方：{order.providerName ?? '待接单'} · {order.platform} · ¥{order.budget}
              </p>
              <p className="text-xs mt-1 text-[var(--neutral-text-03)]">
                发单时间：{formatTaskOrderListTime(order.createdAt)}
                {order.updatedAt && order.updatedAt !== order.createdAt
                  ? ` · 最近更新：${formatTaskOrderListTime(order.updatedAt)}`
                  : ''}
              </p>
              {order.settlement && (
                <p className="text-xs mt-1">
                  结算：{SETTLEMENT_LABEL[order.settlement.status] ?? order.settlement.status}
                </p>
              )}
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${taskOrderStatusClass(order.status)}`}
            >
              {taskOrderStatusLabel(order.status)}
            </span>
          </div>

          {order.revisions?.map((r, i) => (
            <div
              key={i}
              className="geo-card p-4 border-l-4"
              style={{ borderColor: 'var(--color-warning, #d97706)' }}
            >
              <p className="text-xs font-medium mb-1">返修要求</p>
              <p className="text-sm">{r.reason}</p>
            </div>
          ))}

          {order.deliveries?.map((d, i) => {
            let atts: Array<{ name: string; url: string; type?: string }> = [];
            try {
              atts = d.attachments ? JSON.parse(d.attachments) : [];
            } catch {
              /* */
            }
            const stageLabel = d.stage ? DELIVERY_STAGE_LABEL[d.stage] ?? d.stage : '交付记录';
            return (
              <div key={i} className="geo-card p-4">
                <p className="text-xs mb-2 flex flex-wrap gap-1 items-center text-[var(--neutral-text-03)]">
                  <span>{stageLabel}</span>
                  {d.reviewStatus && (
                    <span className="geo-tag-muted text-[10px]">
                      {DELIVERY_REVIEW_STATUS_LABEL[d.reviewStatus] ?? d.reviewStatus}
                    </span>
                  )}
                  <span>· {new Date(d.createdAt).toLocaleString('zh-CN')}</span>
                </p>
                {d.reviewNote && (
                  <p className="text-xs mb-2 p-2 rounded-lg geo-callout-warning">审稿意见：{d.reviewNote}</p>
                )}
                <pre className="text-sm whitespace-pre-wrap">{d.content}</pre>
                {d.link && (
                  <a
                    href={d.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs mt-2 block text-[var(--color-primary)]"
                  >
                    {d.link}
                  </a>
                )}
                {atts.map((a, j) => (
                  <a
                    key={j}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs mt-1 block text-[var(--color-primary)]"
                  >
                    {a.type === 'screenshot' ? '截图：' : '附件：'}
                    {a.name}
                  </a>
                ))}
              </div>
            );
          })}

          {isArticleContentOrder(order) && order.status === 'draft_review' && latestDraft && (
            <div
              className="geo-card p-4 space-y-3 border-2"
              style={{ borderColor: 'var(--color-primary-soft)' }}
            >
              <h4 className="font-semibold text-sm">文章审稿</h4>
              <pre className="text-sm whitespace-pre-wrap bg-[var(--neutral-bg-03)] p-3 rounded-lg max-h-64 overflow-y-auto">
                {latestDraft.content}
              </pre>
              <button type="button" className="geo-btn-primary text-sm" onClick={() => void approveDraft()}>
                审稿通过
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={draftRevisionNote}
                  onChange={(e) => setDraftRevisionNote(e.target.value)}
                  placeholder="修改意见（要求改稿）"
                  className="geo-input flex-1 text-sm"
                />
                <button
                  type="button"
                  className="geo-btn-secondary text-sm shrink-0"
                  onClick={() => void requestDraftRevision()}
                >
                  要求修改
                </button>
              </div>
            </div>
          )}

          {order.status === 'pending_review' && (
            <div className="space-y-3">
              {isArticleContentOrder(order) && latestFinalDelivery && (
                <div className="geo-card p-3 text-sm space-y-1">
                  <p className="text-xs text-[var(--neutral-text-03)]">发布交付摘要</p>
                  {latestFinalDelivery.link && (
                    <a
                      href={latestFinalDelivery.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs block text-[var(--color-primary)]"
                    >
                      {latestFinalDelivery.link}
                    </a>
                  )}
                  <pre className="text-xs whitespace-pre-wrap mt-1">{latestFinalDelivery.content}</pre>
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                <button type="button" className="geo-btn-primary text-sm" onClick={() => void accept()}>
                  验收通过并完成
                </button>
                <div className="flex-1 flex gap-2 min-w-[200px]">
                  <input
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="最终返修原因"
                    className="geo-input flex-1 text-sm"
                  />
                  <button type="button" className="geo-btn-secondary text-sm" onClick={() => void requestRevision()}>
                    要求返修
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="争议说明（平台介入）"
                  className="geo-input flex-1 text-sm"
                />
                <button type="button" className="geo-btn-secondary text-sm" onClick={() => void openDispute()}>
                  发起争议
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
