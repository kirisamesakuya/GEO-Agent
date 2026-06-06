import { useState, useCallback, useEffect, useRef } from 'react';
import { useAgentTaskPolling } from '../hooks/useAgentTaskPolling';
import type { AgentTask, AgentTaskStatus } from '../types';
import AgentInputCard from './common/AgentInputCard';
import TaskStatusPill from './common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../lib/agent-task-display';
import { useToast } from '../context/ToastContext';
import BrandScopeBar from './common/BrandScopeBar';
import { createLobbyOrder, isArticleOrderType } from '../lib/create-task-order';
import {
  fetchGeoReports,
  geoReportOptionLabel,
  requestCampaignPlanFromGeo,
  type GeoReportSummary,
} from '../lib/geo-report';
import GeoRiskConfirmModal from './geo/GeoRiskConfirmModal';
import { GEO_ASSET_RISK_LABELS } from '../lib/geo-asset';
import {
  CAMPAIGN_PLAN_PLATFORM_LABELS,
  DEFAULT_CAMPAIGN_PLATFORMS,
  LOBBY_PLATFORM_LABELS,
} from '../../lib/media-platforms';

type CreateMode = 'ai' | 'manual';

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
  /** 从 GEO 分析跳转时带入报告 ID，可选自动触发生成 */
  initialGeoReportId?: string;
  autoGenerateFromGeo?: boolean;
}

const ACCEPTANCE_OPTIONS = ['截图证明', '链接回传', '数据复盘', '人工确认'];

const GOAL_PRESETS = [
  '提升品牌在 AI 搜索与社交平台的可见度',
  '补强核心词与问答在 AI 平台提及',
  '压制竞品、强化品牌心智占位',
  '提升内容收录与引用来源',
  '扩大本地/区域市场声量',
  '覆盖新平台或新渠道试水',
] as const;

function buildGoalText(presets: string[], custom: string): string {
  const parts = [...presets];
  const trimmed = custom.trim();
  if (trimmed) parts.push(trimmed);
  return parts.join('；');
}

export default function DeliveryPlanView({
  brandName,
  onBrandChange,
  onNavigate,
  lockedMode,
  embedded = false,
  initialGeoReportId,
  autoGenerateFromGeo = false,
}: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<CreateMode>(lockedMode ?? 'ai');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([GOAL_PRESETS[0]]);
  const [customGoal, setCustomGoal] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_CAMPAIGN_PLATFORMS]);
  const [budgetMin, setBudgetMin] = useState(5000);
  const [budgetMax, setBudgetMax] = useState(20000);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [plans, setPlans] = useState<CampaignPlan[]>([]);
  const [publishing, setPublishing] = useState(false);

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
    if (initialGeoReportId) setSelectedGeoReportId(initialGeoReportId);
  }, [initialGeoReportId]);

  useEffect(() => {
    if (!brandName || brandName === '__all__') {
      setGeoReports([]);
      return;
    }
    void fetchGeoReports(brandName).then(setGeoReports);
  }, [brandName]);

  const onComplete = useCallback(async (task: AgentTask) => {
    setLoading(false);
    const planId = task.output?.campaignPlanId as string | undefined;
    if (planId) {
      const res = await fetch(`/api/campaign-plans/${planId}`);
      const data = await res.json();
      if (data.plan) { setPlan(data.plan); toast('接单投放方案已生成', 'success'); }
    }
    loadPlans();
  }, [toast]);

  const onUpdate = useCallback((task: AgentTask) => setTaskStatus(resolveTaskPillDisplay(task).status), []);

  useAgentTaskPolling({ taskId, onUpdate, onComplete });

  const toggleGoal = (preset: string) => {
    setSelectedGoals((prev) =>
      prev.includes(preset) ? prev.filter((g) => g !== preset) : [...prev, preset]
    );
  };

  const resolveGoalText = () => buildGoalText(selectedGoals, customGoal);

  const generate = async () => {
    const goal = resolveGoalText();
    if (!goal.trim()) {
      toast('请至少选择一个投放目标或填写自定义补充', 'error');
      return;
    }
    setLoading(true);
    setTaskStatus('queued');
    const res = await fetch('/api/campaign-plans/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, goal, platforms, budgetMin, budgetMax }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setLoading(false); return; }
    if (data.task) { setTaskId(data.task.id); toast('接单投放方案生成中…', 'info'); }
  };

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
      const { task, error, requiresConfirmation } = await requestCampaignPlanFromGeo({
        brandName,
        geoReportId: id,
        platforms,
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
        toast('正在根据 GEO 报告生成任务包…', 'info');
      }
      setTaskPackConfirmOpen(false);
      setPendingGeoGenerateId(null);
    },
    [brandName, selectedGeoReportId, platforms, budgetMin, budgetMax, toast]
  );

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

  const publish = async (planId: string) => {
    setPublishing(true);
    const res = await fetch(`/api/campaign-plans/${planId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName }),
    });
    const data = await res.json();
    setPublishing(false);
    if (data.error) { toast(data.error, 'error'); return; }
    toast(`已发布 ${data.orders?.length ?? 0} 个任务到资源平台`, 'success');
    if (onNavigate) onNavigate('order_delivery');
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
    if (onNavigate) onNavigate('order_delivery', order?.id);
    setManualTitle('');
    setManualDesc('');
    loadPlans();
  };

  const activePlan = plan ?? plans[0] ?? null;

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
        <AgentInputCard
          title="AI 制定接单投放方案"
          description="按目标或 GEO 分析报告自动拆解任务包；需自己定任务类型请用「自定义发单」"
          footer={
            <div className="flex flex-wrap gap-2">
              <button type="button" className="geo-btn-primary text-sm" onClick={() => void generate()} disabled={loading}>
                {loading ? '生成中…' : '按目标生成'}
              </button>
              <button
                type="button"
                className="geo-btn-secondary text-sm"
                onClick={() => void generateFromGeo()}
                disabled={loading || !selectedGeoReportId}
              >
                {loading ? '生成中…' : '根据 GEO 报告生成'}
              </button>
              {onNavigate && (
                <button type="button" className="geo-btn-secondary text-sm" onClick={() => onNavigate('geo_analysis')}>
                  去做 GEO 分析
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-3">
            {geoReports.length > 0 && (
              <div>
                <label className="text-xs block mb-1 font-medium">关联 GEO 报告（可选）</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm geo-input"
                  value={selectedGeoReportId}
                  onChange={(e) => setSelectedGeoReportId(e.target.value)}
                >
                  <option value="">不关联 / 仅按目标生成</option>
                  {geoReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {geoReportOptionLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {geoReports.length === 0 && brandName !== '__all__' && (
              <p className="text-xs text-[var(--neutral-text-03)]">
                暂无 GEO 报告，可先完成 GEO 分析后再根据报告生成任务包。
              </p>
            )}
            <div>
              <label className="text-xs block mb-2 font-medium text-[var(--neutral-text-02)]">
                投放目标（可多选）
              </label>
              <div className="flex flex-wrap gap-2">
                {GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleGoal(preset)}
                    className={`text-xs px-2.5 py-1.5 rounded-md text-left max-w-full ${
                      selectedGoals.includes(preset) ? 'geo-nav-active' : 'geo-nav-item'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1 font-medium text-[var(--neutral-text-02)]">
                自定义补充（可选）
              </label>
              <textarea
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                rows={2}
                placeholder="补充具体诉求，如：重点覆盖种植牙与隐形矫正相关问答"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--neutral-divider-02)' }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGN_PLAN_PLATFORM_LABELS.map((p) => (
                <button key={p} type="button"
                  onClick={() => setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                  className={`text-xs px-2 py-1 rounded-md border ${platforms.includes(p) ? 'geo-nav-active' : 'geo-nav-item'}`}
                  style={{ borderColor: platforms.includes(p) ? undefined : 'var(--neutral-divider-02)' }}>{p}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs block mb-1">预算下限</label>
                <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} /></div>
              <div><label className="text-xs block mb-1">预算上限</label>
                <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} /></div>
            </div>
            {taskStatus && <TaskStatusPill status={taskStatus} />}
          </div>
        </AgentInputCard>
      ) : (
        <AgentInputCard
          title="手动创建任务包"
          description="发布非文章类任务到资源平台；请优先使用「发布任务 → 自定义发布」"
          footer={
            <button type="button" className="geo-btn-primary text-sm" onClick={() => void publishManual()} disabled={manualLoading}>
              {manualLoading ? '发布中…' : '发布到资源平台'}
            </button>
          }
        >
          <div className="space-y-3">
            <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="任务标题"
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
            <div className="grid grid-cols-2 gap-3">
              <select value={manualPlatform} onChange={(e) => setManualPlatform(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {LOBBY_PLATFORM_LABELS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={manualType} onChange={(e) => setManualType(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                {['达人', '探店', 'GEO 顾问', '网页设计师', '综合投放'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <input type="number" value={manualBudget} onChange={(e) => setManualBudget(Number(e.target.value))} placeholder="预算"
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
            <input value={manualDeliverable} onChange={(e) => setManualDeliverable(e.target.value)} placeholder="交付物说明"
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
            <select value={manualAcceptance} onChange={(e) => setManualAcceptance(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {ACCEPTANCE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <textarea value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} rows={3} placeholder="任务说明（可选）"
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }} />
          </div>
        </AgentInputCard>
      )}

      {activePlan && mode === 'ai' && (() => {
        const summary = summarizePlanPackages(activePlan.packages);
        return (
        <div className="geo-card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">{activePlan.goal}</h3>
              <p className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1" style={{ color: 'var(--neutral-text-03)' }}>
                <span>状态：{activePlan.status}</span>
                <span>任务包 {summary.packageCount} 个</span>
                <span>投放数量 {summary.totalQuantity} 件</span>
                <span>合计总价 {formatMoney(summary.totalAmount)}</span>
              </p>
            </div>
            {activePlan.status === 'draft' && (
              <button type="button" className="geo-btn-primary text-sm shrink-0" disabled={publishing}
                onClick={() => void publish(activePlan.id)}>
                {publishing ? '发布中…' : `发布 ${summary.packageCount} 个任务包到资源平台`}
              </button>
            )}
          </div>
          <table className="w-full text-sm geo-table">
            <thead>
              <tr>
                <th>任务包</th>
                <th>平台</th>
                <th>数量</th>
                <th>单价</th>
                <th>总价</th>
                <th>交付物</th>
              </tr>
            </thead>
            <tbody>
              {activePlan.packages.map((pkg) => {
                const quantity = resolvePackageQuantity(pkg);
                const unitPrice = resolvePackageUnitPrice(pkg);
                return (
                <tr key={pkg.id}>
                  <td>{pkg.name}</td>
                  <td>{pkg.platform}</td>
                  <td>{quantity}</td>
                  <td>{formatMoney(unitPrice)}</td>
                  <td className="font-medium">{formatMoney(pkg.budget)}</td>
                  <td className="text-xs">{pkg.deliverable}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        );
      })()}
    </>
  );

  if (embedded) {
    return (
      <div className="geo-page-content space-y-4 overflow-y-auto h-full px-6 pb-6">
        {body}
      </div>
    );
  }

  return (
    <div className="geo-page-content space-y-4 overflow-y-auto h-full">
      <BrandScopeBar
        label="为哪个品牌创建接单投放"
        brandName={brandName}
        onBrandChange={onBrandChange}
      />
      {body}
    </div>
  );
}
