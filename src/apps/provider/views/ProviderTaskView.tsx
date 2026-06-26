import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, ChevronRight, Users } from 'lucide-react';
import { PROVIDER_TASK_HALL_FILTER_PLATFORMS } from '../../../lib/publish-content-platforms';
import { MARKETPLACE_PLATFORM_FEE_RATE } from '../../../../lib/marketplace-agreements';
import { PROVIDER_FEE_EXAMPLE } from '../../../../lib/platform-legal-copy';
import {
  matchesSearch,
  platformPlaceholder,
  PLATFORM_SHORT,
  formatMarketplaceSlots,
  formatTaskPublishedAt,
} from '../lib/provider-ui';
import {
  TASK_HALL_FILTER_TABS,
  collectFilterOptions,
  filterByHallTab,
  mapTaskMarketplaceCard,
  type RawMarketplaceTask,
  type TaskHallFilterTab,
} from '../../../lib/view-models/task-marketplace';
import ProviderPageHeader from '../components/workspace/ProviderPageHeader';
import ProviderFilterBar from '../components/workspace/ProviderFilterBar';
import ProviderStatusTabs from '../components/workspace/ProviderStatusTabs';
import ProviderWorkbenchState from '../components/workspace/ProviderWorkbenchState';
import ProviderSubmitQuoteView from './ProviderSubmitQuoteView';
import { parseTaskBrief } from '../../../../lib/paid-source-brief';

interface Props {
  providerId: string;
  providerName: string;
  approved: boolean;
  searchQuery: string;
  activeTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onNeedOnboarding: () => void;
}

export default function ProviderTaskView({
  providerId,
  providerName,
  approved,
  searchQuery,
  activeTaskId,
  onSelectTask,
  onNeedOnboarding,
}: Props) {
  const [tasks, setTasks] = useState<RawMarketplaceTask[]>([]);
  const [selected, setSelected] = useState<RawMarketplaceTask | null>(null);
  const [platform, setPlatform] = useState('');
  const [hallTab, setHallTab] = useState<TaskHallFilterTab>('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const load = () => {
    setListLoading(true);
    setListError(false);
    const params = new URLSearchParams({ providerId });
    if (platform) params.set('platform', platform);
    fetch(`/api/provider/task-marketplace?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {
        setTasks([]);
        setListError(true);
      })
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    load();
  }, [providerId, platform]);

  useEffect(() => {
    if (!activeTaskId) {
      setSelected(null);
      return;
    }
    fetch(`/api/provider/task-marketplace/${activeTaskId}`)
      .then((r) => r.json())
      .then((d) => setSelected(d.task ?? null));
  }, [activeTaskId]);

  const selectTask = async (id: string) => {
    onSelectTask(id);
    const res = await fetch(`/api/provider/task-marketplace/${id}`);
    const data = await res.json();
    setSelected(data.task);
  };

  const filterOptions = useMemo(() => collectFilterOptions(tasks), [tasks]);

  const filtered = useMemo(() => {
    return filterByHallTab(tasks, hallTab).filter((t) => {
      if (!matchesSearch(`${t.title} ${t.brandName} ${t.matchLabel ?? ''}`, searchQuery)) return false;
      if (!matchesSearch(`${t.title} ${t.brandName} ${t.matchLabel ?? ''}`, localSearch)) return false;
      if (industryFilter && t.industry !== industryFilter) return false;
      if (directionFilter && t.contentDirection !== directionFilter) return false;
      return true;
    });
  }, [tasks, searchQuery, localSearch, hallTab, industryFilter, directionFilter]);

  const tabCounts = useMemo(() => {
    const base = tasks.filter(
      (t) =>
        matchesSearch(`${t.title} ${t.brandName}`, searchQuery) &&
        matchesSearch(`${t.title} ${t.brandName}`, localSearch) &&
        (!industryFilter || t.industry === industryFilter) &&
        (!directionFilter || t.contentDirection === directionFilter)
    );
    return {
      '': base.length,
      high: filterByHallTab(base, 'high').length,
      partial: filterByHallTab(base, 'partial').length,
      recent: filterByHallTab(base, 'recent').length,
    };
  }, [tasks, searchQuery, localSearch, industryFilter, directionFilter]);

  const cards = useMemo(
    () => filtered.map((t) => mapTaskMarketplaceCard(t, formatMarketplaceSlots)),
    [filtered]
  );

  if (selected && activeTaskId && showQuoteForm) {
    return (
      <ProviderSubmitQuoteView
        task={selected}
        providerId={providerId}
        providerName={providerName}
        approved={approved}
        onNeedOnboarding={onNeedOnboarding}
        onSubmitted={() => {
          setShowQuoteForm(false);
          onSelectTask(null);
          setSelected(null);
          load();
        }}
        onBack={() => setShowQuoteForm(false)}
      />
    );
  }

  if (selected && activeTaskId) {
    const card = mapTaskMarketplaceCard(selected, formatMarketplaceSlots);
    const matchPct = card.matchScore;
    const brief = parseTaskBrief(selected.taskBriefJson);
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            onSelectTask(null);
            setSelected(null);
            setShowQuoteForm(false);
          }}
          className="text-xs text-provider-muted hover:text-workbench flex items-center gap-1"
        >
          ← 返回任务大厅
        </button>
        <div className="provider-section-card">
          <div className="flex gap-6 flex-col lg:flex-row">
            <div
              className="w-full lg:w-48 h-32 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: platformPlaceholder(selected.platform) }}
            >
              {PLATFORM_SHORT[selected.platform] ?? selected.platform}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-provider-title">{selected.title}</h1>
              <p className="text-sm text-provider-secondary mt-1">{selected.brandName}</p>
              <p className="text-xs text-workbench mt-1">报价任务 · 填写期望到手价 P0</p>
              <p className="text-[10px] text-provider-muted mt-1">
                平台技术服务费 {(MARKETPLACE_PLATFORM_FEE_RATE * 100).toFixed(0)}%（例：¥
                {PROVIDER_FEE_EXAMPLE.settlement} 结算，您得 ¥{PROVIDER_FEE_EXAMPLE.income}）
              </p>
              <p className="text-[10px] text-provider-muted">{formatTaskPublishedAt(selected.createdAt)}</p>
              <span className="inline-block mt-2 text-xs px-2 py-1 rounded-lg bg-workbench-light text-workbench font-medium">
                {card.matchLabel}
              </span>
              {card.matchReasons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {card.matchReasons.map((r) => (
                    <li key={r} className="text-[11px] text-provider-secondary flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-workbench shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
              {card.suggestedRangeLabel && (
                <p className="text-xs text-workbench mt-2">建议到手区间 {card.suggestedRangeLabel}</p>
              )}
              <p className="text-xs text-provider-secondary mt-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {card.slotsClaimedText} · {card.slotsAvailableText}
              </p>
              {selected.description && (
                <p className="text-sm text-provider-secondary mt-4">{selected.description}</p>
              )}
              {brief && (
                <div className="mt-4 p-3 bg-provider-subtle rounded-xl text-xs space-y-1">
                  {brief.brandIntro && <p>品牌介绍：{brief.brandIntro}</p>}
                  {brief.productSellingPoints && <p>卖点：{brief.productSellingPoints}</p>}
                  {brief.targetKeywords?.length ? (
                    <p>关键词：{brief.targetKeywords.join('、')}</p>
                  ) : null}
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-provider-subtle rounded-xl">
                  <p className="text-xs text-provider-muted mb-1">交付物</p>
                  <p>{selected.deliverable}</p>
                </div>
                <div className="p-3 bg-provider-subtle rounded-xl">
                  <p className="text-xs text-provider-muted mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 验收标准
                  </p>
                  <p>{selected.acceptance}</p>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-center">
              <div
                className="w-20 h-20 match-ring flex items-center justify-center"
                style={{ ['--match-pct' as string]: `${matchPct}%` }}
              >
                <span className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-sm font-bold text-workbench">
                  {matchPct}%
                </span>
              </div>
              <span className="text-[10px] text-provider-muted mt-2">匹配度</span>
            </div>
          </div>
          <button
            type="button"
            className="provider-btn-workbench w-full mt-6 py-3 text-sm"
            onClick={() => {
              if (!approved) {
                onNeedOnboarding();
                return;
              }
              setShowQuoteForm(true);
            }}
          >
            提交报价方案
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProviderPageHeader
        title="任务大厅"
        subtitle="浏览匹配任务，填写 P0 到手价提交结构化报价方案"
      />

      <ProviderFilterBar searchValue={localSearch} onSearchChange={setLocalSearch}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlatform('')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
              platform === '' ? 'provider-nav-active' : 'provider-nav-item border border-provider'
            }`}
          >
            全部平台
          </button>
          {PROVIDER_TASK_HALL_FILTER_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                platform === p ? 'provider-nav-active' : 'provider-nav-item border border-provider'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {(filterOptions.industries.length > 0 || filterOptions.directions.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-provider-subtle">
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="provider-input-field text-xs w-auto min-w-[120px]"
            >
              <option value="">全部行业</option>
              {filterOptions.industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="provider-input-field text-xs w-auto min-w-[140px]"
            >
              <option value="">全部内容方向</option>
              {filterOptions.directions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </ProviderFilterBar>

      <ProviderStatusTabs
        tabs={TASK_HALL_FILTER_TABS.map((t) => ({
          ...t,
          count: tabCounts[t.id] ?? 0,
        }))}
        active={hallTab}
        onChange={(id) => setHallTab(id as TaskHallFilterTab)}
      />

      {listLoading && <ProviderWorkbenchState mode="loading" />}
      {!listLoading && listError && (
        <ProviderWorkbenchState
          mode="error"
          action={
            <button type="button" className="provider-btn-workbench text-sm" onClick={load}>
              重试
            </button>
          }
        />
      )}
      {!listLoading && !listError && filtered.length === 0 && (
        <ProviderWorkbenchState
          mode="empty"
          title="暂无可接任务"
          description="调整筛选条件或完善资料后，系统将推荐更匹配的任务"
        />
      )}

      {!listLoading && !listError && cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => void selectTask(card.id)}
              className={`provider-section-card text-left hover:shadow-md transition-all group ${
                card.isFull ? 'opacity-75' : 'hover:border-workbench/30'
              }`}
            >
              <div className="flex gap-4">
                <div
                  className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: platformPlaceholder(card.platform) }}
                >
                  {PLATFORM_SHORT[card.platform] ?? card.platform}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-provider-title truncate group-hover:text-workbench">{card.title}</h3>
                  <p className="text-xs text-provider-muted mt-1">{card.brandName}</p>
                  <p className="text-[10px] text-provider-muted mt-0.5">{card.publishedAtLabel}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] text-provider-secondary">{card.slotsClaimedText}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-workbench-light text-workbench">
                      {card.matchLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-workbench">提交报价</span>
                      {card.suggestedRangeLabel && (
                        <p className="text-[10px] text-provider-muted mt-0.5 truncate">
                          建议 {card.suggestedRangeLabel}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-provider-muted shrink-0">匹配 {card.matchScore}%</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-provider-muted group-hover:text-workbench shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
