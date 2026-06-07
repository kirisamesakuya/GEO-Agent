import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Send } from 'lucide-react';
import type { ViewType, ContentBatch, ContentItem, AccountBinding } from '../../types';
import { useToast } from '../../context/ToastContext';
import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../../lib/publish-accounts';
import { isPublishReady } from '../../lib/publish-account-login-status';
import { platformMatches } from '../../lib/content-library-platforms';
import { submitPublishDraft } from '../../lib/publish-draft-client';
import { waitForHermesAgentTask } from '../../lib/hermes-publish-client';
import HermesWorkingOverlay from '../common/HermesWorkingOverlay';
import TaskStatusPill from '../common/TaskStatusPill';

interface Props {
  brandName: string;
  contentItemId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function ArticleResultDetailView({ brandName, contentItemId, onNavigate }: Props) {
  const { toast } = useToast();
  const [batch, setBatch] = useState<ContentBatch | null>(null);
  const [item, setItem] = useState<ContentItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [hermesWork, setHermesWork] = useState({
    open: false,
    progress: 0,
    message: '',
    detail: '',
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/content-items/${contentItemId}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { item?: ContentItem & { batchId: string } };
      const row = data.item;
      if (!row?.batchId || cancelled) return;
      const batchRes = await fetch(`/api/content-batches/${row.batchId}`);
      if (!batchRes.ok || cancelled) return;
      const batchData = (await batchRes.json()) as { batch?: ContentBatch };
      if (!batchData.batch || cancelled) return;
      setBatch(batchData.batch);
      const target = batchData.batch.items?.find((i) => i.id === row.id) ?? row;
      setItem(target);
      setEditContent(target.fullContent);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentItemId]);

  useEffect(() => {
    void fetchAvailablePublishAccounts(brandName)
      .then((rows) => setAccounts(rows.map(toAccountBindingShape)))
      .catch(() => setAccounts([]));
  }, [brandName]);

  const publishAccounts = batch
    ? accounts.filter((a) => platformMatches(batch.platform, a.platform) && isPublishReady(a.status))
    : [];

  useEffect(() => {
    if (publishAccounts.length === 0) {
      setSelectedAccountId('');
      return;
    }
    if (!publishAccounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(publishAccounts[0].id);
    }
  }, [publishAccounts, selectedAccountId]);

  const save = async () => {
    if (!batch || !item) return;
    const res = await fetch(`/api/content-batches/${batch.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullContent: editContent }),
    });
    const data = await res.json();
    if (data.item) {
      setItem(data.item);
      setEditContent(data.item.fullContent);
      setIsEditing(false);
      toast('内容已保存', 'success');
    }
  };

  const publish = async () => {
    if (!batch || !item || !selectedAccountId) {
      toast('请选择发布账号', 'error');
      return;
    }
    setPublishing(true);
    try {
      const draft = await submitPublishDraft({
        brandName,
        batchId: batch.id,
        contentItemIds: [item.id],
        accountBindingId: selectedAccountId,
      });
      if (!draft.task?.id) throw new Error('发布任务创建失败');
      setHermesWork({ open: true, progress: 10, message: 'Hermes 发布中…', detail: '' });
      const task = await waitForHermesAgentTask(draft.task.id, (p, msg) => {
        setHermesWork({ open: true, progress: p, message: msg, detail: '' });
      });
      setHermesWork((h) => ({ ...h, open: false }));
      if (task.status === 'succeeded') {
        toast('发布任务已提交，请在发布记录查看结果', 'success');
        onNavigate?.('content_delivery', 'publish_records');
      } else {
        toast('发布未成功，请查看发布记录', 'error');
      }
    } catch (e) {
      setHermesWork((h) => ({ ...h, open: false }));
      toast(e instanceof Error ? e.message : '发布失败', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const statusPill = () => {
    if (!item) return null;
    if (item.publishStatus === 'failed') return <TaskStatusPill status="failed" />;
    if (item.publishStatus === 'published' || item.status === 'published') {
      return <TaskStatusPill status="succeeded" />;
    }
    if (item.publishStatus === 'scheduled') return <TaskStatusPill status="pending" />;
    return <TaskStatusPill status="queued" />;
  };

  return (
    <div className="geo-page-content h-full overflow-y-auto space-y-4">
      <HermesWorkingOverlay
        open={hermesWork.open}
        progress={hermesWork.progress}
        message={hermesWork.message}
        detail={hermesWork.detail}
      />
      <button
        type="button"
        className="geo-btn-secondary geo-btn-sm flex items-center gap-2"
        onClick={() => onNavigate?.('content_delivery')}
      >
        <ArrowLeft className="w-4 h-4" />
        返回内容交付
      </button>

      {!item ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载文章…</p>
      ) : (
        <>
          <div className="geo-card p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-[var(--color-title)]">{item.title}</h1>
                <p className="text-xs text-[var(--neutral-text-03)] mt-1">
                  {batch?.platform} · {new Date(item.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              {statusPill()}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm"
                onClick={() => setIsEditing((v) => !v)}
              >
                <Pencil className="w-3.5 h-3.5" />
                {isEditing ? '取消编辑' : '编辑'}
              </button>
              {isEditing && (
                <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => void save()}>
                  保存
                </button>
              )}
            </div>
          </div>

          <div className="geo-card p-4">
            <h2 className="text-sm font-semibold mb-2">原文内容</h2>
            {isEditing ? (
              <textarea
                className="geo-input w-full min-h-[320px] text-sm font-mono"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap leading-relaxed">{item.fullContent}</pre>
            )}
          </div>

          <div className="geo-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">发布</h2>
            <p className="text-xs text-[var(--neutral-text-03)]">
              选择账号后确认发布，执行结果在「内容交付 → 发布记录」查看。
            </p>
            {publishAccounts.length === 0 ? (
              <p className="text-xs text-amber-700">暂无可用发布账号，请先在发布账号管理中登录。</p>
            ) : (
              <select
                className="geo-input w-full max-w-sm text-sm"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {publishAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} · {a.platform}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm flex items-center gap-1"
              disabled={publishing || publishAccounts.length === 0}
              onClick={() => void publish()}
            >
              <Send className="w-3.5 h-3.5" />
              {publishing ? '发布中…' : '确认发布'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
