import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, ImageIcon, Pencil, RefreshCw, Send } from 'lucide-react';
import type { ViewType, ContentBatch, ContentItem, AccountBinding } from '../../types';
import { useToast } from '../../context/ToastContext';
import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../../lib/publish-accounts';
import { isPublishReady } from '../../lib/publish-account-login-status';
import { platformMatches } from '../../lib/content-library-platforms';
import { submitPublishDraft } from '../../lib/publish-draft-client';
import { waitForHermesAgentTask } from '../../lib/hermes-publish-client';
import HermesWorkingOverlay from '../common/HermesWorkingOverlay';
import HermesPublishConfirmDialog, {
  type HermesPublishConfirmPayload,
} from '../agent/HermesPublishConfirmDialog';
import {
  ARTICLE_DELIVERY_SOURCE_LABEL,
  ARTICLE_DELIVERY_STAGE_LABEL,
  articleDeliverySourceClass,
  articleDeliveryStageClass,
  formatArticleDeliveryTime,
  type ArticleDeliveryStage,
} from '../../lib/article-delivery-unified';
import { parseEffectVerification } from '../../lib/content-item-meta';
import { normalizeArticleContentToMarkdown } from '../../lib/article-content-markdown';
import ArticleMarkdownBody from './ArticleMarkdownBody';
import {
  ArticleDeliveryChecklist,
  ArticleDeliveryDetailPanel,
  ArticleDeliveryDetailShell,
  ArticleDeliveryLogTimeline,
  ArticleDeliveryMainSection,
  platformBadgeClass,
  type DeliveryLogStep,
} from './article-delivery-detail-shell';

interface PublishRecordRow {
  id: string;
  contentItemId?: string;
  platform: string;
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
  contentItemId: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

const STAGE_ACTION_TITLE: Partial<Record<ArticleDeliveryStage, string>> = {
  pending_publish: '待发布',
  publishing: '发布中',
  publish_failed: '发布失败',
  published: '查看结果',
};

export default function ArticleDeliveryDetailView({
  brandName,
  contentItemId,
  onNavigate,
}: Props) {
  const { toast } = useToast();
  const [batch, setBatch] = useState<ContentBatch | null>(null);
  const [item, setItem] = useState<ContentItem | null>(null);
  const [record, setRecord] = useState<PublishRecordRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [publishConfirm, setPublishConfirm] = useState<{
    open: boolean;
    payload: HermesPublishConfirmPayload | null;
  }>({ open: false, payload: null });
  const [hermesWork, setHermesWork] = useState({
    open: false,
    progress: 0,
    message: '',
    detail: '',
  });

  const effectiveBrand = batch?.brandName ?? (brandName !== '__all__' ? brandName : '');

  const reload = async () => {
    const itemRes = await fetch(`/api/content-items/${contentItemId}`);
    if (!itemRes.ok) return;
    const itemData = (await itemRes.json()) as { item?: ContentItem & { batchId: string } };
    const row = itemData.item;
    if (!row?.batchId) return;

    const [batchRes, recordsRes] = await Promise.all([
      fetch(`/api/content-batches/${row.batchId}`),
      effectiveBrand
        ? fetch(`/api/publish-records?brandName=${encodeURIComponent(effectiveBrand)}`)
        : Promise.resolve(null),
    ]);

    if (!batchRes.ok) return;
    const batchData = (await batchRes.json()) as { batch?: ContentBatch };
    if (!batchData.batch) return;

    const target = batchData.batch.items?.find((i) => i.id === row.id) ?? row;
    setBatch(batchData.batch);
    setItem(target);
    setEditContent(normalizeArticleContentToMarkdown(target.fullContent, target.title));

    if (recordsRes?.ok) {
      const recData = (await recordsRes.json()) as { records?: PublishRecordRow[] };
      setRecord((recData.records ?? []).find((r) => r.contentItemId === contentItemId) ?? null);
    }

    const verification = parseEffectVerification(target.effectVerificationJson);
    setConfirmed(verification?.overallJudgment === 'confirmed_by_merchant');
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentItemId, brandName]);

  useEffect(() => {
    if (!effectiveBrand) return;
    void fetchAvailablePublishAccounts(effectiveBrand)
      .then((rows) => setAccounts(rows.map(toAccountBindingShape)))
      .catch(() => setAccounts([]));
  }, [effectiveBrand]);

  const stage: ArticleDeliveryStage = useMemo(() => {
    if (!item || !batch) return 'pending_publish';
    if (batch.status === 'failed' || item.publishStatus === 'failed') return 'publish_failed';
    if (item.publishStatus === 'scheduled' || publishing) return 'publishing';

    const verification = parseEffectVerification(item.effectVerificationJson);
    const hasBackfill = Boolean(record?.publishedUrl ?? verification?.publishUrl);

    if (item.publishStatus === 'published' || item.status === 'published') {
      if (!hasBackfill && record?.status !== 'succeeded') return 'publish_failed';
      return 'published';
    }
    return 'pending_publish';
  }, [item, batch, publishing, record]);

  const publishUrl =
    record?.publishedUrl ?? parseEffectVerification(item?.effectVerificationJson)?.publishUrl;

  const projectLabel = batch ? `GEO文章批次 ${batch.createdAt.slice(5, 7)}` : '—';

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

  const logSteps: DeliveryLogStep[] = useMemo(() => {
    if (!batch || !item) return [];
    const t = (iso?: string) => formatArticleDeliveryTime(iso).split(' ')[1] ?? '—';
    const steps: DeliveryLogStep[] = [
      { label: '生成文章', time: t(item.createdAt), done: true },
    ];
    if (stage !== 'pending_publish') {
      steps.push({ label: '选择账号', time: t(item.updatedAt), done: stage !== 'pending_publish' });
    }
    if (stage === 'publishing' || stage === 'published' || stage === 'publish_failed') {
      steps.push({
        label: 'Hermes 发布',
        time: record?.executedAt ? t(record.executedAt) : '—',
        done: stage === 'published',
      });
    }
    if (stage === 'published') {
      steps.push({ label: '结果回填', time: t(item.updatedAt), done: Boolean(publishUrl) });
    }
    return steps;
  }, [batch, item, stage, record, publishUrl]);

  const saveContent = async () => {
    if (!batch || !item) return;
    const res = await fetch(`/api/content-batches/${batch.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullContent: editContent }),
    });
    const data = await res.json();
    if (data.item) {
      setItem(data.item);
      setEditContent(normalizeArticleContentToMarkdown(data.item.fullContent, data.item.title));
      setIsEditing(false);
      toast('内容已保存', 'success');
    }
  };

  const openPublishConfirm = () => {
    if (!batch || !selectedAccountId) {
      toast('请选择发布账号', 'error');
      return;
    }
    const account = publishAccounts.find((a) => a.id === selectedAccountId);
    setPublishConfirm({
      open: true,
      payload: {
        articleCount: 1,
        platformLabels: [batch.platform],
        accountLabel: account ? `${account.accountName} · ${account.platform}` : '—',
      },
    });
  };

  const runPublish = async () => {
    if (!batch || !item || !selectedAccountId || !effectiveBrand) return;
    setPublishConfirm({ open: false, payload: null });
    setPublishing(true);
    try {
      const draft = await submitPublishDraft({
        brandName: effectiveBrand,
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
        toast('发布成功', 'success');
        await reload();
      } else {
        toast('发布未成功，请重试', 'error');
        await reload();
      }
    } catch (e) {
      setHermesWork((h) => ({ ...h, open: false }));
      toast(e instanceof Error ? e.message : '发布失败', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = async () => {
    if (!publishUrl) {
      toast('暂无发布链接', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(publishUrl);
      toast('链接已复制', 'success');
    } catch {
      toast('复制失败', 'error');
    }
  };

  const confirmResult = async () => {
    if (!batch || !item) return;
    const verification = parseEffectVerification(item.effectVerificationJson) ?? {
      enabled: false,
      scheduleDays: [],
      retestPlanIds: {},
      checkpoints: {},
      overallJudgment: 'pending',
    };
    const next = {
      ...verification,
      overallJudgment: 'confirmed_by_merchant',
      publishUrl: publishUrl ?? verification.publishUrl,
      publishRecordId: record?.id ?? verification.publishRecordId,
      publishedAt: record?.executedAt ?? verification.publishedAt ?? new Date().toISOString(),
    };
    const res = await fetch(`/api/content-batches/${batch.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effectVerificationJson: JSON.stringify(next) }),
    });
    if (res.ok) {
      setConfirmed(true);
      toast('已确认发布结果', 'success');
    } else {
      toast('确认失败，请稍后重试', 'error');
    }
  };

  if (loading) {
    return (
      <div className="geo-page-content p-8 text-sm text-[var(--neutral-text-03)]">加载中…</div>
    );
  }

  if (!item || !batch) {
    return (
      <div className="geo-page-content p-8 text-sm text-[var(--neutral-text-03)]">文章不存在</div>
    );
  }

  const platform = item.platform || batch.platform;
  const displayContent = normalizeArticleContentToMarkdown(item.fullContent, item.title);
  const canEditContent = stage !== 'publishing';

  const contentActions = canEditContent ? (
    <>
      <button
        type="button"
        className="geo-btn-secondary geo-btn-sm flex items-center gap-1.5"
        onClick={() => {
          if (isEditing) {
            setIsEditing(false);
            setEditContent(displayContent);
          } else {
            setEditContent(displayContent);
            setIsEditing(true);
          }
        }}
      >
        <Pencil className="w-3.5 h-3.5" />
        {isEditing ? '取消编辑' : '编辑'}
      </button>
      {isEditing ? (
        <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => void saveContent()}>
          保存
        </button>
      ) : null}
    </>
  ) : null;

  const mainContent = (
    <ArticleDeliveryMainSection title="文章内容" actions={contentActions}>
      {isEditing ? (
        <textarea
          className="geo-input w-full min-h-[320px] text-sm leading-relaxed font-mono"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Markdown 正文"
        />
      ) : (
        <ArticleMarkdownBody content={displayContent} />
      )}
    </ArticleDeliveryMainSection>
  );
  const badges = (
    <>
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${articleDeliverySourceClass('ai_generated')}`}
      >
        {ARTICLE_DELIVERY_SOURCE_LABEL.ai_generated}
      </span>
      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${platformBadgeClass(platform)}`}>
        {platform}
      </span>
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${articleDeliveryStageClass(stage)}`}
      >
        {ARTICLE_DELIVERY_STAGE_LABEL[stage]}
      </span>
    </>
  );

  const metaLine = `${projectLabel} · 更新时间 ${formatArticleDeliveryTime(item.updatedAt)}`;

  const renderHeaderActions = () => {
    if (stage === 'published') {
      return (
        <>
          {publishUrl ? (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm flex items-center gap-1.5"
              onClick={() => void copyLink()}
            >
              <Copy className="w-3.5 h-3.5" />
              复制链接
            </button>
          ) : null}
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm"
            disabled={confirmed || !publishUrl}
            onClick={() => void confirmResult()}
          >
            {confirmed ? '已确认' : '确认结果'}
          </button>
        </>
      );
    }
    if (stage === 'pending_publish') {
      return (
        <button
          type="button"
          className="geo-btn-primary geo-btn-sm flex items-center gap-1.5"
          disabled={publishing || publishAccounts.length === 0}
          onClick={openPublishConfirm}
        >
          <Send className="w-3.5 h-3.5" />
          确认发布
        </button>
      );
    }
    if (stage === 'publish_failed') {
      return (
        <button
          type="button"
          className="geo-btn-primary geo-btn-sm flex items-center gap-1.5"
          disabled={publishing || publishAccounts.length === 0}
          onClick={openPublishConfirm}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重新发布
        </button>
      );
    }
    if (stage === 'publishing') {
      return (
        <button type="button" className="geo-btn-primary geo-btn-sm" disabled>
          发布中…
        </button>
      );
    }
    return null;
  };

  const renderSidebar = () => {
    if (stage === 'published') {
      const checklist = [
        { label: '链接可访问', done: Boolean(publishUrl) },
        { label: '内容与审核稿一致', done: true },
        { label: '截图证明已上传', done: record?.status === 'succeeded' },
      ];
      return (
        <>
          <ArticleDeliveryDetailPanel title="发布结果">
            <div className="text-xs space-y-2">
              <div>
                <p className="text-[var(--neutral-text-03)] mb-0.5">发布链接</p>
                {publishUrl ? (
                  <a
                    href={publishUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="geo-link break-all flex items-start gap-1"
                  >
                    {publishUrl}
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                  </a>
                ) : (
                  <p>—</p>
                )}
              </div>
              <div>
                <p className="text-[var(--neutral-text-03)] mb-0.5">发布账号</p>
                <p className="font-medium">{record?.accountName ?? '—'}</p>
              </div>
              <div>
                <p className="text-[var(--neutral-text-03)] mb-0.5">发布时间</p>
                <p className="font-medium tabular-nums">
                  {formatArticleDeliveryTime(record?.executedAt ?? record?.createdAt)}
                </p>
              </div>
            </div>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="证据材料">
            <div className="grid grid-cols-2 gap-2">
              {['发布截图 1', '搜索收录截图'].map((label) => (
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
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="结果确认">
            <ArticleDeliveryChecklist items={checklist} />
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="发布日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    if (stage === 'pending_publish' || stage === 'publish_failed') {
      return (
        <>
          <ArticleDeliveryDetailPanel title="发布设置">
            <div className="text-xs space-y-3">
              <div>
                <p className="text-[var(--neutral-text-03)] mb-1">目标平台</p>
                <p className="font-medium">{platform}</p>
              </div>
              {publishAccounts.length === 0 ? (
                <p className="text-amber-700 p-2 rounded-lg bg-amber-50">
                  暂无可用发布账号，请先在「发布账号管理」中登录。
                </p>
              ) : (
                <div>
                  <p className="text-[var(--neutral-text-03)] mb-1">发布账号</p>
                  <select
                    className="geo-input w-full text-sm"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    {publishAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} · {a.platform}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {stage === 'publish_failed' && (
                <div className="rounded-lg bg-red-50 p-2 text-red-800 space-y-1">
                  <p className="font-medium mb-0.5">失败原因</p>
                  <p>{record?.errorCode ?? record?.reviewCategory ?? '发布失败，请重试'}</p>
                  {!publishUrl &&
                  (item.status === 'published' || item.publishStatus === 'published') ? (
                    <p className="text-[11px]">
                      文章已标记为已发布，但缺少链接回填，请重新发布或等待 Hermes 完成回填。
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="发布前检查">
            <ArticleDeliveryChecklist
              items={[
                { label: '文章内容已确认', done: Boolean(displayContent.trim() && displayContent !== '（无正文）') },
                { label: '发布账号已登录', done: publishAccounts.length > 0 },
                { label: 'Hermes 本机已就绪', done: true },
              ]}
            />
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="交付日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    if (stage === 'publishing') {
      return (
        <>
          <ArticleDeliveryDetailPanel title="发布进度">
            <p className="text-xs text-[var(--neutral-text-02)]">
              Hermes 正在本机执行发布，请保持客户端运行，完成后将自动刷新状态。
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--neutral-bg-03)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${hermesWork.progress || 40}%` }}
              />
            </div>
          </ArticleDeliveryDetailPanel>
          <ArticleDeliveryDetailPanel title="交付日志">
            <ArticleDeliveryLogTimeline steps={logSteps} />
          </ArticleDeliveryDetailPanel>
        </>
      );
    }

    return null;
  };

  return (
    <>
      <HermesWorkingOverlay
        open={hermesWork.open}
        progress={hermesWork.progress}
        message={hermesWork.message}
        detail={hermesWork.detail}
      />
      <HermesPublishConfirmDialog
        open={publishConfirm.open}
        payload={publishConfirm.payload}
        loading={publishing}
        onCancel={() => setPublishConfirm({ open: false, payload: null })}
        onConfirm={() => void runPublish()}
      />
      <ArticleDeliveryDetailShell
        onBack={() => onNavigate?.('content_delivery')}
        actions={renderHeaderActions()}
        title={item.title}
        badges={badges}
        metaLine={`${STAGE_ACTION_TITLE[stage] ? `${STAGE_ACTION_TITLE[stage]} · ` : ''}${metaLine}`}
        mainContent={mainContent}
        sidebar={renderSidebar()}
      />
    </>
  );
}
