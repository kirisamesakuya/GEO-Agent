import { useState, useCallback, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { ViewType } from '../types';
import type { AccountBinding, Article, AgentTask, AgentTaskStatus } from '../types';
import { useAgentTaskPolling } from '../hooks/useAgentTaskPolling';
import AgentInputCard from './common/AgentInputCard';
import { resolveTaskPillDisplay } from '../lib/agent-task-display';
import { formatGeoReportLabel } from '../lib/geo-report';
import { useToast } from '../context/ToastContext';
import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../lib/publish-accounts';
import { isPublishReady } from '../lib/publish-account-login-status';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import ArticleGenerationSummaryPanel, {
  type GenerationPreview,
} from './article/ArticleGenerationSummaryPanel';
import type { ArticleQualityChecks } from '../lib/content-item-meta';
import { submitPublishDraft } from '../lib/publish-draft-client';
import { parseIndexingGapFromUrl, parseIndexingGapHint } from '../lib/article-effect-nav';
import { ARTICLE_PUBLISH_PLATFORM_LABELS } from '../../lib/media-platforms';
import { platformMatches } from '../lib/content-library-platforms';
import ArticlePlatformPicker from './article/ArticlePlatformPicker';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onTaskStatusChange?: (status: AgentTaskStatus | null) => void;
  initialMode?: 'quick';
  indexingGapHint?: string;
  audience?: 'publisher' | 'provider';
  onNavigate?: (view: ViewType, hint?: string) => void;
}

interface GeoReportOption {
  id: string;
  brandName: string;
  title?: string | null;
  reportType?: string | null;
  gapsFound?: number | null;
  createdAt: string;
}

const DIRECTIONS = ['种草', '探店', 'FAQ', '测评'] as const;
const TONES = ['自然', '专业', '克制'] as const;
const WRITING_TYPES = [
  { id: 'geo', label: 'GEO 标准' },
  { id: 'top', label: 'TOP 类' },
  { id: 'review', label: '测评类' },
  { id: 'research', label: '研究报告类' },
] as const;
const KNOWLEDGE_CATS = [
  { id: 'intro', label: '企业介绍' },
  { id: 'product', label: '产品服务' },
  { id: 'faq', label: 'FAQ' },
  { id: 'case', label: '客户案例' },
  { id: 'credential', label: '资质背书' },
] as const;

const QUICK_QUANTITIES = [1, 3, 5] as const;
const MAX_ARTICLE_QUANTITY = 5;
const QUICK_WORD_COUNTS = [800, 1200, 1500] as const;
const MIN_WORD_COUNT = 300;
const MAX_WORD_COUNT = 3000;

const REPORT_TYPE_LABEL: Record<string, string> = {
  quick_start: '快速检测',
  audit: '专业审计',
  analysis: 'GEO 分析',
};

function isAuthorizedAccount(account: AccountBinding) {
  return isPublishReady(account.status);
}

function ArticleFormSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0"
      style={{ borderColor: 'var(--neutral-divider-02)' }}
    >
      <h4 className="text-xs font-semibold text-[var(--color-title)] flex items-center gap-2">
        <span
          className="inline-flex w-5 h-5 shrink-0 rounded-full items-center justify-center text-[10px] font-bold"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
        >
          {index}
        </span>
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">{children}</label>
  );
}

function SegmentedGroup<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  stackBelowSm = false,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  stackBelowSm?: boolean;
}) {
  const buttonClass = stackBelowSm
    ? 'border-b last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 w-full sm:w-auto'
    : 'border-r last:border-r-0';

  return (
    <div
      className={`rounded-md border overflow-hidden bg-white ${
        stackBelowSm ? 'flex flex-col w-full sm:grid sm:w-full' : `inline-grid ${className}`
      }`}
      style={{
        borderColor: 'var(--neutral-divider-02)',
        ...(stackBelowSm
          ? ({ '--geo-segment-cols': options.length } as CSSProperties)
          : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }),
      }}
      data-segment-cols={stackBelowSm ? options.length : undefined}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`text-xs px-3 py-2 ${buttonClass} font-medium transition ${
              active
                ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]'
                : 'text-[var(--neutral-text-02)] hover:bg-[var(--neutral-bg-03)]'
            }`}
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterChip({
  selected,
  children,
  onClick,
}: {
  key?: string | number;
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition ${
        selected
          ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'bg-white border-[var(--neutral-divider-02)] text-[var(--neutral-text-02)] hover:bg-[var(--neutral-bg-03)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function GenerateArticleView({
  brandName,
  onBrandChange,
  onTaskStatusChange,
  initialMode,
  indexingGapHint,
  audience = 'publisher',
  onNavigate,
}: Props) {
  const isProviderTool = audience === 'provider';
  const [useReferenceRewrite, setUseReferenceRewrite] = useState(false);
  const gapFromHint =
    parseIndexingGapHint(indexingGapHint) ??
    parseIndexingGapFromUrl();
  const [sourceType, setSourceType] = useState<'brand_profile' | 'geo_report' | 'indexing_result'>(
    gapFromHint ? 'indexing_result' : 'brand_profile'
  );
  const [sourceIndexPlanId, setSourceIndexPlanId] = useState(gapFromHint?.planId ?? '');
  const [sourceIndexResultIds, setSourceIndexResultIds] = useState<string[]>(gapFromHint?.resultIds ?? []);
  const [geoReports, setGeoReports] = useState<GeoReportOption[]>([]);
  const [selectedGeoReportId, setSelectedGeoReportId] = useState('');
  const [targetPlatform, setTargetPlatform] = useState(ARTICLE_PUBLISH_PLATFORM_LABELS[0]);
  const [quantity, setQuantity] = useState(initialMode === 'quick' ? 1 : 3);
  const [contentDirection, setContentDirection] = useState<(typeof DIRECTIONS)[number]>('种草');
  const [tone, setTone] = useState<(typeof TONES)[number]>('自然');
  const [intensity, setIntensity] = useState(25);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [knowledgeCategories, setKnowledgeCategories] = useState<string[]>(['intro', 'product', 'faq']);
  const [templateType, setTemplateType] = useState('geo');
  const [wordCount, setWordCount] = useState(800);
  const [referenceText, setReferenceText] = useState('');
  const [titleLevels, setTitleLevels] = useState(2);
  const [autoPublish, setAutoPublish] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [inputPreview, setInputPreview] = useState<GenerationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [qualityChecks, setQualityChecks] = useState<ArticleQualityChecks | null>(null);
  const [gateWarnings, setGateWarnings] = useState<string[]>([]);
  const [contentBatchId, setContentBatchId] = useState<string | null>(null);
  const [awaitingPublish, setAwaitingPublish] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const { toast } = useToast();

  const buildTaskInput = useCallback(() => {
    const base = {
      source: sourceType,
      geoReportId: sourceType === 'geo_report' ? selectedGeoReportId || undefined : undefined,
      sourceIndexPlanId: sourceType === 'indexing_result' ? sourceIndexPlanId || undefined : undefined,
      sourceIndexResultIds: sourceType === 'indexing_result' ? sourceIndexResultIds : undefined,
      effectVerification:
        sourceType === 'indexing_result'
          ? { enabled: true, scheduleDays: [7, 14, 30] }
          : undefined,
      brand: brandName,
      targetPlatform,
      negativeKeywords: forbiddenWords,
      knowledgeCategories,
      qualityChecks: ['forbidden_words', 'fact_coverage', 'geo_citability'],
    };
    if (useReferenceRewrite) {
      return { ...base, referenceText };
    }
    return {
      ...base,
      contentDirection,
      tone,
      marketingIntensity: intensity,
      quantity,
      autoPublish,
      templateType,
      wordCount,
      titleLevels,
    };
  }, [
    sourceType,
    selectedGeoReportId,
    sourceIndexPlanId,
    sourceIndexResultIds,
    brandName,
    targetPlatform,
    forbiddenWords,
    knowledgeCategories,
    useReferenceRewrite,
    referenceText,
    contentDirection,
    tone,
    intensity,
    quantity,
    autoPublish,
    templateType,
    wordCount,
    titleLevels,
  ]);

  useEffect(() => {
    if (!brandName || brandName === '__all__') return;
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((p) => {
        if (p.forbiddenWords?.length) setForbiddenWords(p.forbiddenWords);
      })
      .catch(() => {});
    fetch(`/api/geo-reports?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        const reports = (d.reports ?? []) as GeoReportOption[];
        setGeoReports(reports);
        if (reports[0]) setSelectedGeoReportId(reports[0].id);
      })
      .catch(() => setGeoReports([]));
    void fetchAvailablePublishAccounts(brandName)
      .then((rows) => setAccounts(rows.map(toAccountBindingShape)))
      .catch(() => setAccounts([]));
  }, [brandName]);

  const handleTaskUpdate = useCallback(
    (task: AgentTask) => {
      const pill = resolveTaskPillDisplay(task);
      setTaskStatus(pill.status);
      setTaskProgress(task.progress);
      onTaskStatusChange?.(pill.status);
      if (['running', 'queued'].includes(task.status)) setLoading(true);
    },
    [onTaskStatusChange]
  );

  const loadBatchArticles = useCallback(async (batchId: string) => {
    const res = await fetch(`/api/content-batches/${batchId}`);
    const data = await res.json();
    const items = data.batch?.items ?? [];
    const mapped: Article[] = items.map(
      (
        item: {
          id: string;
          batchId: string;
          title: string;
          platform: string;
          previewText: string;
          fullContent: string;
          structure: string;
          status: string;
          version: number;
        },
        idx: number
      ) => ({
        id: idx + 1,
        contentItemId: item.id,
        batchId: item.batchId,
        version: item.version,
        title: item.title,
        platform: item.platform as Article['platform'],
        status: item.status === 'published' ? '已发布' : '已完成',
        previewText: item.previewText,
        fullContent: item.fullContent,
        structure: item.structure,
      })
    );
    if (mapped.length) setArticles(mapped);
    return mapped;
  }, []);

  const handleTaskComplete = useCallback(
    async (task: AgentTask) => {
      setLoading(false);
      onTaskStatusChange?.(resolveTaskPillDisplay(task).status);

      const qc = task.output?.qualityChecks as ArticleQualityChecks | undefined;
      if (qc) setQualityChecks(qc);

      const batchId = task.output?.contentBatchId as string | undefined;
      if (batchId) {
        setContentBatchId(batchId);
        setAwaitingPublish(
          !isProviderTool && (Boolean(task.output?.awaitingPublishConfirm) || autoPublish)
        );
        try {
          const mapped = await loadBatchArticles(batchId);
          if (mapped.length) {
            const qcWarn =
              qc?.forbiddenWords?.passed === false
                ? '（含禁用词风险，发布前请修改）'
                : '';
            toast(
              task.type === 'article_rewrite'
                ? `AI 改写完成，已进入文章结果${qcWarn}`
                : `已进入文章结果 ${mapped.length} 篇${qcWarn}`,
              qc?.forbiddenWords?.passed === false ? 'error' : 'success'
            );
            return;
          }
        } catch {
          // fall through
        }
      }
    },
    [autoPublish, isProviderTool, loadBatchArticles, onTaskStatusChange, toast]
  );

  useAgentTaskPolling({
    taskId: activeTaskId,
    onUpdate: handleTaskUpdate,
    onComplete: handleTaskComplete,
  });

  const loadInputPreview = useCallback(async () => {
    if (sourceType === 'geo_report' && !selectedGeoReportId) {
      toast('请选择一份 GEO 报告', 'error');
      return null;
    }
    if (sourceType === 'indexing_result' && (!sourceIndexPlanId || sourceIndexResultIds.length === 0)) {
      toast('请从排名监控选择采样结果', 'error');
      return null;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/article-generation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, input: buildTaskInput() }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return null;
      }
      setInputPreview(data.preview);
      return data.preview as GenerationPreview;
    } catch {
      toast('预览失败', 'error');
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }, [brandName, buildTaskInput, selectedGeoReportId, sourceIndexPlanId, sourceIndexResultIds, sourceType, toast]);

  useEffect(() => {
    if (sourceType !== 'geo_report' || !selectedGeoReportId || !brandName || brandName === '__all__') {
      return;
    }
    void loadInputPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在来源/报告切换时刷新侧栏摘要
  }, [sourceType, selectedGeoReportId, brandName]);

  useEffect(() => {
    if (sourceType !== 'indexing_result' || !sourceIndexResultIds.length || !brandName || brandName === '__all__') {
      return;
    }
    void loadInputPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceIndexPlanId, sourceIndexResultIds.join(','), brandName]);

  const openSubmitConfirm = async () => {
    if (useReferenceRewrite && !referenceText.trim()) {
      toast('请粘贴参考文章，或关闭「参考重写」', 'error');
      return;
    }
    const res = await fetch(`/api/gate/status?brandName=${encodeURIComponent(brandName)}`);
    const gate = await res.json();
    const warnings: string[] = [];
    if (!gate.canSubmitArticle && !gate.brandComplete) {
      warnings.push(`品牌资料不完整：${gate.missingFields?.join('、')}`);
    }
    if (sourceType === 'geo_report' && !selectedGeoReportId) {
      warnings.push('未选择 GEO 报告');
    }
    if (sourceType === 'indexing_result' && sourceIndexResultIds.length === 0) {
      warnings.push('未选择排名采样结果');
    }
    setGateWarnings(warnings);
    if (!inputPreview) await loadInputPreview();
    setShowSubmitModal(true);
  };

  const handleGenerate = async () => {
    setShowSubmitModal(false);
    setArticles([]);
    setContentBatchId(null);
    setAwaitingPublish(false);
    setQualityChecks(null);
    setLoading(true);
    setTaskStatus('queued');
    onTaskStatusChange?.('queued');

    try {
      const taskType = useReferenceRewrite ? 'article_rewrite' : 'article_generation';
      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: taskType,
          title: `${brandName} · ${targetPlatform} ${useReferenceRewrite ? '参考重写' : '文章生成'}`,
          brandName,
          input: buildTaskInput(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        setLoading(false);
        return;
      }
      if (data.task) {
        setActiveTaskId(data.task.id);
        toast('Web AI 写作任务已提交', 'info');
      }
    } catch {
      setLoading(false);
      setTaskStatus('failed');
    }
  };

  const confirmPublish = async () => {
    if (!contentBatchId || !selectedAccountId) {
      toast('请选择发布账号', 'error');
      return;
    }
    if (qualityChecks?.forbiddenWords?.passed === false) {
      toast('禁用词未通过，请先修改文章结果中的内容后再发布', 'error');
      return;
    }
    setPublishLoading(true);
    try {
      const data = await submitPublishDraft({
        batchId: contentBatchId,
        brandName,
        accountBindingId: selectedAccountId,
        contentItemIds: articles.map((a) => a.contentItemId).filter(Boolean) as string[],
      });
      setAwaitingPublish(false);
      toast('已确认发布，Hermes 任务已入队', 'success');
      if (data.task?.id) {
        setActiveTaskId(data.task.id);
        setTaskStatus('queued');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '发布失败', 'error');
    } finally {
      setPublishLoading(false);
    }
  };

  const publishAccounts = accounts.filter((a) => platformMatches(targetPlatform, a.platform));
  const authorizedPublishAccounts = publishAccounts.filter(isAuthorizedAccount);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const clampQuantity = (value: number) =>
    Math.max(1, Math.min(MAX_ARTICLE_QUANTITY, Math.floor(value) || 1));

  const clampWordCount = (value: number) =>
    Math.max(MIN_WORD_COUNT, Math.min(MAX_WORD_COUNT, Math.floor(value) || MIN_WORD_COUNT));

  useEffect(() => {
    if (authorizedPublishAccounts.length === 0) {
      setSelectedAccountId('');
      return;
    }
    if (!authorizedPublishAccounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(authorizedPublishAccounts[0].id);
    }
  }, [authorizedPublishAccounts, selectedAccountId]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="geo-page-content max-w-7xl space-y-4">
        <PageHeaderWithBrand
          title="生成 GEO 文章"
          brandName={brandName}
          onBrandChange={onBrandChange}
        />

        <div className="grid gap-4 xl:gap-5 items-start xl:grid-cols-12">
          <div className="xl:col-span-6 2xl:col-span-5 min-w-0 space-y-4">
            <AgentInputCard
              title="写作参数"
              footer={
                <>
                  <button
                    type="button"
                    className="geo-btn-secondary text-sm px-5 w-full sm:w-auto"
                    onClick={() => void loadInputPreview()}
                    disabled={loading}
                  >
                    预览输入摘要
                  </button>
                  <button
                    type="button"
                    className="geo-btn-primary text-sm w-full sm:w-auto sm:px-8 sm:min-w-[210px]"
                    onClick={() => void openSubmitConfirm()}
                    disabled={loading}
                  >
                    {loading ? '生成中…' : '提交 Web AI 写作任务'}
                  </button>
                </>
              }
            >
              <div className="grid gap-5">
                <ArticleFormSection index={1} title="基础设定">
                  <div>
                    <FieldLabel>生成来源</FieldLabel>
                    <SegmentedGroup
                      className="w-full"
                      stackBelowSm
                      value={sourceType}
                      onChange={(next) => {
                        setSourceType(next);
                        if (next === 'geo_report' && !selectedGeoReportId && geoReports[0]?.id) {
                          setSelectedGeoReportId(geoReports[0].id);
                        }
                      }}
                      options={[
                        { value: 'brand_profile', label: '按品牌资料生成' },
                        { value: 'geo_report', label: '根据 GEO 报告生成' },
                        { value: 'indexing_result', label: '根据排名缺口生成' },
                      ]}
                    />
                  </div>

                  {sourceType === 'indexing_result' && (
                    <div className="text-xs geo-callout-warning p-3 space-y-1">
                      <p>
                        已绑定 <strong>{sourceIndexResultIds.length}</strong> 条排名采样
                        {sourceIndexPlanId ? `（计划 ${sourceIndexPlanId.slice(0, 8)}…）` : ''}
                      </p>
                      <p>发布后自动创建 T+7 / T+14 / T+30 复测计划</p>
                      {!sourceIndexResultIds.length && onNavigate && (
                        <button type="button" className="geo-link" onClick={() => onNavigate('indexing_rank')}>
                          去排名监控选择
                        </button>
                      )}
                    </div>
                  )}

                  {sourceType === 'geo_report' && (
                    <div>
                      <FieldLabel>关联报告</FieldLabel>
                      {geoReports.length === 0 ? (
                        <p className="text-xs geo-callout-warning p-2">
                          暂无 GEO 报告，请先在 GEO 分析或专业审计中生成报告。
                          {onNavigate && (
                            <button
                              type="button"
                              className="geo-link ml-1"
                              onClick={() => onNavigate('geo_analysis')}
                            >
                              去 GEO 分析
                            </button>
                          )}
                        </p>
                      ) : (
                        <select
                          className="geo-input w-full text-sm"
                          value={selectedGeoReportId}
                          onChange={(e) => setSelectedGeoReportId(e.target.value)}
                        >
                          {geoReports.map((r) => (
                            <option key={r.id} value={r.id}>
                              {REPORT_TYPE_LABEL[r.reportType ?? ''] ?? r.reportType ?? 'GEO 报告'} · 缺口
                              {r.gapsFound ?? '—'} · {formatGeoReportLabel(r).slice(0, 48)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {!useReferenceRewrite && (
                    <div>
                      <FieldLabel>写作类型</FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {WRITING_TYPES.map((t) => (
                          <FilterChip
                            key={t.id}
                            selected={templateType === t.id}
                            onClick={() => setTemplateType(t.id)}
                          >
                            {t.label}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  )}
                </ArticleFormSection>

                <ArticleFormSection index={2} title="知识引用与平台">
                  <div>
                    <FieldLabel>知识库引用</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {KNOWLEDGE_CATS.map((c) => (
                        <FilterChip
                          key={c.id}
                          selected={knowledgeCategories.includes(c.id)}
                          onClick={() =>
                            setKnowledgeCategories((prev) =>
                              prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                            )
                          }
                        >
                          {c.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>目标平台</FieldLabel>
                    <ArticlePlatformPicker value={targetPlatform} onChange={setTargetPlatform} />
                  </div>
                </ArticleFormSection>

                {!useReferenceRewrite && (
                  <ArticleFormSection index={3} title="个性化微调">
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <FieldLabel>篇幅数量</FieldLabel>
                        <div className="flex flex-wrap items-center gap-1.5 gap-y-2">
                          {QUICK_QUANTITIES.map((n) => (
                            <FilterChip
                              key={n}
                              selected={quantity === n}
                              onClick={() => setQuantity(n)}
                            >
                              {n}
                            </FilterChip>
                          ))}
                          <div className="inline-flex items-center gap-1.5 w-full sm:w-auto sm:ml-auto">
                            <span className="text-xs text-[var(--neutral-text-02)] shrink-0 whitespace-nowrap">
                              自定义
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={MAX_ARTICLE_QUANTITY}
                              className="geo-input geo-input-sm geo-input-fixed geo-input-fixed-sm text-xs"
                              value={quantity}
                              onChange={(e) => setQuantity(clampQuantity(Number(e.target.value)))}
                              aria-label="自定义篇幅数量"
                            />
                            <span className="text-xs text-[var(--neutral-text-03)] shrink-0 whitespace-nowrap">
                              篇
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <FieldLabel>目标字数</FieldLabel>
                        <div className="flex flex-wrap items-center gap-1.5 gap-y-2">
                          {QUICK_WORD_COUNTS.map((n) => (
                            <FilterChip
                              key={n}
                              selected={wordCount === n}
                              onClick={() => setWordCount(n)}
                            >
                              {n}
                            </FilterChip>
                          ))}
                          <div className="inline-flex items-center gap-1.5 w-full sm:w-auto sm:ml-auto">
                            <span className="text-xs text-[var(--neutral-text-02)] shrink-0 whitespace-nowrap">
                              自定义
                            </span>
                            <input
                              type="number"
                              min={MIN_WORD_COUNT}
                              max={MAX_WORD_COUNT}
                              className="geo-input geo-input-sm geo-input-fixed geo-input-fixed-md text-xs"
                              value={wordCount}
                              onChange={(e) => setWordCount(clampWordCount(Number(e.target.value)))}
                              aria-label="自定义目标字数"
                            />
                            <span className="text-xs text-[var(--neutral-text-03)] shrink-0 whitespace-nowrap">
                              字
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <FieldLabel>内容方向</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          {DIRECTIONS.map((d) => (
                            <FilterChip
                              key={d}
                              selected={contentDirection === d}
                              onClick={() => setContentDirection(d)}
                            >
                              {d}
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                        <FieldLabel>语气</FieldLabel>
                        <SegmentedGroup
                          className="w-full max-w-[240px]"
                          value={tone}
                          onChange={setTone}
                          options={TONES.map((t) => ({ value: t, label: t }))}
                        />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <FieldLabel>营销强度</FieldLabel>
                        <span className="text-xs font-medium text-[var(--neutral-text-02)]">{intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full accent-[var(--color-accent)]"
                      />
                    </div>

                    {!isProviderTool && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={autoPublish}
                          onChange={(e) => setAutoPublish(e.target.checked)}
                        />
                        生成后引导发布确认（不自动发帖）
                      </label>
                    )}
                  </ArticleFormSection>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-title)]">参考重写</p>
                      <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">
                        开启后粘贴参考文章结构或全文，按参考改写而非从零生成
                      </p>
                    </div>
                    <label className="relative inline-flex shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={useReferenceRewrite}
                        onChange={(e) => setUseReferenceRewrite(e.target.checked)}
                      />
                      <span
                        className="relative block w-9 h-5 rounded-full bg-[var(--neutral-divider-02)] transition-colors peer-checked:bg-[var(--color-accent)] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
                        aria-hidden
                      />
                    </label>
                  </div>
                  {useReferenceRewrite && (
                    <textarea
                      className="geo-input w-full text-sm min-h-[120px]"
                      placeholder="粘贴参考文章结构或全文"
                      value={referenceText}
                      onChange={(e) => setReferenceText(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </AgentInputCard>

            {!isProviderTool && awaitingPublish && contentBatchId && articles.length > 0 && (
              <div className="geo-card p-4 space-y-3">
                <p className="text-sm font-medium">确认发布到自有账号</p>
                <div className="flex flex-wrap gap-2">
                  {publishAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      disabled={!isAuthorizedAccount(account)}
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`text-xs px-3 py-2 rounded-md ${selectedAccountId === account.id ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      {account.accountName}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="geo-btn-primary text-sm"
                  disabled={publishLoading || !selectedAccountId}
                  onClick={() => void confirmPublish()}
                >
                  {publishLoading ? '提交中…' : '确认发布（Hermes 执行）'}
                </button>
                {selectedAccount && (
                  <p className="text-xs text-[var(--neutral-text-03)]">
                    {selectedAccount.platform} / {selectedAccount.accountName}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="xl:col-span-6 2xl:col-span-7 min-w-0">
            <ArticleGenerationSummaryPanel
              preview={inputPreview}
              previewLoading={previewLoading}
              qualityChecks={qualityChecks}
              taskStatus={taskStatus}
              taskProgress={taskProgress}
              loading={loading}
              contentBatchId={contentBatchId}
              articleCount={articles.length}
              onPreviewInput={() => void loadInputPreview()}
              onViewReport={
                inputPreview?.geoReportId && onNavigate
                  ? () => onNavigate('geo_analysis')
                  : undefined
              }
              onOpenContentLibrary={
                onNavigate ? () => onNavigate('content_delivery', 'self') : undefined
              }
              onOpenProviderOrder={
                onNavigate ? () => onNavigate('create_order', 'ai') : undefined
              }
            />
          </div>
        </div>
      </div>

      {showSubmitModal && (
        <div className="geo-modal-backdrop" role="dialog" aria-modal="true">
          <div className="geo-modal max-w-md">
            <div className="geo-modal-head">
              <h3 className="font-bold text-sm">确认提交写作任务</h3>
            </div>
            <div className="geo-modal-body">
              <p className="text-sm text-[var(--neutral-text-02)]">
                {useReferenceRewrite
                  ? `将为 ${brandName} 按参考文改写 ${targetPlatform} 文章（${inputPreview?.modelLabel ?? 'Web AI'}）。`
                  : `将为 ${brandName} 生成 ${quantity} 篇 ${targetPlatform} 文章（${inputPreview?.modelLabel ?? 'Web AI'}）。`}
              </p>
              {gateWarnings.length > 0 && (
                <div className="geo-callout-warning mt-4 text-xs space-y-1">
                  {gateWarnings.map((w) => (
                    <p key={w}>⚠ {w}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="geo-modal-foot">
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm"
                onClick={() => setShowSubmitModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                onClick={() => void handleGenerate()}
                disabled={gateWarnings.some((w) => w.includes('未选择'))}
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
