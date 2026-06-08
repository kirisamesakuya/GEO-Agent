import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { ViewType } from '../../types';
import TaskStatusPill from '../common/TaskStatusPill';

interface PublishRecordRow {
  id: string;
  platform: string;
  contentTitle?: string;
  contentItemId?: string;
  accountName?: string;
  status: string;
  publishedUrl?: string;
  errorCode?: string;
  reviewCategory?: string;
  executedAt?: string;
  createdAt: string;
}

interface Props {
  brandName: string;
  recordId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

const STATUS_MAP: Record<string, 'queued' | 'running' | 'succeeded' | 'failed' | 'pending'> = {
  succeeded: 'succeeded',
  failed: 'failed',
  pending: 'pending',
  need_reauth: 'failed',
};

const STATUS_LABEL: Record<string, string> = {
  succeeded: '已发布',
  failed: '发布失败',
  pending: '待执行',
  need_reauth: '需重新授权',
};

export default function PublishRecordDetailView({ brandName, recordId, onNavigate }: Props) {
  const [record, setRecord] = useState<PublishRecordRow | null>(null);

  const load = () => {
    fetch(`/api/publish-records?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.records ?? []) as PublishRecordRow[];
        setRecord(rows.find((r) => r.id === recordId) ?? null);
      })
      .catch(() => setRecord(null));
  };

  useEffect(() => {
    load();
  }, [brandName, recordId]);

  return (
    <div className="geo-page-content h-full overflow-y-auto space-y-4">
      <button
        type="button"
        className="geo-btn-secondary geo-btn-sm flex items-center gap-2"
        onClick={() => onNavigate?.('content_delivery')}
      >
        <ArrowLeft className="w-4 h-4" />
        返回文章交付
      </button>

      {!record ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载发布记录…</p>
      ) : (
        <>
          <div className="geo-card p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-[var(--color-title)]">
                {record.contentTitle ?? '发布记录'}
              </h1>
              <TaskStatusPill status={STATUS_MAP[record.status] ?? 'queued'} />
            </div>
            <p className="text-xs text-[var(--neutral-text-03)]">
              {STATUS_LABEL[record.status] ?? record.status}
            </p>
          </div>

          <div className="geo-card p-4 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">发布平台</p>
                <p className="font-medium">{record.platform}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">发布账号</p>
                <p className="font-medium">{record.accountName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">发布时间</p>
                <p className="font-medium">
                  {record.executedAt?.slice(0, 16).replace('T', ' ') ??
                    record.createdAt?.slice(0, 16).replace('T', ' ') ??
                    '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--neutral-text-03)]">发布状态</p>
                <p className="font-medium">{STATUS_LABEL[record.status] ?? record.status}</p>
              </div>
            </div>

            {record.publishedUrl && (
              <div>
                <p className="text-xs text-[var(--neutral-text-03)] mb-1">发布链接</p>
                <a href={record.publishedUrl} target="_blank" rel="noreferrer" className="geo-link text-sm">
                  {record.publishedUrl}
                </a>
              </div>
            )}

            {(record.errorCode || record.reviewCategory) && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
                <p className="font-medium mb-1">失败原因</p>
                <p>{record.errorCode ?? record.reviewCategory}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {record.contentItemId && (
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm"
                onClick={() => onNavigate?.('content_delivery', `content:${record.contentItemId}`)}
              >
                查看原文
              </button>
            )}
            {record.status === 'failed' && (
              <>
                <button
                  type="button"
                  className="geo-btn-primary geo-btn-sm flex items-center gap-1"
                  onClick={() => {
                    if (record.contentItemId) {
                      onNavigate?.('content_delivery', `content:${record.contentItemId}`);
                    }
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新发布
                </button>
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-sm"
                  onClick={() => onNavigate?.('agent_tasks')}
                >
                  查看任务详情
                </button>
              </>
            )}
            {record.status === 'need_reauth' && (
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                onClick={() => onNavigate?.('account_binding')}
              >
                去重新授权
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
