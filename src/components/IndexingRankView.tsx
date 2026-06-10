import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Play, Plus, X } from 'lucide-react';
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
  buildContentItemEffectHint,
  buildIndexingGapHint,
  EFFECT_JUDGMENT_LABEL,
} from '../lib/article-effect-nav';
import {
  DEFAULT_INDEXING_PLATFORMS,
  GEO_AI_PLATFORM_LABELS,
} from '../../lib/media-platforms';
import AiMonitorPlatformsPanel from './indexing/AiMonitorPlatformsPanel';
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
  status: string;
  queryAt?: string;
  scheduleFrequency?: string;
  scheduleRunTime?: string;
  scheduleWeekday?: number;
  scheduleMonthDay?: number;
  hitCount?: number;
  resultCount?: number;
}

interface IndexCitationLink {
  title: string;
  url: string;
}

interface Result {
  id: string;
  keyword: string;
  platform: string;
  hit: boolean;
  citedMerchant: boolean;
  citationSnippet?: string;
  aiResponse?: string;
  citationUrls?: IndexCitationLink[];
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
  const { ensureHermesReady } = useHermesSubmitGuard();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailResult, setDetailResult] = useState<Result | null>(null);
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
  const [activeTab, setActiveTab] = useState<'monitor' | 'plans'>('monitor');
  const [monitorNotReadyCount, setMonitorNotReadyCount] = useState(0);
  const [modalMonitorSessions, setModalMonitorSessions] = useState<AiMonitorSession[]>([]);

  const selectedPlanRow = plans.find((p) => p.id === selectedPlan);

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
    fetchAiMonitorSessions(planBrand)
      .then((d) => setModalMonitorSessions(d.sessions))
      .catch(() => setModalMonitorSessions([]));
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

  const selectReadyPlatformsOnly = () => {
    const ready = DEFAULT_INDEXING_PLATFORMS.filter((p) => {
      const session = modalMonitorSessions.find((s) => s.platform === p);
      return session ? isAiMonitorSessionReady(session.status) : false;
    });
    setSelectedPlatforms(ready.length ? [...ready] : []);
  };

  const modalSessionStatus = (platform: string) =>
    modalMonitorSessions.find((s) => s.platform === platform)?.status ?? 'unknown';

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
          { id: 'monitor' as const, label: '监测平台' },
          { id: 'plans' as const, label: '查询计划' },
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

      {activeTab === 'plans' && monitorNotReadyCount > 0 && (
        <div
          className="geo-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{ color: 'var(--neutral-text-02)' }}
        >
          <span>
            {monitorNotReadyCount} 个监测平台未就绪，执行采样前建议先完成会话检测与登录。
          </span>
          <button type="button" className="geo-link" onClick={() => setActiveTab('monitor')}>
            去监测平台配置
          </button>
        </div>
      )}

      {activeTab === 'plans' && (
        <>
      <p className="text-xs text-[var(--neutral-text-03)] px-1">
        执行采样将调用本机 Hermes 技能 <code className="text-[11px]">geo-platform-ranking-sampling</code> 进行真机查询；部分平台可能需在本机浏览器登录。未就绪时将提示配置 Hermes。
      </p>

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
                  <td className="geo-table__actions">
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
          <div className="geo-table-wrap">
            <table className="geo-table geo-table--compact">
            <thead>
              <tr>
                <th className="w-8" aria-label="选择" />
                <th>品牌</th>
                <th>关键词</th>
                <th>平台</th>
                <th>命中</th>
                <th>引用商家文</th>
                <th>AI 返回</th>
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
                            'content_delivery',
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
                  <td className="text-xs">
                    <div className="flex items-center gap-2 min-w-0 max-w-[280px]">
                      <span className="truncate text-[var(--neutral-text-03)]">
                        {r.citationSnippet ?? (r.aiResponse ? '有完整回答' : '—')}
                      </span>
                      {(r.aiResponse || r.citationSnippet) && (
                        <button
                          type="button"
                          className="geo-link shrink-0 text-[11px]"
                          onClick={() => setDetailResult(r)}
                        >
                          查看
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="text-xs">{r.sampledAt.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {detailResult && (
        <div
          className="geo-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="index-result-detail-title"
          onClick={() => setDetailResult(null)}
        >
          <div
            className="geo-modal max-w-2xl relative max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDetailResult(null)}
              className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg z-10"
              style={{ color: 'var(--neutral-text-03)' }}
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="geo-modal-head shrink-0">
              <h3
                id="index-result-detail-title"
                className="font-bold text-sm"
                style={{ color: 'var(--neutral-text-01)' }}
              >
                AI 返回详情
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                {detailResult.platform} · {detailResult.keyword}
              </p>
            </div>

            <div className="px-5 pb-5 space-y-4 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div style={{ color: 'var(--neutral-text-03)' }}>命中</div>
                  <div className="font-medium mt-0.5">{detailResult.hit ? '是' : '否'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--neutral-text-03)' }}>引用商家文</div>
                  <div className="font-medium mt-0.5">{detailResult.citedMerchant ? '是' : '否'}</div>
                </div>
                <div className="col-span-2">
                  <div style={{ color: 'var(--neutral-text-03)' }}>采样时间</div>
                  <div className="font-medium mt-0.5">
                    {detailResult.sampledAt.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--neutral-text-02)' }}>
                  完整 AI 回答
                </div>
                <pre
                  className="text-xs leading-relaxed whitespace-pre-wrap rounded-lg p-3 border max-h-[320px] overflow-y-auto"
                  style={{
                    color: 'var(--neutral-text-01)',
                    background: 'var(--neutral-bg-02)',
                    borderColor: 'var(--neutral-border-01)',
                  }}
                >
                  {detailResult.aiResponse ?? detailResult.citationSnippet ?? '暂无返回内容'}
                </pre>
              </div>

              {detailResult.citationUrls && detailResult.citationUrls.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--neutral-text-02)' }}>
                    引用文章（{detailResult.citationUrls.length}）
                  </div>
                  <ul className="space-y-2">
                    {detailResult.citationUrls.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="geo-link text-xs inline-flex items-center gap-1.5 max-w-full"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{link.title || link.url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="geo-modal-foot shrink-0 flex justify-end">
              <button
                type="button"
                className="geo-btn-secondary text-sm"
                onClick={() => setDetailResult(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
        </>
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
