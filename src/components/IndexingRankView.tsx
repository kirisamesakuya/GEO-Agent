import { useCallback, useEffect, useState } from 'react';
import { Play, Plus, X } from 'lucide-react';
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
import BrandScopeBar from './common/BrandScopeBar';
import { useToast } from '../context/ToastContext';
import {
  buildContentItemEffectHint,
  buildIndexingGapHint,
  EFFECT_JUDGMENT_LABEL,
} from '../lib/article-effect-nav';
import {
  DEFAULT_INDEXING_PLATFORMS,
  GEO_AI_PLATFORM_LABELS,
} from '../../lib/media-platforms';

interface Plan {
  id: string;
  brandName: string;
  name: string;
  platforms: string[];
  keywords: string[];
  status: string;
  queryAt?: string;
  scheduleFrequency?: string;
  scheduleRunTime?: string;
  scheduleWeekday?: number;
  scheduleMonthDay?: number;
  hitCount?: number;
  resultCount?: number;
}

interface Result {
  id: string;
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant: boolean;
  citationSnippet?: string;
  sampledAt: string;
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterHit, setFilterHit] = useState<string>('');
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  const [gapCoverage, setGapCoverage] = useState<
    Record<string, { contentItemId: string; title: string; overallJudgment: string }>
  >({});

  const selectedPlanRow = plans.find((p) => p.id === selectedPlan);

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
    if (plans.some((p) => p.id === planId)) loadResults(planId);
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
  }, [showCreateModal, planBrand, loadKeywordsForBrand]);

  const loadResults = (planId: string) => {
    setSelectedPlan(planId);
    setSelectedResultIds(new Set());
    setGapCoverage({});
    const brand = plans.find((p) => p.id === planId)?.brandName || brandName;
    fetch(`/api/indexing/plans/${planId}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .catch(() => {});
    if (brand) {
      fetch(
        `/api/indexing/plans/${planId}/gap-coverage?brandName=${encodeURIComponent(brand)}`
      )
        .then((r) => r.json())
        .then((d) => {
          const map: Record<
            string,
            { contentItemId: string; title: string; overallJudgment: string }
          > = {};
          for (const link of (d.links ?? []) as Array<{
            question: string;
            contentItemId: string;
            title: string;
            overallJudgment: string;
          }>) {
            map[link.question] = {
              contentItemId: link.contentItemId,
              title: link.title,
              overallJudgment: link.overallJudgment,
            };
          }
          setGapCoverage(map);
        })
        .catch(() => {});
    }
  };

  const openCreateModal = () => {
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

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreateModal(false);
  };

  const createPlan = async () => {
    if (!planBrand) return;
    if (!planName.trim() || selectedKw.length === 0 || selectedPlatforms.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/indexing/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: planBrand,
          name: planName,
          platforms: selectedPlatforms,
          keywordIds: selectedKw,
          queryAt: queryAt ? new Date(queryAt).toISOString() : undefined,
          scheduleFrequency: scheduleFrequency || undefined,
          scheduleRunTime: scheduleFrequency ? scheduleRunTime : undefined,
          scheduleWeekday:
            scheduleFrequency === 'weekly' ? scheduleWeekday : undefined,
          scheduleMonthDay:
            scheduleFrequency === 'monthly' ? scheduleMonthDay : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast(data.error ?? '创建失败', 'error');
        return;
      }
      toast('查询计划已创建', 'success');
      setShowCreateModal(false);
      setPlanName('');
      if (planBrand === brandName) loadPlans();
      else onBrandChange(planBrand);
    } finally {
      setCreating(false);
    }
  };

  const runPlan = async (plan: Plan) => {
    const runBrand = plan.brandName || brandName;
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
            loadResults(plan.id);
          }
        });
    }, 2500);
  };

  const toggleKw = (id: string) => {
    setSelectedKw((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const filteredResults = results.filter((r) => {
    if (filterPlatform && r.platform !== filterPlatform) return false;
    if (filterHit === 'true' && !r.hit) return false;
    if (filterHit === 'false' && r.hit) return false;
    return true;
  });

  const toggleResult = (id: string) => {
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateGapArticles = () => {
    if (!selectedPlan || selectedResultIds.size === 0) {
      toast('请先勾选采样结果', 'error');
      return;
    }
    if (!onNavigate) {
      toast('无法跳转生成页', 'error');
      return;
    }
    const hint = buildIndexingGapHint(selectedPlan, [...selectedResultIds]);
    onNavigate('generate_article', hint);
  };

  const canCreate =
    Boolean(planBrand) &&
    planName.trim().length > 0 &&
    selectedKw.length > 0 &&
    selectedPlatforms.length > 0;

  return (
    <div className="geo-page-content overflow-y-auto h-full space-y-4">
      <BrandScopeBar
        label="为哪个品牌查询收录"
        brandName={brandName}
        onBrandChange={onBrandChange}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">排名监控</h2>
          <p className="text-xs text-[var(--neutral-text-03)]">结构化 Agent 采样 · 数据同步至工作台驾驶舱</p>
        </div>
        <button type="button" className="geo-btn-primary text-sm gap-1" onClick={openCreateModal}>
          <Plus className="w-4 h-4" /> 新建查询计划
        </button>
      </div>

      <div className="geo-card overflow-hidden">
        <table className="w-full text-sm geo-table">
          <thead>
            <tr>
              <th className="text-left">计划</th>
              <th>品牌</th>
              <th>平台</th>
              <th>查询时间</th>
              <th>计划执行</th>
              <th>状态</th>
              <th>命中</th>
              <th />
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
              plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button type="button" className="geo-link" onClick={() => loadResults(p.id)}>
                      {p.name}
                    </button>
                  </td>
                  <td className="text-xs font-medium whitespace-nowrap">{p.brandName || '—'}</td>
                  <td className="text-xs">{p.platforms.join('、')}</td>
                  <td className="text-xs whitespace-nowrap">{formatPlanDateTime(p.queryAt)}</td>
                  <td className="text-xs whitespace-nowrap">{formatIndexSchedule(p)}</td>
                  <td className="text-xs">{formatIndexPlanStatus(p.status)}</td>
                  <td>{p.hitCount ?? 0}</td>
                  <td>
                    {(p.status === 'draft' || p.status === 'failed') && (
                      <button
                        type="button"
                        className="geo-link text-xs gap-1 inline-flex"
                        onClick={() => void runPlan(p)}
                      >
                        <Play className="w-3 h-3" /> {p.status === 'failed' ? '重试' : '执行'}
                      </button>
                    )}
                    {p.status === 'done' && (
                      <button type="button" className="geo-link text-xs" onClick={() => loadResults(p.id)}>
                        结果
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPlan && (
        <div className="geo-card p-4">
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <span className="text-sm font-semibold">查询结果</span>
            {selectedPlanRow?.brandName && (
              <span className="text-xs px-2 py-0.5 rounded-md geo-nav-item">{selectedPlanRow.brandName}</span>
            )}
            <select
              className="geo-input text-xs"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
            >
              <option value="">全部平台</option>
              {GEO_AI_PLATFORM_LABELS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select className="geo-input text-xs" value={filterHit} onChange={(e) => setFilterHit(e.target.value)}>
              <option value="">全部命中</option>
              <option value="true">已命中</option>
              <option value="false">未命中</option>
            </select>
            {onNavigate && (
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm ml-auto"
                disabled={selectedResultIds.size === 0}
                onClick={generateGapArticles}
              >
                生成补缺文章（{selectedResultIds.size}）
              </button>
            )}
          </div>
          <table className="w-full text-sm geo-table">
            <thead>
              <tr>
                <th className="w-8" />
                <th>品牌</th>
                <th>关键词</th>
                <th>平台</th>
                <th>命中</th>
                <th>引用商家文</th>
                <th>引用内容</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedResultIds.has(r.id)}
                      onChange={() => toggleResult(r.id)}
                      aria-label={`选择 ${r.keyword}`}
                    />
                  </td>
                  <td className="text-xs">{selectedPlanRow?.brandName ?? '—'}</td>
                  <td>
                    <div>{r.keyword}</div>
                    {gapCoverage[r.keyword] && onNavigate && (
                      <button
                        type="button"
                        className="geo-link text-[11px] mt-0.5"
                        onClick={() =>
                          onNavigate(
                            'content_library',
                            buildContentItemEffectHint(gapCoverage[r.keyword].contentItemId)
                          )
                        }
                      >
                        已有补缺文章，查看效果（
                        {EFFECT_JUDGMENT_LABEL[gapCoverage[r.keyword].overallJudgment] ??
                          '待观察'}
                        ）
                      </button>
                    )}
                  </td>
                  <td>{r.platform}</td>
                  <td>{r.hit ? '是' : '否'}</td>
                  <td>{r.citedMerchant ? '是' : '否'}</td>
                  <td className="text-xs max-w-[200px] truncate">{r.citationSnippet ?? '—'}</td>
                  <td className="text-xs">{r.sampledAt.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                新建查询计划
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                选择品牌并配置采样关键词与 AI 平台
              </p>
            </div>

            <div className="geo-modal-body space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
              <div>
                <label className="geo-label block mb-1">所属品牌 *</label>
                <select
                  className="geo-input w-full text-sm"
                  value={planBrand}
                  onChange={(e) => setPlanBrand(e.target.value)}
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
                <p className="geo-label mb-2">AI 平台 *</p>
                <div className="flex flex-wrap gap-2">
                  {GEO_AI_PLATFORM_LABELS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`text-xs px-2 py-1 rounded ${selectedPlatforms.includes(p) ? 'geo-nav-active' : 'geo-nav-item'}`}
                    >
                      {p}
                    </button>
                  ))}
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
                onClick={() => void createPlan()}
                disabled={creating || !canCreate}
              >
                {creating ? '创建中…' : '创建计划'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
