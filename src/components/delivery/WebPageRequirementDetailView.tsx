import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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
  need_info: 'pending',
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

      {!req ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载需求…</p>
      ) : (
        <>
          <div className="geo-card p-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-title)]">{req.pageType}</h1>
              <p className="text-xs text-[var(--neutral-text-03)] mt-1">
                提交于 {new Date(req.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <TaskStatusPill status={STATUS_PILL[displayStatus] ?? 'queued'} />
          </div>

          <div className="geo-card p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-[var(--neutral-text-03)]">处理进度</p>
              <p className="font-medium">{WEBSITE_REQUIREMENT_STATUS_LABEL[displayStatus]}</p>
            </div>
            {req.referenceUrl && (
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">官网/落地页链接</p>
                <a href={req.referenceUrl} target="_blank" rel="noreferrer" className="geo-link">
                  {req.referenceUrl}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--neutral-text-03)]">目标与说明</p>
              <pre className="text-sm whitespace-pre-wrap mt-1">{req.goal}</pre>
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

          {displayStatus === 'need_info' && (
            <p className="geo-card p-3 text-xs geo-callout-warning">
              后台需要您补充信息，请通过原联系方式回复或重新提交需求说明。
            </p>
          )}
        </>
      )}
    </div>
  );
}
