import { useCallback, useEffect, useState } from 'react';
import { Pencil, Play, Plus, X } from 'lucide-react';
import { formatPlanDateTime, toDatetimeLocalValue } from '../lib/datetime-local';
import {
  defaultScheduleRunTime,
  formatIndexPlanStatus,
  formatIndexSchedule,
  SCHEDULE_FREQUENCY_OPTIONS,
  WEEKDAY_OPTIONS,
  type ScheduleFrequency,
} from '../lib/indexing-schedule';
import type { ViewType } from '../types';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import { useToast } from '../context/ToastContext';
import { useHermesSubmitGuard } from './hermes/HermesSubmitGuard';
import {
  DEFAULT_INDEXING_PLATFORMS,
} from '../../lib/media-platforms';
import AiMonitorPlatformsPanel from './indexing/AiMonitorPlatformsPanel';
import IndexingPlanResultView from './indexing/IndexingPlanResultView';
import {
  fetchAiMonitorSessions,
  isAiMonitorSessionReady,
  type AiMonitorSession,
} from '../lib/ai-monitor-session-client';

interface Plan {
  id: string;
  brandName: string;
  name: string;
  platforms: string[];
  keywords: string[];
  keywordIds?: string[];
  status: string;
  queryAt?: string;
  scheduleFrequency?: string;
  scheduleRunTime?: string;
  scheduleWeekday?: number;
  scheduleMonthDay?: number;
  hitCount?: number;
  resultCount?: number;
}

function planHasResults(plan: Plan): boolean {
  return (plan.resultCount ?? 0) > 0;
}

function canEditPlan(plan: Plan): boolean {
  return plan.status !== 'running';
}

interface Keyword {
  id: string;
  term: string;
}

interface BrandOption {
  id: string;
  name: string;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function IndexingRankView({ brandName, onBrandChange, onNavigate }: Props) {
  const { toast } = useToast();
  const { ensureHermesReady } = useHermesSubmitGuard();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [planBrand, setPlanBrand] = useState('');
  const [planName, setPlanName] = useState('');
  const [selectedKw, setSelectedKw] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([...DEFAULT_INDEXING_PLATFORMS]);
  const [queryAt, setQueryAt] = useState(() => toDatetimeLocalValue());
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('');
  const [scheduleRunTime, setScheduleRunTime] = useState(defaultScheduleRunTime);
  const [scheduleWeekday, setScheduleWeekday] = useState(1);
  const [scheduleMonthDay, setScheduleMonthDay] = useState(1);
  const [activeTab, setActiveTab] = useState<'monitor' | 'plans'>('plans');
  const [monitorNotReadyCount, setMonitorNotReadyCount] = useState(0);
  const [modalMonitorSessions, setModalMonitorSessions] = useState<AiMonitorSession[]>([]);

  const openPlanDetail = useCallback((planId: string) => {
    setDetailPlanId(planId);
    setActiveTab('plans');
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'indexing_rank');
    url.searchParams.set('planId', planId);
    window.history.pushState({}, '', url);
  }, []);

  const closePlanDetail = useCallback(() => {
    setDetailPlanId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('planId');
    window.history.replaceState({}, '', url);
  }, []);

  const loadMonitorSessionsForBrand = useCallback((name: string) => {
    if (!name) {
      setMonitorNotReadyCount(0);
      return;
    }
    fetchAiMonitorSessions(name)
      .then((d) => {
        setMonitorNotReadyCount(d.notReadyCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMonitorSessionsForBrand(brandName);
  }, [brandName, loadMonitorSessionsForBrand]);

  const loadPlans = useCallback(() => {
    fetch(`/api/indexing/plans?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
  }, [brandName]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    const planId = new URLSearchParams(window.location.search).get('planId');
    if (!planId || plans.length === 0) return;
    if (plans.some((p) => p.id === planId)) {
      setDetailPlanId(planId);
      setActiveTab('plans');
    }
  }, [plans]);

  const loadKeywordsForBrand = useCallback((name: string) => {
    if (!name) {
      setKeywords([]);
      return;
    }
    fetch(`/api/keywords?brandName=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        const kws = (d.keywords ?? []) as Keyword[];
        setKeywords(kws);
        setSelectedKw(kws.slice(0, 5).map((k) => k.id));
      })
      .catch(() => setKeywords([]));
  }, []);

  useEffect(() => {
    if (!showCreateModal || !planBrand) return;
    loadKeywordsForBrand(planBrand);
    fetchAiMonitorSessions(planBrand)
      .then((d) => setModalMonitorSessions(d.sessions))
      .catch(() => setModalMonitorSessions([]));
  }, [showCreateModal, planBrand, loadKeywordsForBrand]);

  const runPlan = async (plan: Plan) => {
    const runBrand = plan.brandName || brandName;
    const ready = await ensureHermesReady(runBrand);
    if (!ready) return;
    await fetch(`/api/indexing/plans/${plan.id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName: runBrand }),
    });
    const poll = setInterval(() => {
      loadPlans();
      fetch(`/api/indexing/plans/${plan.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.plan?.status === 'done') {
            clearInterval(poll);
            openPlanDetail(plan.id);
          }
        });
    }, 2500);
  };

  const openCreateModal = () => {
    setEditingPlanId(null);
    setPlanName('');
    setSelectedKw([]);
    setSelectedPlatforms([...DEFAULT_INDEXING_PLATFORMS]);
    setQueryAt(toDatetimeLocalValue());
    setScheduleFrequency('');
    setScheduleRunTime(defaultScheduleRunTime());
    setScheduleWeekday(1);
    setScheduleMonthDay(1);
    setPlanBrand(brandName);
    setShowCreateModal(true);
    fetch('/api/brands')
      .then((r) => r.json())
      .then((d) => setBrands((d.brands ?? []) as BrandOption[]))
      .catch(() => setBrands([]));
  };

  const openEditModal = async (plan: Plan) => {
    if (!canEditPlan(plan)) {
      toast('执行中的计划不可编辑', 'error');
      return;
    }
    setEditingPlanId(plan.id);
    setPlanBrand(plan.brandName);
    setPlanName(plan.name);
    setSelectedPlatforms(plan.platforms.length ? [...plan.platforms] : [...DEFAULT_INDEXING_PLATFORMS]);
    setQueryAt(plan.queryAt ? toDatetimeLocalValue(plan.queryAt) : toDatetimeLocalValue());
    setScheduleFrequency((plan.scheduleFrequency ?? '') as ScheduleFrequency);
    setScheduleRunTime(plan.scheduleRunTime ?? defaultScheduleRunTime());
    setScheduleWeekday(plan.scheduleWeekday ?? 1);
    setScheduleMonthDay(plan.scheduleMonthDay ?? 1);
    setShowCreateModal(true);
    fetch('/api/brands')
      .then((r) => r.json())
      .then((d) => setBrands((d.brands ?? []) as BrandOption[]))
      .catch(() => setBrands([]));
    try {
      const res = await fetch(`/api/indexing/plans/${plan.id}`);
      const data = (await res.json()) as { plan?: { keywordIds?: string[] } };
      const ids = data.plan?.keywordIds ?? plan.keywordIds ?? [];
      setSelectedKw(ids);
      loadKeywordsForBrand(plan.brandName);
      fetchAiMonitorSessions(plan.brandName)
        .then((d) => setModalMonitorSessions(d.sessions))
        .catch(() => setModalMonitorSessions([]));
    } catch {
      toast('加载计划详情失败', 'error');
    }
  };

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreateModal(false);
    setEditingPlanId(null);
  };

  const savePlan = async () => {
    if (!planBrand) return;
    if (!planName.trim() || selectedKw.length === 0 || selectedPlatforms.length === 0) return;
    setCreating(true);
    try {
      const payload = {
        name: planName,
        platforms: selectedPlatforms,
        keywordIds: selectedKw,
        queryAt: queryAt ? new Date(queryAt).toISOString() : undefined,
        scheduleFrequency: scheduleFrequency || null,
        scheduleRunTime: scheduleFrequency ? scheduleRunTime : null,
        scheduleWeekday: scheduleFrequency === 'weekly' ? scheduleWeekday : null,
        scheduleMonthDay: scheduleFrequency === 'monthly' ? scheduleMonthDay : null,
      };
      const res = editingPlanId
        ? await fetch(`/api/indexing/plans/${editingPlanId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/indexing/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandName: planBrand, ...payload }),
          });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast(data.error ?? (editingPlanId ? '更新失败' : '创建失败'), 'error');
        return;
      }
      toast(editingPlanId ? '查询计划已更新' : '查询计划已创建', 'success');
      setShowCreateModal(false);
      setEditingPlanId(null);
      setPlanName('');
      if (planBrand === brandName) loadPlans();
      else onBrandChange(planBrand);
    } finally {
      setCreating(false);
    }
  };

  const toggleKw = (id: string) => {
    setSelectedKw((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const selectReadyPlatformsOnly = () => {
    const ready = DEFAULT_INDEXING_PLATFORMS.filter((p) => {
      const session = modalMonitorSessions.find((s) => s.platform === p);
      return session ? isAiMonitorSessionReady(session.status) : false;
    });
    setSelectedPlatforms(ready.length ? [...ready] : []);
  };

  const modalSessionStatus = (platform: string) =>
    modalMonitorSessions.find((s) => s.platform === platform)?.status ?? 'unknown';

  const canCreate =
    Boolean(planBrand) &&
    planName.trim().length > 0 &&
    selectedKw.length > 0 &&
    selectedPlatforms.length > 0;

  return (
    <div className="geo-page-content space-y-4">
      <PageHeaderWithBrand
        title="GEO监控"
        brandName={brandName}
        onBrandChange={onBrandChange}
        actions={
          <button type="button" className="geo-btn-primary text-sm gap-1" onClick={openCreateModal}>
            <Plus className="w-4 h-4" /> 新建查询计划
          </button>
        }
      />

      <div
        className="flex gap-1 flex-wrap border-b -mb-px px-1"
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        {[
          { id: 'plans' as const, label: '查询计划' },
          { id: 'monitor' as const, label: '监测平台' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-title)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'monitor' && (
        <AiMonitorPlatformsPanel
          brandName={brandName}
          onNavigate={onNavigate}
          onSessionsChange={(_sessions, notReady) => setMonitorNotReadyCount(notReady)}
        />
      )}

      {activeTab === 'plans' && !detailPlanId && monitorNotReadyCount > 0 && (
        <div
          className="geo-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{ color: 'var(--neutral-text-02)' }}
        >
          <span>
            {monitorNotReadyCount} 个监测平台未就绪，执行采样前建议先完成登录并手动标记会话状态。
          </span>
          <button type="button" className="geo-link" onClick={() => setActiveTab('monitor')}>
            去监测平台配置
          </button>
        </div>
      )}

      {activeTab === 'plans' && detailPlanId ? (
        <IndexingPlanResultView
          planId={detailPlanId}
          onNavigate={onNavigate}
          onBack={closePlanDetail}
        />
      ) : activeTab === 'plans' ? (
        <div className="geo-table-wrap">
          <table className="geo-table">
            <thead>
              <tr>
                <th>计划</th>
                <th>品牌</th>
                <th>平台</th>
                <th>查询时间</th>
                <th>计划执行</th>
                <th>状态</th>
                <th>命中</th>
                <th className="geo-table__actions" aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-[var(--neutral-text-03)]">
                    暂无查询计划
                  </td>
                </tr>
              ) : (
                plans.map((p) => {
                  const hasResults = planHasResults(p);
                  const editable = canEditPlan(p);
                  return (
                  <tr key={p.id}>
                    <td>
                      <button
                        type="button"
                        className={`geo-link ${hasResults ? '' : 'opacity-60 cursor-default'}`}
                        onClick={() => hasResults && openPlanDetail(p.id)}
                        disabled={!hasResults}
                        title={hasResults ? '查看采样结果' : '暂无历史采样数据'}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="text-xs font-medium whitespace-nowrap">{p.brandName || '—'}</td>
                    <td className="text-xs">{p.platforms.join('、')}</td>
                    <td className="text-xs whitespace-nowrap">{formatPlanDateTime(p.queryAt)}</td>
                    <td className="text-xs whitespace-nowrap">{formatIndexSchedule(p)}</td>
                    <td className="text-xs">{formatIndexPlanStatus(p.status)}</td>
                    <td>{p.hitCount ?? 0}</td>
                    <td className="geo-table__actions">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                        {editable && (
                          <button
                            type="button"
                            className="geo-link text-xs inline-flex items-center gap-1 shrink-0"
                            onClick={() => void openEditModal(p)}
                          >
                            <Pencil className="w-3 h-3" />
                            编辑
                          </button>
                        )}
                        {(p.status === 'draft' || p.status === 'failed') && (
                          <button
                            type="button"
                            className="geo-link text-xs gap-1 inline-flex shrink-0"
                            onClick={() => void runPlan(p)}
                          >
                            <Play className="w-3 h-3" /> {p.status === 'failed' ? '重试' : '执行'}
                          </button>
                        )}
                        {hasResults && (
                          <button
                            type="button"
                            className="geo-link text-xs shrink-0"
                            onClick={() => openPlanDetail(p.id)}
                          >
                            {p.status === 'failed' ? '历史结果' : '查看结果'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {showCreateModal && (
        <div
          className="geo-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="index-plan-modal-title"
          onClick={closeCreateModal}
        >
          <div
            className="geo-modal max-w-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCreateModal}
              className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg"
              style={{ color: 'var(--neutral-text-03)' }}
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="geo-modal-head">
              <h3 id="index-plan-modal-title" className="font-bold text-sm" style={{ color: 'var(--neutral-text-01)' }}>
                {editingPlanId ? '编辑查询计划' : '新建查询计划'}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                {editingPlanId
                  ? '修改计划名称、关键词、平台与定时执行配置'
                  : '选择品牌并配置采样关键词与 AI 平台'}
              </p>
            </div>

            <div className="geo-modal-body space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
              <div>
                <label className="geo-label block mb-1">所属品牌 *</label>
                <select
                  className="geo-input w-full text-sm"
                  value={planBrand}
                  onChange={(e) => setPlanBrand(e.target.value)}
                  disabled={Boolean(editingPlanId)}
                >
                  <option value="">请选择品牌</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="geo-label block mb-1">计划名称 *</label>
                <input
                  className="geo-input w-full text-sm"
                  placeholder="例如：3月核心词收录巡检"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>

              <div>
                <p className="geo-label mb-2">关键词（词库）*</p>
                {keywords.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                    {planBrand ? '该品牌暂无关键词，请先在品牌中心维护词库' : '请先选择品牌'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {keywords.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => toggleKw(k.id)}
                        className={`text-xs px-2 py-1 rounded ${selectedKw.includes(k.id) ? 'geo-nav-active' : 'geo-nav-item'}`}
                      >
                        {k.term}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="geo-label mb-0">AI 平台 *</p>
                  <button
                    type="button"
                    className="geo-link text-xs"
                    onClick={selectReadyPlatformsOnly}
                  >
                    仅选已就绪
                  </button>
                  <button
                    type="button"
                    className="geo-link text-xs"
                    onClick={() => {
                      setShowCreateModal(false);
                      setActiveTab('monitor');
                    }}
                  >
                    去监测平台
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_INDEXING_PLATFORMS.map((p) => {
                    const ready = isAiMonitorSessionReady(modalSessionStatus(p));
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                          selectedPlatforms.includes(p) ? 'geo-nav-active' : 'geo-nav-item'
                        }`}
                      >
                        <span className={ready ? 'text-emerald-600' : 'text-[var(--neutral-text-03)]'}>
                          {ready ? '●' : '○'}
                        </span>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="geo-label block mb-1">查询时间</label>
                <input
                  type="datetime-local"
                  className="geo-input w-full text-sm"
                  value={queryAt}
                  onChange={(e) => setQueryAt(e.target.value)}
                />
              </div>

              <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--neutral-divider-03)' }}>
                <p className="geo-label mb-0">计划执行（可选）</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--neutral-text-03)' }}>
                      执行周期
                    </label>
                    <select
                      className="geo-input w-full text-sm"
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
                    >
                      {SCHEDULE_FREQUENCY_OPTIONS.map((o) => (
                        <option key={o.value || 'none'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {scheduleFrequency ? (
                    <div>
                      <label className="text-xs block mb-1" style={{ color: 'var(--neutral-text-03)' }}>
                        {scheduleFrequency === 'hourly' ? '每小时执行时刻（分）' : '执行时间点'}
                      </label>
                      {scheduleFrequency === 'hourly' ? (
                        <select
                          className="geo-input w-full text-sm"
                          value={scheduleRunTime.split(':')[1] ?? '00'}
                          onChange={(e) => setScheduleRunTime(`00:${e.target.value}`)}
                        >
                          {Array.from({ length: 60 }, (_, i) => (
                            <option key={i} value={String(i).padStart(2, '0')}>
                              第 {i} 分
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="time"
                          className="geo-input w-full text-sm"
                          value={scheduleRunTime}
                          onChange={(e) => setScheduleRunTime(e.target.value)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <p className="text-xs pb-2" style={{ color: 'var(--neutral-text-03)' }}>
                        不设置则创建后手动执行
                      </p>
                    </div>
                  )}
                </div>
                {scheduleFrequency === 'weekly' && (
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--neutral-text-03)' }}>
                      每周星期
                    </label>
                    <select
                      className="geo-input w-full text-sm max-w-xs"
                      value={scheduleWeekday}
                      onChange={(e) => setScheduleWeekday(Number(e.target.value))}
                    >
                      {WEEKDAY_OPTIONS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {scheduleFrequency === 'monthly' && (
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--neutral-text-03)' }}>
                      每月日期
                    </label>
                    <select
                      className="geo-input w-full text-sm max-w-xs"
                      value={scheduleMonthDay}
                      onChange={(e) => setScheduleMonthDay(Number(e.target.value))}
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          每月 {d} 日
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="geo-modal-foot flex justify-end gap-2">
              <button type="button" className="geo-btn-secondary text-sm" onClick={closeCreateModal} disabled={creating}>
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary text-sm"
                onClick={() => void savePlan()}
                disabled={creating || !canCreate}
              >
                {creating ? '保存中…' : editingPlanId ? '保存修改' : '创建计划'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
