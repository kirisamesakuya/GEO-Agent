/**
 * 自定义发布页：手动选择任务类型（发布文章 / 网页改装 / 其他）。
 * 一期 CUSTOM_PUBLISH_ENABLED=false 时不在 CreateOrderView 挂载，代码保留供下期启用。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ViewType } from '../types';
import { useToast } from '../context/ToastContext';
import { isArticleContentOrder } from '../lib/task-order-flow';
import { createArticleWritingOrder } from '../lib/create-task-order';
import {
  type ActiveCustomTaskKind,
  ACTIVE_CUSTOM_TASK_OPTIONS,
  platformsForTaskKind,
  ARTICLE_DIRECTIONS,
} from '../lib/custom-order-types';
import CreateWebsiteView from './CreateWebsiteView';

interface TaskOrderRow {
  id: string;
  title: string;
  platform: string;
  budget: number;
  status: string;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  initialTaskKind?: ActiveCustomTaskKind;
}

export default function CustomOrderView({
  brandName,
  onBrandChange,
  onNavigate,
  initialTaskKind = 'article_writing',
}: Props) {
  const { toast } = useToast();
  const [taskKind, setTaskKind] = useState<ActiveCustomTaskKind>(initialTaskKind);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<TaskOrderRow[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const isArticle = taskKind === 'article_writing';
  const platforms = platformsForTaskKind(taskKind);

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState(platforms[0]);
  const [direction, setDirection] = useState<(typeof ARTICLE_DIRECTIONS)[number]>('种草');
  const [articleCount, setArticleCount] = useState(1);
  const [wordCount, setWordCount] = useState(800);
  const [keywords, setKeywords] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [budget, setBudget] = useState(500);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    if (initialTaskKind) setTaskKind(initialTaskKind);
  }, [initialTaskKind]);

  useEffect(() => {
    if (!platforms.includes(platform)) setPlatform(platforms[0]);
  }, [taskKind, platform, platforms]);

  const syncTaskToUrl = (kind: ActiveCustomTaskKind) => {
    const url = new URL(window.location.href);
    url.searchParams.set('orderTask', kind);
    window.history.replaceState({}, '', url);
  };

  const selectTaskKind = (kind: ActiveCustomTaskKind) => {
    setTaskKind(kind);
    syncTaskToUrl(kind);
  };

  const loadPending = useCallback(() => {
    if (!brandName || brandName === '__all__' || !isArticle) {
      setPendingOrders([]);
      return;
    }
    setLoadingPending(true);
    fetch(`/api/orders?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.orders ?? []).filter(
          (o: TaskOrderRow & { type?: string }) =>
            isArticleContentOrder(o) && o.status === 'published'
        );
        setPendingOrders(rows.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  }, [brandName, isArticle]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const submitArticle = async () => {
    if (!brandName || brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { order, error } = await createArticleWritingOrder({
        brandName,
        title: title.trim() || undefined,
        platform,
        direction,
        articleCount,
        wordCount,
        keywords,
        referenceNote,
        budget,
        reviewNote,
      });
      if (error) {
        toast(error, 'error');
        return;
      }
      toast('写作任务已发布，请在任务交付跟踪审稿与验收', 'success');
      setTitle('');
      setKeywords('');
      setReferenceNote('');
      setReviewNote('');
      loadPending();
      if (onNavigate && order?.id) onNavigate('content_delivery', order.id);
    } catch {
      toast('发布失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingHint = useMemo(
    () => (isArticle && pendingOrders.length > 0 ? pendingOrders : null),
    [isArticle, pendingOrders]
  );

  const selectedTask = ACTIVE_CUSTOM_TASK_OPTIONS.find((o) => o.id === taskKind);

  if (taskKind === 'website') {
    return (
      <CreateWebsiteView
        brandName={brandName}
        onBrandChange={onBrandChange}
        onNavigate={onNavigate}
        embedded
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto geo-page-content space-y-4 max-w-3xl">
      <div className="geo-card p-5 space-y-4">
        <div>
          <label className="geo-label">任务类型</label>
          <select
            className="geo-input w-full mt-1 text-sm"
            value={taskKind}
            onChange={(e) => selectTaskKind(e.target.value as ActiveCustomTaskKind)}
          >
            {ACTIVE_CUSTOM_TASK_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          {selectedTask?.desc && (
            <p className="text-[11px] mt-1.5 text-[var(--neutral-text-03)]">{selectedTask.desc}</p>
          )}
        </div>

        <div>
          <label className="geo-label">任务标题（可选）</label>
          <input
            className="geo-input w-full mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="留空将按平台与篇数自动生成"
          />
        </div>

        <div>
          <label className="geo-label">目标平台</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`text-xs px-3 py-1.5 rounded-lg ${
                  platform === p ? 'geo-nav-active' : 'geo-nav-item'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="geo-label">内容方向</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {ARTICLE_DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`text-xs px-3 py-1.5 rounded-lg ${
                  direction === d ? 'geo-nav-active' : 'geo-nav-item'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="geo-label">篇数</label>
            <input
              type="number"
              min={1}
              max={20}
              className="geo-input w-full mt-1"
              value={articleCount}
              onChange={(e) => setArticleCount(Number(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="geo-label">目标字数/篇</label>
            <input
              type="number"
              min={300}
              step={100}
              className="geo-input w-full mt-1"
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value) || 800)}
            />
          </div>
          <div>
            <label className="geo-label">预算（元）</label>
            <input
              type="number"
              min={1}
              className="geo-input w-full mt-1"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label className="geo-label">关键词 / 选题要点</label>
          <textarea
            className="geo-input w-full mt-1 min-h-[72px]"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="每行或逗号分隔"
          />
        </div>
        <div>
          <label className="geo-label">参考资料说明</label>
          <textarea
            className="geo-input w-full mt-1 min-h-[56px]"
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
          />
        </div>
        <div>
          <label className="geo-label">审稿与验收补充</label>
          <textarea
            className="geo-input w-full mt-1 min-h-[56px]"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="例如：需含门店地址、禁止夸张疗效表述、必须上传发布截图"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            className="geo-btn-primary text-sm"
            disabled={submitting || brandName === '__all__'}
            onClick={() => void submitArticle()}
          >
            {submitting ? '发布中…' : '发布到资源平台'}
          </button>
          {onNavigate && (
            <button
              type="button"
              className="geo-btn-secondary text-sm"
              onClick={() => onNavigate('content_delivery', 'manual')}
            >
              任务交付
            </button>
          )}
        </div>
      </div>

      {pendingHint && (
        <div className="geo-card p-4 space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--neutral-text-02)' }}>
            待领取的文章写作单（最近 {pendingHint.length} 条）
          </p>
          {loadingPending ? (
            <p className="text-xs text-[var(--neutral-text-03)]">加载中…</p>
          ) : (
            pendingHint.map((o) => (
              <div key={o.id} className="flex justify-between items-center gap-2 text-xs">
                <span className="truncate">{o.title}</span>
                {onNavigate && (
                  <button
                    type="button"
                    className="geo-link shrink-0"
                    onClick={() => onNavigate('content_delivery', o.id)}
                  >
                    查看
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
