import type { AgentTask } from '../../types';
import { ExternalLink } from 'lucide-react';
import { parsePublishEvidence, PUBLISH_REVIEW_LABELS } from '../../lib/hermes-publish-evidence';

interface Props {
  task: AgentTask;
  onNavigate?: (view: import('../../types').ViewType, hint?: string) => void;
}

export default function HermesPublishResultPanel({ task, onNavigate }: Props) {
  if (task.type !== 'hermes_publish' && task.type !== 'account_verify') return null;

  const data = parsePublishEvidence(task.output);
  if (!data) return null;

  if (task.type === 'account_verify') {
    return (
      <div className="geo-card p-6 space-y-3 border border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-title)]">账号校验结果</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[var(--neutral-text-03)]">平台</span>
            <p className="font-medium mt-0.5">{data.platform || '—'}</p>
          </div>
          <div>
            <span className="text-[var(--neutral-text-03)]">账号</span>
            <p className="font-medium mt-0.5">{data.accountName || '—'}</p>
          </div>
          <div>
            <span className="text-[var(--neutral-text-03)]">校验结果</span>
            <p className="font-medium mt-0.5">{data.verified ? '通过' : '失败'}</p>
          </div>
          {data.checkedAt && (
            <div>
              <span className="text-[var(--neutral-text-03)]">校验时间</span>
              <p className="font-medium mt-0.5">{new Date(data.checkedAt).toLocaleString('zh-CN')}</p>
            </div>
          )}
        </div>
        {data.evidence && (
          <p className="text-xs text-[var(--neutral-text-02)] rounded-lg bg-[var(--neutral-bg-03)] p-3">
            {data.evidence}
          </p>
        )}
        {onNavigate && !data.verified && (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('account_binding')}
          >
            前往发布账号管理
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="geo-card p-6 space-y-4 border border-[var(--color-border)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-title)]">Hermes 发布证据</h2>
          <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">
            {data.platform} · {data.accountName}
          </p>
        </div>
        {(data.reviewCategory || task.needsReview) && (
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 font-medium">
            {PUBLISH_REVIEW_LABELS[data.reviewCategory ?? ''] ?? '需人工处理'}
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-[var(--neutral-text-03)]">成功</span>
          <p className="font-semibold mt-0.5">{data.publishedCount}</p>
        </div>
        <div>
          <span className="text-[var(--neutral-text-03)]">失败/待人工</span>
          <p className="font-semibold mt-0.5">{data.failedCount}</p>
        </div>
        <div>
          <span className="text-[var(--neutral-text-03)]">主链接</span>
          {data.publishLink ? (
            <a
              href={data.publishLink}
              target="_blank"
              rel="noreferrer"
              className="geo-link text-xs inline-flex items-center gap-1 mt-0.5"
            >
              查看 <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="mt-0.5">—</p>
          )}
        </div>
      </div>

      {data.evidence && (
        <p className="text-xs text-[var(--neutral-text-02)]">{data.evidence}</p>
      )}

      {data.evidenceItems.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left">
                <th className="p-2 font-medium">文章</th>
                <th className="p-2 font-medium">状态</th>
                <th className="p-2 font-medium">平台反馈</th>
                <th className="p-2 font-medium">证据</th>
              </tr>
            </thead>
            <tbody>
              {data.evidenceItems.map((row) => (
                <tr key={row.contentItemId} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-2 font-medium">{row.title}</td>
                  <td className="p-2">
                    {row.status === 'published' ? (
                      <span className="text-green-700">已发布</span>
                    ) : row.status === 'need_manual' ? (
                      <span className="text-amber-800">需人工</span>
                    ) : (
                      <span className="text-red-600">失败</span>
                    )}
                  </td>
                  <td className="p-2 text-[var(--neutral-text-03)]">{row.platformMessage ?? '—'}</td>
                  <td className="p-2 space-x-2">
                    {row.publishLink && (
                      <a href={row.publishLink} target="_blank" rel="noreferrer" className="geo-link">
                        链接
                      </a>
                    )}
                    {row.screenshotUrl && (
                      <a href={row.screenshotUrl} target="_blank" rel="noreferrer" className="geo-link">
                        截图
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onNavigate && (data.reviewCategory || task.needsReview) && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('publish_records')}
          >
            查看发布记录
          </button>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('account_binding')}
          >
            检查发布账号
          </button>
        </div>
      )}
    </div>
  );
}
