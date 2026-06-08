import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { resolveWebsiteLeadFields } from '../../../lib/website-lead-intake';
import type { ViewType } from '../../types';
import TaskStatusPill from '../common/TaskStatusPill';
import {
  deriveWebsiteRequirementStatus,
  WEBSITE_REQUIREMENT_STATUS_LABEL,
  type WebsiteRequirementRow,
} from '../../lib/website-requirement-nav';

interface Props {
  requirementId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onBack?: () => void;
}

const STATUS_PILL: Record<string, 'queued' | 'running' | 'succeeded' | 'failed' | 'pending'> = {
  pending: 'queued',
  in_progress: 'running',
  delivered: 'succeeded',
};

export default function WebPageRequirementDetailView({
  requirementId,
  onNavigate,
  onBack,
}: Props) {
  const [req, setReq] = useState<WebsiteRequirementRow | null>(null);

  useEffect(() => {
    void fetch(`/api/website-requests/${requirementId}`)
      .then((r) => r.json())
      .then((d) => setReq(d.request ?? null))
      .catch(() => setReq(null));
  }, [requirementId]);

  const displayStatus = req ? deriveWebsiteRequirementStatus(req) : 'pending';
  const order = req?.orders?.[0];
  const fields = req ? resolveWebsiteLeadFields(req) : null;

  return (
    <div className="geo-page-content h-full overflow-y-auto space-y-4">
      <button
        type="button"
        className="geo-btn-secondary geo-btn-sm flex items-center gap-2"
        onClick={onBack ?? (() => onNavigate?.('content_delivery', 'website'))}
      >
        <ArrowLeft className="w-4 h-4" />
        返回网页需求
      </button>

      {!req || !fields ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载需求…</p>
      ) : (
        <>
          <div className="geo-card p-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-title)]">{fields.pageType}</h1>
              <p className="text-xs text-[var(--neutral-text-03)] mt-1">
                提交于 {new Date(req.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <TaskStatusPill status={STATUS_PILL[displayStatus] ?? 'queued'} />
          </div>

          <div className="geo-card p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-[var(--neutral-text-03)]">处理进度</p>
              <p className="font-medium">
                {displayStatus !== 'all'
                  ? WEBSITE_REQUIREMENT_STATUS_LABEL[displayStatus]
                  : '—'}
              </p>
            </div>
            {fields.referenceUrl && (
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">官网/落地页链接</p>
                <a href={fields.referenceUrl} target="_blank" rel="noreferrer" className="geo-link">
                  {fields.referenceUrl}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--neutral-text-03)]">目标关键词</p>
              <p className="mt-1">{fields.keywords || '—'}</p>
            </div>
            {fields.notes && (
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">参考说明</p>
                <p className="mt-1 whitespace-pre-wrap">{fields.notes}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--neutral-text-03)]">联系方式</p>
              <p className="mt-1">{fields.contact || '—'}</p>
            </div>
            {(req as { attachments?: Array<{ name: string; url: string }> }).attachments?.length ? (
              <div>
                <p className="text-xs text-[var(--neutral-text-03)] mb-1">附件</p>
                {(req as { attachments: Array<{ name: string; url: string }> }).attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="geo-link text-xs block">
                    {a.name}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {order?.previewUrl && (
            <div className="geo-card p-4 space-y-2">
              <p className="text-sm font-semibold">交付结果</p>
              <a href={order.previewUrl} target="_blank" rel="noreferrer" className="geo-link text-sm">
                {order.previewUrl}
              </a>
              {order.deliveryNote && (
                <p className="text-xs text-[var(--neutral-text-03)]">{order.deliveryNote}</p>
              )}
            </div>
          )}

        </>
      )}
    </div>
  );
}
