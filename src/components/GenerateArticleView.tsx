import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ViewType } from '../types';
import type { AccountBinding, Article, AgentTask, AgentTaskStatus } from '../types';
import { useAgentTaskPolling } from '../hooks/useAgentTaskPolling';
import AgentInputCard from './common/AgentInputCard';
import { resolveTaskPillDisplay } from '../lib/agent-task-display';
import { formatGeoReportLabel } from '../lib/geo-report';
import { useToast } from '../context/ToastContext';
import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../lib/publish-accounts';
import { isPublishReady } from '../lib/publish-account-login-status';
import BrandScopeBar from './common/BrandScopeBar';
import ArticleGenerationSummaryPanel, {
  type GenerationPreview,
} from './article/ArticleGenerationSummaryPanel';
import type { ArticleQualityChecks } from '../lib/content-item-meta';
import { submitPublishDraft } from '../lib/publish-draft-client';
import { parseIndexingGapFromUrl, parseIndexingGapHint } from '../lib/article-effect-nav';
import { ARTICLE_PUBLISH_PLATFORM_LABELS } from '../../lib/media-platforms';
import { platformMatches } from '../lib/content-library-platforms';

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
const CREATE_MODES = [
  { id: 'quick', label: '一键创作' },
  { id: 'geo', label: 'GEO 文章' },
  { id: 'template', label: '高级模板' },
  { id: 'rewrite', label: '参考重写' },
] as const;
const TEMPLATES = [
  { id: 'top', label: 'TOP 类' },
  { id: 'review', label: '测评类' },
  { id: 'research', label: '研究报告类' },
  { id: 'custom', label: '自定义' },
] as const;
const KNOWLEDGE_CATS = [
  { id: 'intro', label: '企业介绍' },
  { id: 'product', label: '产品服务' },
  { id: 'faq', label: 'FAQ' },
  { id: 'case', label: '客户案例' },
  { id: 'credential', label: '资质背书' },
] as const;

const REPORT_TYPE_LABEL: Record<string, string> = {
  quick_start: '快速检测',
  audit: '专业审计',
  analysis: 'GEO 分析',
};

function isAuthorizedAccount(account: AccountBinding) {
  return isPublishReady(account.status);
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
  const [createMode, setCreateMode] = useState<(typeof CREATE_MODES)[number]['id']>(
    initialMode === 'quick' ? 'quick' : 'geo'
  );
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
  const [quantity, setQuantity] = useState(3);
  const [contentDirection, setContentDirection] = useState<(typeof DIRECTIONS)[number]>('种草');
  const [tone, setTone] = useState<(typeof TONES)[number]>('自然');
  const [intensity, setIntensity] = useState(25);
  const [keywordOptions, setKeywordOptions] = useState<Array<{ id: string; term: string }>>([]);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([]);
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

  const keywords = useMemo(
    () =>
      keywordOptions.filter((k) => selectedKeywordIds.includes(k.id)).map((k) => k.term),
    [keywordOptions, selectedKeywordIds]
  );

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
    if (createMode === 'rewrite') {
      return { ...base, referenceText };
    }
    return {
      ...base,
      contentDirection,
      tone,
      marketingIntensity: intensity,
      keywords,
      quantity: createMode === 'quick' ? 1 : quantity,
      autoPublish,
      templateType: createMode === 'template' ? templateType : 'geo',
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
    createMode,
    referenceText,
    contentDirection,
    tone,
    intensity,
    keywords,
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
    fetch(`/api/keywords?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        const kws = (d.keywords ?? []).slice(0, 30);
        setKeywordOptions(kws);
        setSelectedKeywordIds(kws.slice(0, 5).map((k: { id: string }) => k.id));
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

  useEffect(() => {
    if (createMode === 'quick') {
      setQuantity(1);
      setContentDirection('种草');
      setIntensity(20);
    }
  }, [createMode]);

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
      const taskType = createMode === 'rewrite' ? 'article_rewrite' : 'article_generation';
      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: taskType,
          title: `${brandName} · ${targetPlatform} 文章生成`,
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
        <BrandScopeBar label="为哪个品牌生成" brandName={brandName} onBrandChange={onBrandChange} />

        <div className="grid lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 min-w-0 space-y-4">
            <AgentInputCard
              title="生成 GEO 文章"
              description="Web 端 AI 写作：聚合品牌资料、知识库与 Hermes GEO 报告，结果进入文章结果"
              footer={
                <>
                  <button
                    type="button"
                    className="geo-btn-secondary text-sm"
                    onClick={() => void loadInputPreview()}
                    disabled={loading}
                  >
                    预览输入摘要
                  </button>
                  <button
                    type="button"
                    className="geo-btn-primary text-sm"
                    onClick={() => void openSubmitConfirm()}
                    disabled={loading}
                  >
                    {loading ? '生成中…' : '提交 Web AI 写作任务'}
                  </button>
                </>
              }
            >
              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                    生成来源
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSourceType('brand_profile')}
                      className={`text-xs px-3 py-1.5 rounded-md ${sourceType === 'brand_profile' ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      按品牌资料生成
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceType('geo_report');
                        if (!selectedGeoReportId && geoReports[0]?.id) {
                          setSelectedGeoReportId(geoReports[0].id);
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-md ${sourceType === 'geo_report' ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      根据 GEO 报告生成
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceType('indexing_result')}
                      className={`text-xs px-3 py-1.5 rounded-md ${sourceType === 'indexing_result' ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      根据排名缺口生成
                    </button>
                  </div>
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
                    <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                      关联报告
                    </label>
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

                <div className="flex flex-wrap gap-2">
                  {CREATE_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCreateMode(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-md ${createMode === m.id ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {createMode === 'rewrite' && (
                  <textarea
                    className="geo-input w-full text-sm min-h-[120px]"
                    placeholder="粘贴参考文章结构或全文"
                    value={referenceText}
                    onChange={(e) => setReferenceText(e.target.value)}
                  />
                )}

                {createMode === 'template' && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateType(t.id)}
                        className={`text-xs px-2 py-1 rounded ${templateType === t.id ? 'geo-nav-active' : 'geo-nav-item'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                    <input
                      type="number"
                      className="geo-input geo-input-sm text-xs w-20"
                      value={wordCount}
                      onChange={(e) => setWordCount(Number(e.target.value))}
                      aria-label="目标字数"
                    />
                    <span className="text-xs text-[var(--neutral-text-03)]">字</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                    关键词
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {keywordOptions.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() =>
                          setSelectedKeywordIds((prev) =>
                            prev.includes(k.id) ? prev.filter((x) => x !== k.id) : [...prev, k.id]
                          )
                        }
                        className={`text-xs px-2 py-1 rounded ${selectedKeywordIds.includes(k.id) ? 'geo-nav-active' : 'geo-nav-item'}`}
                      >
                        {k.term}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                    知识库引用
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {KNOWLEDGE_CATS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setKnowledgeCategories((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                          )
                        }
                        className={`text-xs px-2 py-1 rounded ${knowledgeCategories.includes(c.id) ? 'geo-nav-active' : 'geo-nav-item'}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                    目标平台
                  </label>
                  <div className="flex gap-2">
                    {ARTICLE_PUBLISH_PLATFORM_LABELS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTargetPlatform(p)}
                        className={`text-sm px-3 py-1.5 rounded-md border ${targetPlatform === p ? 'geo-nav-active' : 'geo-nav-item'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                  {createMode !== 'quick' && createMode !== 'rewrite' && (
                    <div>
                      <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                        数量
                      </label>
                      <div className="flex gap-2">
                        {[1, 3, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setQuantity(n)}
                            className={`text-sm px-3 py-1 rounded-md ${quantity === n ? 'geo-nav-active' : 'geo-nav-item'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                      内容方向
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIRECTIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setContentDirection(d)}
                          className={`text-xs px-2 py-1 rounded-md ${contentDirection === d ? 'geo-nav-active' : 'geo-nav-item'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                      语气
                    </label>
                    <div className="flex gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`text-xs px-2 py-1 rounded-md ${tone === t ? 'geo-nav-active' : 'geo-nav-item'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-2 block text-[var(--neutral-text-02)]">
                    营销强度 {intensity}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full"
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

          <div className="lg:col-span-7 min-w-0">
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
                onNavigate ? () => onNavigate('content_library') : undefined
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
                将为 {brandName} 生成 {createMode === 'quick' ? 1 : quantity} 篇 {targetPlatform}{' '}
                文章（{inputPreview?.modelLabel ?? 'Web AI'}）。
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
