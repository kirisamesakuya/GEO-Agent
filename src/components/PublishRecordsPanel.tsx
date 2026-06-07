import { useEffect, useState } from 'react';
import type { ViewType } from '../types';
import type { PublishRecordStatusFilter } from '../lib/article-result-nav';
import TaskStatusPill from './common/TaskStatusPill';

interface PublishRecordRow {
  id: string;
  platform: string;
  contentTitle?: string;
  accountName?: string;
  status: string;
  publishedUrl?: string;
  errorCode?: string;
  reviewCategory?: string;
  executedAt?: string;
}

interface Props {
  brandName: string;
  statusFilter?: PublishRecordStatusFilter;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onViewRecord?: (recordId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  succeeded: '已发布',
  failed: '发布失败',
  pending: '待执行',
  need_reauth: '需重新授权',
};

const STATUS_PILL: Record<string, 'queued' | 'running' | 'succeeded' | 'failed' | 'pending'> = {
  succeeded: 'succeeded',
  failed: 'failed',
  pending: 'pending',
  need_reauth: 'failed',
};

export default function PublishRecordsPanel({
  brandName,
  statusFilter = '',
  onNavigate,
  onViewRecord,
}: Props) {
  const [records, setRecords] = useState<PublishRecordRow[]>([]);

  const load = () => {
    if (!brandName || brandName === '__all__') {
      setRecords([]);
      return;
    }
    const q = new URLSearchParams({ brandName });
    if (statusFilter && statusFilter !== 'need_reauth') q.set('status', statusFilter);
    if (statusFilter === 'need_reauth') q.set('reviewCategory', 'need_reauth');
    fetch(`/api/publish-records?${q}`)
      .then((r) => r.json())
      .then((d) => setRecords(d.records ?? []))
      .catch(() => setRecords([]));
  };

  useEffect(() => {
    load();
  }, [brandName, statusFilter]);

  const openRecord = (id: string) => {
    if (onViewRecord) onViewRecord(id);
    else onNavigate?.('content_delivery', `publish:${id}`);
  };

  return (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-sm geo-table">
        <thead>
          <tr>
            <th>文章</th>
            <th>平台</th>
            <th>账号</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center">
                <p className="text-sm text-[var(--neutral-text-03)] mb-3">暂无发布记录</p>
                {onNavigate && (
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-xs"
                    onClick={() => onNavigate('content_delivery')}
                  >
                    去文章列表发布
                  </button>
                )}
              </td>
            </tr>
          ) : (
            records.map((r) => (
              <tr key={r.id}>
                <td className="text-xs">{r.contentTitle ?? '—'}</td>
                <td>{r.platform}</td>
                <td className="text-xs">{r.accountName ?? '—'}</td>
                <td>
                  <TaskStatusPill status={STATUS_PILL[r.status] ?? 'queued'} size="sm" showDot={false} />
                  <span className="text-[11px] ml-1">{STATUS_LABEL[r.status] ?? r.status}</span>
                </td>
                <td className="text-xs tabular-nums">
                  {r.executedAt?.slice(0, 16).replace('T', ' ') ?? '—'}
                </td>
                <td>
                  <button type="button" className="geo-link text-xs" onClick={() => openRecord(r.id)}>
                    查看
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
