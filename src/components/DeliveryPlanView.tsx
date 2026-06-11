import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { AgentTask, AgentTaskStatus } from '../types';
import AgentInputCard from './common/AgentInputCard';
import AgentTaskBackgroundCard, {
  isAgentTaskBlocking,
  type TaskQueueHint,
} from './common/AgentTaskBackgroundCard';
import { useToast } from '../context/ToastContext';
import { createLobbyOrder, isArticleOrderType } from '../lib/create-task-order';
import {
  fetchGeoReports,
  requestCampaignPlanFromGeo,
  formatGeoReportLabel,
  type GeoReportSummary,
} from '../lib/geo-report';
import GeoRiskConfirmModal from './geo/GeoRiskConfirmModal';
import { GEO_ASSET_RISK_LABELS } from '../lib/geo-asset';
import { LOBBY_PLATFORM_LABELS } from '../../lib/media-platforms';
import { parseIndexingGapFromUrl, parseIndexingGapHint, resolveIndexingGapHint } from '../lib/article-effect-nav';
import {
  fetchIndexPlans,
  fetchIndexingGapAnalysis,
  type IndexPlanSummary,
  type IndexingGapAnalysis,
} from '../lib/indexing-gap-client';
import { FieldCharLimitBox, FieldLimitLabel, fieldCharLimitInputClass } from './common/FieldCharLimit';
import {
  CAMPAIGN_SUPPLEMENT_NOTES_MAX,
  validateSupplementNotes,
} from '../lib/campaign-form-limits';

type CreateMode = 'ai' | 'manual';
type PlanSourceType = 'brand_profile' | 'geo_report' | 'indexing_result';

interface PlanPackage {
  id: string;
  name: string;
  platform: string;
  payeeType: string;
  quantity?: number;
  unitPrice?: number | null;
  budget: number;
  deliverable: string;
  acceptance: string;
  publishToLobby: boolean;
}

function formatMoney(value: number) {
  return `¥${value.toLocaleString('zh-CN')}`;
}

function resolvePackageQuantity(pkg: PlanPackage) {
  return Math.max(1, pkg.quantity ?? 1);
}

function resolvePackageUnitPrice(pkg: PlanPackage) {
  if (pkg.unitPrice != null) return pkg.unitPrice;
  const qty = resolvePackageQuantity(pkg);
  return qty > 0 ? Math.round(pkg.budget / qty) : pkg.budget;
}

function summarizePlanPackages(packages: PlanPackage[]) {
  const packageCount = packages.length;
  const totalQuantity = packages.reduce((sum, pkg) => sum + resolvePackageQuantity(pkg), 0);
  const totalAmount = packages.reduce((sum, pkg) => sum + pkg.budget, 0);
  return { packageCount, totalQuantity, totalAmount };
}

interface CampaignPlan {
  id: string;
  brandName: string;
  goal: string;
  status: string;
  packages: PlanPackage[];
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: import('../types').ViewType, hint?: string) => void;
  lockedMode?: CreateMode;
  embedded?: boolean;
  initialGeoReportId?: string;
  initialCampaignPlanId?: string;
  autoGenerateFromGeo?: boolean;
  indexingGapHint?: string;
}

const ACCEPTANCE_OPTIONS = ['截图证明', '链接回传', '数据复盘', '人工确认'];

const REPORT_TYPE_LABEL: Record<string, string> = {
  quick_start: '快速检测',
  audit: '专业审计',
  analysis: 'GEO 分析',
};

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

function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-grid rounded-md border overflow-hidden bg-white ${className}`}
      style={{
        borderColor: 'var(--neutral-divider-02)',
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`text-xs px-3 py-2 border-r last:border-r-0 font-medium transition ${
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

export default function DeliveryPlanView({
  brandName,
  onBrandChange: _onBrandChange,
  onNavigate,
  lockedMode,
  embedded = false,
  initialGeoReportId,
  initialCampaignPlanId,
  autoGenerateFromGeo = false,
  indexingGapHint,
}: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<CreateMode>(lockedMode ?? 'ai');
  const gapFromHint =
    parseIndexingGapHint(resolveIndexingGapHint(indexingGapHint)) ?? parseIndexingGapFromUrl();
  const [sourceType, setSourceType] = useState<PlanSourceType>(
    initialGeoReportId ? 'geo_report' : gapFromHint ? 'indexing_result' : 'brand_profile'
  );
  const [sourceIndexPlanId, setSourceIndexPlanId] = useState(gapFromHint?.planId ?? '');
  const [sourceIndexResultIds, setSourceIndexResultIds] = useState<string[]>(
    gapFromHint?.resultIds ?? []
  );
  const [supplementNotes, setSupplementNotes] = useState('');
  const [budgetMin, setBudgetMin] = useState(5000);
  const [budgetMax, setBudgetMax] = useState(20000);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [draftPackages, setDraftPackages] = useState<PlanPackage[]>([]);
  const [planDirty, setPlanDirty] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plans, setPlans] = useState<CampaignPlan[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [indexPlans, setIndexPlans] = useState<IndexPlanSummary[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<IndexingGapAnalysis | null>(null);
  const [gapAnalysisLoading, setGapAnalysisLoading] = useState(false);

  const [manualTitle, setManualTitle] = useState('');
  const [manualPlatform, setManualPlatform] = useState('小红书');
  const [manualBudget, setManualBudget] = useState(3000);
  const [manualType, setManualType] = useState('达人');
  const [manualDeliverable, setManualDeliverable] = useState('');
  const [manualAcceptance, setManualAcceptance] = useState('截图证明 / 链接回传');
  const [manualDesc, setManualDesc] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [geoReports, setGeoReports] = useState<GeoReportSummary[]>([]);
  const [selectedGeoReportId, setSelectedGeoReportId] = useState(initialGeoReportId ?? '');
  const geoAutoTriggered = useRef(false);
  const [taskPackConfirmOpen, setTaskPackConfirmOpen] = useState(false);
  const [pendingGeoGenerateId, setPendingGeoGenerateId] = useState<string | null>(null);

  const loadPlans = () => {
    fetch(`/api/campaign-plans?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []));
  };

  useEffect(() => {
    loadPlans();
  }, [brandName]);

  useEffect(() => {
    if (lockedMode) setMode(lockedMode);
  }, [lockedMode]);

  useEffect(() => {
    if (initialGeoReportId) {
      setSelectedGeoReportId(initialGeoReportId);
      setSourceType('geo_report');
    }
  }, [initialGeoReportId]);

  useEffect(() => {
    const resolved = resolveIndexingGapHint(indexingGapHint);
    const gap = parseIndexingGapHint(resolved);
    if (!gap) return;
    setSourceType('indexing_result');
    setSourceIndexPlanId(gap.planId);
  }, [indexingGapHint]);

  const loadGapAnalysis = useCallback(async (planId: string) => {
    if (!planId) {
      setGapAnalysis(null);
      setSourceIndexResultIds([]);
      return;
    }
    setGapAnalysisLoading(true);
    try {
      const analysis = await fetchIndexingGapAnalysis(planId);
      setGapAnalysis(analysis);
      setSourceIndexResultIds(analysis?.gapResultIds ?? []);
    } catch {
      setGapAnalysis(null);
      setSourceIndexResultIds([]);
    } finally {
      setGapAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sourceType !== 'indexing_result' || !sourceIndexPlanId) {
      if (sourceType !== 'indexing_result') {
        setGapAnalysis(null);
      }
      return;
    }
    void loadGapAnalysis(sourceIndexPlanId);
  }, [sourceType, sourceIndexPlanId, loadGapAnalysis]);

  useEffect(() => {
    if (!brandName || brandName === '__all__') {
      setGeoReports([]);
      setIndexPlans([]);
      return;
    }
    void fetchGeoReports(brandName).then(setGeoReports);
    void fetchIndexPlans(brandName).then(setIndexPlans);
  }, [brandName]);

  useEffect(() => {
    if (sourceType !== 'indexing_result' || indexPlans.length === 0) return;
    if (sourceIndexPlanId && indexPlans.some((p) => p.id === sourceIndexPlanId)) return;
    const preferred =
      indexPlans.find((p) => (p.resultCount ?? 0) > 0)?.id ?? indexPlans[0]?.id;
    if (preferred) setSourceIndexPlanId(preferred);
  }, [sourceType, indexPlans, sourceIndexPlanId]);

  useEffect(() => {
    if (plan?.packages) {
      setDraftPackages(plan.packages);
      setPlanDirty(false);
    }
  }, [plan]);

  const loadCampaignPlanById = useCallback(
    async (planId: string, successMessage = 'AI 投放方案已加载，可在下方修改后发布') => {
      const res = await fetch(`/api/campaign-plans/${planId}`);
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        toast(successMessage, 'success');
        return true;
      }
      toast('投放方案不存在或已删除', 'error');
      return false;
    },
    [toast]
  );

  const onComplete = useCallback(async (task: AgentTask) => {
    setLoading(false);
    const planId = task.output?.campaignPlanId as string | undefined;
    if (planId) {
      await loadCampaignPlanById(planId, 'AI 投放方案已生成，可在下方修改后发布');
    }
    loadPlans();
  }, [loadCampaignPlanById]);

  useEffect(() => {
    if (!initialCampaignPlanId) return;
    void loadCampaignPlanById(initialCampaignPlanId);
  }, [initialCampaignPlanId, loadCampaignPlanById]);

  const generateFromGeo = useCallback(
    async (reportId?: string, userConfirmedExecution = false) => {
      const id = reportId ?? selectedGeoReportId;
      if (!id) {
        toast('请选择 GEO 分析报告', 'error');
        return;
      }
      if (!brandName || brandName === '__all__') {
        toast('请先选择具体品牌', 'error');
        return;
      }
      setLoading(true);
      setTaskStatus('queued');
      const { task, error, requiresConfirmation, queueHint: hint } = await requestCampaignPlanFromGeo({
        brandName,
        geoReportId: id,
        budgetMin,
        budgetMax,
        userConfirmedExecution,
      });
      if (requiresConfirmation) {
        setPendingGeoGenerateId(id);
        setTaskPackConfirmOpen(true);
        setLoading(false);
        return;
      }
      if (error) {
        toast(error, 'error');
        setLoading(false);
        return;
      }
      if (task) {
        setTaskId(task.id);
        setTaskTitle(`${brandName} · GEO 投放方案`);
        setTaskStatus('queued');
        setQueueHint(hint ?? null);
        toast('正在根据 GEO 报告生成投放方案…', 'info');
      }
      setTaskPackConfirmOpen(false);
      setPendingGeoGenerateId(null);
    },
    [brandName, selectedGeoReportId, budgetMin, budgetMax, toast]
  );

  const generatePlan = async () => {
    if (!brandName || brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    if (sourceType === 'geo_report') {
      await generateFromGeo();
      return;
    }
    if (sourceType === 'indexing_result') {
      if (!sourceIndexPlanId) {
        toast('请选择查询计划', 'error');
        return;
      }
      if (!gapAnalysis?.hasResults) {
        toast('该计划尚未执行采样，请先在排名监控运行查询', 'error');
        return;
      }
      if (!gapAnalysis.gapCount) {
        toast('该计划暂无排名缺口（品牌已全部命中）', 'error');
        return;
      }
    }
    const notesError = validateSupplementNotes(supplementNotes);
    if (notesError) {
      toast(notesError, 'error');
      return;
    }
    setLoading(true);
    setTaskStatus('queued');
    const res = await fetch('/api/campaign-plans/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName,
        source: sourceType,
        budgetMin,
        budgetMax,
        supplementNotes: supplementNotes.trim() || undefined,
        ...(sourceType === 'indexing_result'
          ? { sourceIndexPlanId, sourceIndexResultIds }
          : {}),
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      setLoading(false);
      return;
    }
    if (data.task) {
      setTaskId(data.task.id);
      setTaskTitle(`${brandName} · 投放方案`);
      setTaskStatus('queued');
      setQueueHint(data.queueHint ?? null);
      toast('AI 正在生成各平台投放方案…', 'info');
    }
  };

  useEffect(() => {
    if (
      mode === 'ai' &&
      autoGenerateFromGeo &&
      initialGeoReportId &&
      !geoAutoTriggered.current &&
      brandName &&
      brandName !== '__all__'
    ) {
      geoAutoTriggered.current = true;
      void generateFromGeo(initialGeoReportId);
    }
  }, [mode, autoGenerateFromGeo, initialGeoReportId, brandName, generateFromGeo]);

  const updateDraftPackage = (id: string, patch: Partial<PlanPackage>) => {
    setDraftPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id !== id) return pkg;
        const next = { ...pkg, ...patch };
        const quantity = resolvePackageQuantity(next);
        if (patch.unitPrice != null) {
          next.budget = Math.round(Number(patch.unitPrice) * quantity);
        } else if (patch.quantity != null && next.unitPrice != null) {
          next.budget = Math.round(Number(next.unitPrice) * quantity);
        } else if (patch.budget != null) {
          next.unitPrice = quantity > 0 ? Math.round(next.budget / quantity) : next.budget;
        }
        return next;
      })
    );
    setPlanDirty(true);
  };

  const savePlanEdits = async () => {
    if (!plan) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/campaign-plans/${plan.id}/packages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: draftPackages }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      if (data.plan) {
        setPlan(data.plan);
        setPlanDirty(false);
        toast('方案修改已保存', 'success');
      }
    } catch {
      toast('保存失败', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const publish = async (planId: string) => {
    if (planDirty) {
      toast('请先保存对方案的修改', 'error');
      return;
    }
    setPublishing(true);
    const res = await fetch(`/api/campaign-plans/${planId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName }),
    });
    const data = await res.json();
    setPublishing(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(`已发布 ${data.orders?.length ?? 0} 个任务到资源平台`, 'success');
    if (onNavigate) onNavigate('content_delivery', 'order_manage:published');
    loadPlans();
  };

  const publishManual = async () => {
    if (!manualTitle.trim()) {
      toast('请填写任务标题', 'error');
      return;
    }
    if (isArticleOrderType(manualType)) {
      toast('文章类写作/发文单请使用侧边栏「内容发布」', 'error');
      return;
    }
    setManualLoading(true);
    const { order, error } = await createLobbyOrder({
      brandName,
      title: manualTitle.trim(),
      platform: manualPlatform,
      budget: manualBudget,
      type: manualType,
      description: manualDesc,
      deliverable: manualDeliverable || manualDesc || '按任务描述交付',
      acceptance: manualAcceptance,
    });
    setManualLoading(false);
    if (error) {
      toast(error, 'error');
      return;
    }
    toast('任务包已发布到资源平台，可在任务交付中跟踪进度', 'success');
    if (onNavigate) onNavigate('content_delivery', order?.id);
    setManualTitle('');
    setManualDesc('');
    loadPlans();
  };

  const activePlan = plan ?? plans[0] ?? null;
  const displayPackages = plan?.id === activePlan?.id ? draftPackages : activePlan?.packages ?? [];

  const body = (
    <>
      <GeoRiskConfirmModal
        open={taskPackConfirmOpen}
        title={GEO_ASSET_RISK_LABELS.generate_task_pack.title}
        detail={GEO_ASSET_RISK_LABELS.generate_task_pack.detail}
        loading={loading}
        onConfirm={() => void generateFromGeo(pendingGeoGenerateId ?? undefined, true)}
        onCancel={() => {
          setTaskPackConfirmOpen(false);
          setPendingGeoGenerateId(null);
          setLoading(false);
        }}
      />
      {!lockedMode && (
        <div className="flex gap-2">
          <button
            type="button"
            className={`text-sm px-4 py-2 rounded-lg ${mode === 'ai' ? 'geo-nav-active' : 'geo-nav-item'}`}
            onClick={() => setMode('ai')}
          >
            AI 制定计划
          </button>
          <button
            type="button"
            className={`text-sm px-4 py-2 rounded-lg ${mode === 'manual' ? 'geo-nav-active' : 'geo-nav-item'}`}
            onClick={() => setMode('manual')}
          >
            手动创建任务包
          </button>
        </div>
      )}

      {mode === 'ai' ? (
        <>
          <AgentInputCard
            title="AI 制定接单投放方案"
            description="向资源平台发任务 · 需预算 · 接单方负责写作与发布"
            footer={
              <button
                type="button"
                className="geo-btn-primary text-sm px-8"
                onClick={() => void generatePlan()}
                disabled={loading || isAgentTaskBlocking(taskId, taskStatus)}
              >
                {loading ? '生成中…' : 'AI 生成投放方案'}
              </button>
            }
          >
            <div className="grid gap-5 max-w-2xl">
              <ArticleFormSection index={1} title="基础设定">
                <div>
                  <FieldLabel>生成来源</FieldLabel>
                  <SegmentedGroup
                    className="w-full max-w-xl"
                    value={sourceType}
                    onChange={(next) => {
                      setSourceType(next);
                      if (next === 'geo_report' && !selectedGeoReportId && geoReports[0]?.id) {
                        setSelectedGeoReportId(geoReports[0].id);
                      }
                      if (next === 'indexing_result' && !sourceIndexPlanId && indexPlans[0]?.id) {
                        setSourceIndexPlanId(indexPlans[0].id);
                      }
                    }}
                    options={[
                      { value: 'brand_profile', label: '按品牌资料' },
                      { value: 'geo_report', label: '根据 GEO 报告' },
                      { value: 'indexing_result', label: '根据排名缺口' },
                    ]}
                  />
                </div>

                {sourceType === 'indexing_result' && (
                  <div>
                    <FieldLabel>关联查询计划</FieldLabel>
                    {indexPlans.length === 0 ? (
                      <p className="text-xs geo-callout-warning p-2">
                        暂无查询计划，请先在排名监控创建并执行采样。
                        {onNavigate && (
                          <button
                            type="button"
                            className="geo-link ml-1"
                            onClick={() => onNavigate('indexing_rank')}
                          >
                            去排名监控
                          </button>
                        )}
                      </p>
                    ) : (
                      <>
                        <select
                          className="geo-input w-full text-sm max-w-xl"
                          value={sourceIndexPlanId}
                          onChange={(e) => setSourceIndexPlanId(e.target.value)}
                        >
                          {indexPlans.map((p) => {
                            const miss = Math.max(0, (p.resultCount ?? 0) - (p.hitCount ?? 0));
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} · 采样 {p.resultCount ?? 0} · 未命中 {miss}
                              </option>
                            );
                          })}
                        </select>
                        {gapAnalysisLoading && (
                          <p className="text-xs text-[var(--neutral-text-03)] mt-2">
                            AI 正在梳理命中与缺口…
                          </p>
                        )}
                        {gapAnalysis && !gapAnalysisLoading && (
                          <div
                            className="text-xs rounded-lg p-3 mt-2 space-y-1.5"
                            style={{ background: 'var(--neutral-bg-03)' }}
                          >
                            {!gapAnalysis.hasResults ? (
                              <p className="geo-callout-warning p-2 -m-1">
                                该计划尚未执行采样，请先在排名监控运行查询后再生成投放方案。
                              </p>
                            ) : gapAnalysis.gapCount === 0 ? (
                              <p className="geo-callout-success p-2 -m-1">
                                共 {gapAnalysis.totalCount} 条采样，品牌已全部命中，暂无补位缺口。
                              </p>
                            ) : (
                              <>
                                <p className="font-medium text-[var(--color-title)]">AI 已梳理排名缺口</p>
                                <p>
                                  共 {gapAnalysis.totalCount} 条采样，命中 {gapAnalysis.hitCount}，缺口{' '}
                                  {gapAnalysis.gapCount}
                                </p>
                                {gapAnalysis.targetQuestions.length > 0 && (
                                  <p>目标问题：{gapAnalysis.targetQuestions.join('、')}</p>
                                )}
                                {gapAnalysis.targetPlatforms.length > 0 && (
                                  <p>目标平台：{gapAnalysis.targetPlatforms.join('、')}</p>
                                )}
                                <p>当前品牌提及率：{gapAnalysis.brandMentionRate}%</p>
                                {gapAnalysis.competitorMentions.length > 0 && (
                                  <p>竞品出现：{gapAnalysis.competitorMentions.join('、')}</p>
                                )}
                                <p className="text-[var(--neutral-text-03)]">
                                  AI 将针对未命中采样自动制定补位投放方案
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </>
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
                        className="geo-input w-full text-sm max-w-xl"
                        value={selectedGeoReportId}
                        onChange={(e) => setSelectedGeoReportId(e.target.value)}
                      >
                        {geoReports.map((r) => (
                          <option key={r.id} value={r.id}>
                            {REPORT_TYPE_LABEL[r.reportType ?? ''] ?? r.reportType ?? 'GEO 报告'} ·{' '}
                            {formatGeoReportLabel(r).slice(0, 48)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </ArticleFormSection>

              <ArticleFormSection index={2} title="投放预算">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                  <div>
                    <FieldLabel>预算下限（元）</FieldLabel>
                    <input
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(Number(e.target.value))}
                      className="geo-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>预算上限（元）</FieldLabel>
                    <input
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(Number(e.target.value))}
                      className="geo-input w-full text-sm"
                    />
                  </div>
                </div>
                <div>
                  <FieldLimitLabel label="补充说明（可选）" className="block mb-1" />
                  <FieldCharLimitBox
                    current={supplementNotes.length}
                    max={CAMPAIGN_SUPPLEMENT_NOTES_MAX}
                    multiline
                  >
                    <textarea
                      value={supplementNotes}
                      onChange={(e) =>
                        setSupplementNotes(e.target.value.slice(0, CAMPAIGN_SUPPLEMENT_NOTES_MAX))
                      }
                      maxLength={CAMPAIGN_SUPPLEMENT_NOTES_MAX}
                      rows={2}
                      placeholder="如：重点覆盖种植牙与隐形矫正相关问答，或指定优先平台"
                      className={`geo-input w-full text-sm max-w-xl min-h-[72px] ${fieldCharLimitInputClass(true)}`}
                    />
                  </FieldCharLimitBox>
                </div>
                <p className="text-xs text-[var(--neutral-text-03)]">
                  AI 将按来源与预算，为各内容平台自动生成文章数量、写作要求与预算分配，生成后可修改。
                </p>
              </ArticleFormSection>
            </div>
          </AgentInputCard>
          {taskId && (
            <AgentTaskBackgroundCard
              taskId={taskId}
              taskTitle={taskTitle}
              initialStatus={taskStatus}
              queueHint={queueHint}
              onNavigate={onNavigate}
              onComplete={onComplete}
              onStatusChange={setTaskStatus}
            />
          )}
        </>
      ) : (
        <AgentInputCard
          title="手动创建任务包"
          description="发布非文章类任务到资源平台（一期自定义发布暂未开放）"
          footer={
            <button
              type="button"
              className="geo-btn-primary text-sm"
              onClick={() => void publishManual()}
              disabled={manualLoading}
            >
              {manualLoading ? '发布中…' : '发布到资源平台'}
            </button>
          }
        >
          <div className="space-y-3">
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="任务标题"
              className="geo-input w-full text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className="geo-input text-sm"
              >
                {LOBBY_PLATFORM_LABELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="geo-input text-sm"
              >
                {['达人', '探店', 'GEO 顾问', '网页设计师', '综合投放'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="number"
              value={manualBudget}
              onChange={(e) => setManualBudget(Number(e.target.value))}
              placeholder="预算"
              className="geo-input w-full text-sm"
            />
            <input
              value={manualDeliverable}
              onChange={(e) => setManualDeliverable(e.target.value)}
              placeholder="交付物说明"
              className="geo-input w-full text-sm"
            />
            <select
              value={manualAcceptance}
              onChange={(e) => setManualAcceptance(e.target.value)}
              className="geo-input w-full text-sm"
            >
              {ACCEPTANCE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <textarea
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              rows={3}
              placeholder="任务说明（可选）"
              className="geo-input w-full text-sm"
            />
          </div>
        </AgentInputCard>
      )}

      {activePlan && mode === 'ai' && (() => {
        const summary = summarizePlanPackages(displayPackages);
        return (
          <div className="geo-card overflow-hidden">
            <div
              className="p-4 border-b flex flex-wrap items-center justify-between gap-4"
              style={{ borderColor: 'var(--neutral-divider-02)' }}
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">{activePlan.goal}</h3>
                <p
                  className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1"
                  style={{ color: 'var(--neutral-text-03)' }}
                >
                  <span>状态：{activePlan.status}</span>
                  <span>平台 {summary.packageCount} 个</span>
                  <span>文章合计 {summary.totalQuantity} 篇</span>
                  <span>预算合计 {formatMoney(summary.totalAmount)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {planDirty && (
                  <button
                    type="button"
                    className="geo-btn-secondary text-sm"
                    disabled={savingPlan}
                    onClick={() => void savePlanEdits()}
                  >
                    {savingPlan ? '保存中…' : '保存修改'}
                  </button>
                )}
                {activePlan.status === 'draft' && (
                  <button
                    type="button"
                    className="geo-btn-primary text-sm"
                    disabled={publishing || planDirty}
                    onClick={() => void publish(activePlan.id)}
                  >
                    {publishing ? '发布中…' : `发布 ${summary.packageCount} 个任务包`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm geo-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>平台</th>
                    <th>文章数</th>
                    <th>单价</th>
                    <th>平台预算</th>
                    <th>文章要求</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPackages.map((pkg) => {
                    const quantity = resolvePackageQuantity(pkg);
                    const unitPrice = resolvePackageUnitPrice(pkg);
                    const editable = plan?.id === activePlan.id;
                    return (
                      <tr key={pkg.id}>
                        <td className="whitespace-nowrap">{pkg.platform}</td>
                        <td>
                          {editable ? (
                            <input
                              type="number"
                              min={1}
                              max={20}
                              className="geo-input geo-input-sm geo-input-fixed geo-input-fixed-sm text-xs"
                              value={quantity}
                              onChange={(e) =>
                                updateDraftPackage(pkg.id, {
                                  quantity: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                            />
                          ) : (
                            quantity
                          )}
                        </td>
                        <td>
                          {editable ? (
                            <input
                              type="number"
                              min={100}
                              className="geo-input geo-input-sm geo-input-fixed geo-input-fixed-md text-xs"
                              value={unitPrice}
                              onChange={(e) =>
                                updateDraftPackage(pkg.id, {
                                  unitPrice: Math.max(100, Number(e.target.value) || 100),
                                })
                              }
                            />
                          ) : (
                            formatMoney(unitPrice)
                          )}
                        </td>
                        <td className="font-medium whitespace-nowrap">{formatMoney(pkg.budget)}</td>
                        <td>
                          {editable ? (
                            <textarea
                              className="geo-input geo-input-sm text-xs w-full min-w-[200px] min-h-[56px]"
                              value={pkg.deliverable}
                              onChange={(e) =>
                                updateDraftPackage(pkg.id, { deliverable: e.target.value })
                              }
                            />
                          ) : (
                            <span className="text-xs">{pkg.deliverable}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </>
  );

  if (embedded) {
    return <div className="geo-page-content space-y-4">{body}</div>;
  }

  return <div className="geo-page-content space-y-4">{body}</div>;
}
