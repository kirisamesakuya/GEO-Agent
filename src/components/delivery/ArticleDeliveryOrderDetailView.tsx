import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, ImageIcon, XCircle } from 'lucide-react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  ARTICLE_DELIVERY_SOURCE_LABEL,
  articleDeliverySourceClass,
  articleDeliveryStageClass,
  formatArticleDeliveryTime,
  mapManualOrderStage,
  ARTICLE_DELIVERY_STAGE_LABEL,
  type ArticleDeliveryStage,
} from '../../lib/article-delivery-unified';
import {
  ArticleDeliveryChecklist,
  ArticleDeliveryDetailPanel,
  ArticleDeliveryDetailShell,
  ArticleDeliveryLogTimeline,
  ArticleDeliveryMainSection,
  platformBadgeClass,
  type DeliveryLogStep,
} from './article-delivery-detail-shell';
import { DELIVERY_REVIEW_STATUS_LABEL, formatTaskOrderListTime } from '../../lib/task-order-flow';
import OrderRevisionRequestDialog from './OrderRevisionRequestDialog';

interface TaskOrder {
  id: string;
  title: string;
  platform: string;
  budget: number;
  status: string;
  providerName?: string;
  brandName?: string;
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
}

interface Props {
  orderId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function ArticleDeliveryOrderDetailView({ orderId, onNavigate }: Props) {
  const { toast } = useToast();
  const [order, setOrder] = useState<TaskOrder | null>(null);
  const [draftRevisionNote, setDraftRevisionNote] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  const load = () => {
    void fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order ?? null));
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const stage: ArticleDeliveryStage = order ? mapManualOrderStage(order.status) : 'writing';

  const latestDraft = useMemo(() => {
    if (!order?.deliveries?.length) return null;
    return (
      order.deliveries
        .filter((d) => d.stage === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
    );
  }, [order]);

  const latestFinal = useMemo(() => {
    if (!order?.deliveries?.length) return null;
    const finals = order.deliveries.filter((d) => d.stage === 'final' || (!d.stage && d.link));
    return finals[finals.length - 1] ?? null;
  }, [order]);

  const parseAttachments = (raw?: string | null) => {
    try {
      return raw ? (JSON.parse(raw) as Array<{ name: string; url: string; type?: string }>) : [];
    } catch {
      return [];
    }
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
    toast('已要求接单方修改草稿', 'info');
    setDraftRevisionNote('');
    load();
  };

  const accept = async () => {
    if (!order) return;
    await fetch(`/api/orders/${order.id}/acceptance`, { method: 'POST' });
    toast('验收通过', 'success');
    load();
  };

  const requestRevision = async () => {
    if (!order || !revisionReason.trim()) {
      toast('请填写返修需求', 'error');
      return;
    }
    setRevisionSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revisionReason.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? '返修提交失败', 'error');
        return;
      }
      toast('返修要求已发送给接单方', 'success');
      setRevisionReason('');
      setShowRevisionModal(false);
      load();
    } catch {
      toast('返修提交失败，请稍后重试', 'error');
    } finally {
      setRevisionSubmitting(false);
    }
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

  if (!order) {
    return (
      <div className="geo-page-content p-8 text-sm text-[var(--neutral-text-03)]">加载任务…</div>
    );
  }

  const ownerLabel = order.providerName ?? '待接单';
  const metaLine = `${ownerLabel} · 更新时间 ${formatArticleDeliveryTime(order.updatedAt ?? order.createdAt)}`;

  const badges = (
    <>
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${articleDeliverySourceClass('manual_order')}`}
      >
        {ARTICLE_DELIVERY_SOURCE_LABEL.manual_order}
      </span>
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${platformBadgeClass(order.platform)}`}
      >
        {order.platform}
      </span>
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${articleDeliveryStageClass(stage)}`}
      >
        {ARTICLE_DELIVERY_STAGE_LABEL[stage]}
      </span>
    </>
  );

  const actionTitle =
    stage === 'draft_review'
      ? '待审稿'
      : stage === 'draft_revision'
        ? '审稿返修'
        : stage === 'pending_acceptance'
          ? '待验收'
          : stage === 'pending_publish'
            ? '待发布'
            : stage === 'completed'
              ? '已完成'
              : '查看';

  const mainBody =
    stage === 'pending_acceptance' && latestFinal
      ? latestFinal.content
      : latestDraft?.content ?? latestFinal?.content ?? '（暂无交付内容）';

  const mainLink = stage === 'pending_acceptance' ? latestFinal?.link : undefined;

  const logSteps: DeliveryLogStep[] = [
    { label: '任务发布', time: formatTaskOrderListTime(order.createdAt).split(' ')[1] ?? '—', done: true },
    {
      label: '草稿提交',
      time: latestDraft ? formatArticleDeliveryTime(latestDraft.createdAt).split(' ')[1] ?? '—' : '—',
      done: Boolean(latestDraft),
    },
    {
      label: '审稿通过',
      time: '—',
      done: ['draft_approved', 'pending_review', 'completed'].includes(order.status),
    },
    {
      label: '发布回填',
      time: latestFinal ? formatArticleDeliveryTime(latestFinal.createdAt).split(' ')[1] ?? '—' : '—',
      done: Boolean(latestFinal?.link),
    },
    {
      label: '验收完成',
      time: order.status === 'completed' ? formatArticleDeliveryTime(order.updatedAt).split(' ')[1] ?? '—' : '—',
      done: order.status === 'completed',
    },
  ];

  const renderActions = () => {
    if (stage === 'draft_review') {
      return (
        <>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm flex items-center gap-1.5"
            onClick={() => void requestDraftRevision()}
          >
            <XCircle className="w-3.5 h-3.5" />
            要求修改
          </button>
          <button type="button" className="geo-btn-primary geo-btn-sm flex items-center gap-1.5" onClick={() => void approveDraft()}>
            <Check className="w-3.5 h-3.5" />
            审稿通过
          </button>
        </>
      );
    }
    if (stage === 'pending_acceptance') {
      return (
        <>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm"
            onClick={() => setShowRevisionModal(true)}
          >
            要求返修
          </button>
          <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => void accept()}>
            验收通过
          </button>
        </>
      );
    }
    return null;
  };

  const sidebar = () => {
    if (stage === 'draft_review') {
      return (
        <>
          <ArticleDeliveryDetailPanel title="审稿说明">
            <p className="text-xs text-[var(--neutral-text-02)]">
              请核对草稿内容与品牌要求是否一致。通过后接单方将前往平台发布并回填链接。
            </p>
            {latestDraft?.reviewStatus && (
              <p className="text-xs mt-2">
                状态：{DELIVERY_REVIEW_STATUS_LABEL[latestDraft.reviewStatus] ?? latestDraft.reviewStatus}
              </p>
            )}
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="修改意见">
            <textarea
              className="geo-input w-full min-h-[80px] text-sm"
              placeholder="填写修改意见（要求改稿时必填）"
              value={draftRevisionNote}
              onChange={(e) => setDraftRevisionNote(e.target.value)}
            />
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="接单方">
            <div className="text-xs space-y-1">
              <p>
                <span className="text-[var(--neutral-text-03)]">服务商：</span>
                {ownerLabel}
              </p>
              <p>
                <span className="text-[var(--neutral-text-03)]">预算：</span>¥{order.budget}
              </p>
            </div>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="交付日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    if (stage === 'draft_revision') {
      return (
        <>
          {order.revisions?.slice(-1).map((r, i) => (
            <ArticleDeliveryDetailPanel key={i} title="返修要求">
              <p className="text-sm text-[var(--neutral-text-02)]">{r.reason}</p>
              <p className="text-[10px] text-[var(--neutral-text-03)] mt-2">
                {formatArticleDeliveryTime(r.createdAt)}
              </p>
            </ArticleDeliveryDetailPanel>
          ))}
          <ArticleDeliveryDetailPanel title="交付日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    if (stage === 'pending_acceptance') {
      const atts = parseAttachments(latestFinal?.attachments);
      return (
        <>
          <ArticleDeliveryDetailPanel title="发布结果">
            <div className="text-xs space-y-2">
              <div>
                <p className="text-[var(--neutral-text-03)] mb-0.5">发布链接</p>
                {mainLink ? (
                  <a href={mainLink} target="_blank" rel="noreferrer" className="geo-link break-all flex gap-1">
                    {mainLink}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <p>—</p>
                )}
              </div>
              <div>
                <p className="text-[var(--neutral-text-03)] mb-0.5">接单方</p>
                <p className="font-medium">{ownerLabel}</p>
              </div>
            </div>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="证据材料">
            {atts.length > 0 ? (
              <ul className="text-xs space-y-1">
                {atts.map((a, j) => (
                  <li key={j}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="geo-link">
                      {a.type === 'screenshot' ? '截图：' : '附件：'}
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {['发布截图', '收录截图'].map((label) => (
                  <div
                    key={label}
                    className="aspect-[4/3] rounded-lg border flex flex-col items-center justify-center gap-1 text-[var(--neutral-text-03)] bg-[var(--neutral-bg-03)]"
                    style={{ borderColor: 'var(--neutral-divider-02)' }}
                  >
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span className="text-[10px]">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="验收确认">
            <ArticleDeliveryChecklist
              items={[
                { label: '发布链接可访问', done: Boolean(mainLink) },
                { label: '内容与审稿稿一致', done: Boolean(latestFinal?.content) },
                { label: '证据材料已上传', done: atts.length > 0 },
              ]}
            />
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="争议">
            <div className="space-y-2 text-xs">
              <textarea
                className="geo-input w-full min-h-[72px] text-sm"
                placeholder="争议说明（需平台介入时填写）"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
              <button type="button" className="geo-btn-secondary geo-btn-sm w-full" onClick={() => void openDispute()}>
                发起争议
              </button>
            </div>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="交付日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    if (stage === 'pending_publish') {
      return (
        <>
          <ArticleDeliveryDetailPanel title="待发布">
            <p className="text-xs text-[var(--neutral-text-02)]">
              草稿已通过审稿，等待接单方在平台发布并回填链接与证据。
            </p>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="交付日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    return (
      <ArticleDeliveryDetailPanel title="交付日志">
        <ArticleDeliveryLogTimeline steps={logSteps} />
      </ArticleDeliveryDetailPanel>
    );
  };

  const mainTitle =
    stage === 'draft_review' || stage === 'draft_revision'
      ? '待审草稿'
      : stage === 'pending_acceptance'
        ? '发布交付内容'
        : '文章内容';

  return (
    <>
      <OrderRevisionRequestDialog
        open={showRevisionModal}
        value={revisionReason}
        onChange={setRevisionReason}
        loading={revisionSubmitting}
        onCancel={() => {
          if (revisionSubmitting) return;
          setShowRevisionModal(false);
          setRevisionReason('');
        }}
        onConfirm={() => void requestRevision()}
      />
      <ArticleDeliveryDetailShell
      onBack={() => onNavigate?.('content_delivery')}
      actions={renderActions()}
      title={order.title}
      badges={badges}
      metaLine={`${actionTitle} · ${metaLine}`}
      mainContent={
        <ArticleDeliveryMainSection title={mainTitle}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--neutral-text-01)]">
            {mainBody}
          </div>
          {mainLink && stage !== 'pending_acceptance' && (
            <a href={mainLink} target="_blank" rel="noreferrer" className="geo-link text-xs mt-3 inline-flex gap-1">
              {mainLink}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </ArticleDeliveryMainSection>
      }
      sidebar={sidebar()}
      />
    </>
  );
}
