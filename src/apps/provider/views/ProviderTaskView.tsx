import { useState, useEffect } from 'react';
import { Search, ShieldCheck, ChevronRight, Users } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { PROVIDER_TASK_HALL_FILTER_PLATFORMS } from '../../../lib/publish-content-platforms';
import { MARKETPLACE_PLATFORM_FEE_RATE } from '../../../../lib/marketplace-agreements';
import {
  PROVIDER_FEE_EXAMPLE,
  PROVIDER_ONBOARDING_AGREEMENT_LABEL,
  PROVIDER_TASK_CLAIM_ACK,
} from '../../../../lib/platform-legal-copy';
import { matchesSearch, platformPlaceholder, PLATFORM_SHORT, formatMarketplaceSlots, formatTaskPublishedAt } from '../lib/provider-ui';
import ProviderSubmitQuoteView from './ProviderSubmitQuoteView';
import { parseTaskBrief } from '../../../../lib/paid-source-brief';

interface Task {
  id: string;
  title: string;
  brandName: string;
  platform: string;
  budget?: number;
  deliverable: string;
  acceptance: string;
  description?: string;
  industry?: string;
  city?: string;
  deadline?: string;
  matchScore?: number;
  matchLabel?: string;
  slotTotal?: number;
  claimedCount?: number;
  availableSlots?: number;
  createdAt?: string;
  taskBriefJson?: string;
  isQuoteTask?: boolean;
  pricingMode?: string;
  contentDirection?: string;
  taskBriefJson?: string;
}

interface Props {
  providerId: string;
  providerName: string;
  approved: boolean;
  searchQuery: string;
  activeTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onNeedOnboarding: () => void;
  onClaimed?: () => void;
}

const MATCH_LOW_THRESHOLD = 50;

export default function ProviderTaskView({
  providerId,
  providerName,
  approved,
  searchQuery,
  activeTaskId,
  onSelectTask,
  onNeedOnboarding,
  onClaimed,
}: Props) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [platform, setPlatform] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ providerId });
    if (platform) params.set('platform', platform);
    fetch(`/api/provider/task-marketplace?${params}`)
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []));
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

  const claim = async () => {
    if (!approved) {
      onNeedOnboarding();
      return;
    }
    if (!selected || !confirmed) {
      toast('请确认已理解交付物和验收标准', 'error');
      return;
    }
    if ((selected.matchScore ?? 100) < MATCH_LOW_THRESHOLD) {
      const ok = window.confirm('匹配度较低，仍要领取该任务吗？');
      if (!ok) return;
    }
    setLoading(true);
    const res = await fetch(`/api/provider/task-orders/${selected.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, providerName, message: claimNote }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('领取成功，请前往「我的订单」开始交付', 'success');
    onClaimed?.();
    onSelectTask(null);
    setSelected(null);
    setClaimNote('');
    setConfirmed(false);
    load();
  };

  const filtered = tasks.filter(
    (t) =>
      matchesSearch(`${t.title} ${t.brandName}`, searchQuery) &&
      matchesSearch(`${t.title} ${t.brandName}`, localSearch)
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
    const matchPct = selected.matchScore ?? 85;
    const isQuote = selected.isQuoteTask || selected.pricingMode === 'provider_quote';
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
          className="text-xs text-provider-muted hover:text-brand flex items-center gap-1"
        >
          ← 返回任务大厅
        </button>
        <div className="provider-card rounded-2xl p-6 shadow-sm">
          <div className="flex gap-6 flex-col lg:flex-row">
            <div
              className="w-full lg:w-48 h-32 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: platformPlaceholder(selected.platform) }}
            >
              {PLATFORM_SHORT[selected.platform] ?? selected.platform}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-provider-title">{selected.title}</h1>
              <p className="text-sm text-provider-secondary mt-1">
                {selected.brandName}
                {!isQuote && selected.budget != null ? ` · 预算 ¥${selected.budget.toLocaleString()}` : ''}
              </p>
              {isQuote && (
                <p className="text-xs text-emerald-700 mt-1">报价任务 · 填写期望到手价 P0</p>
              )}
              <p className="text-[10px] text-provider-muted mt-1">
                验收通过后按实际结算金额结算；平台技术服务费 {(MARKETPLACE_PLATFORM_FEE_RATE * 100).toFixed(0)}%（例：¥{PROVIDER_FEE_EXAMPLE.settlement} 结算，您得 ¥{PROVIDER_FEE_EXAMPLE.income}）
              </p>
              <p className="text-[10px] text-provider-muted">{formatTaskPublishedAt(selected.createdAt)}</p>
              {selected.matchLabel && (
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-lg bg-brand-light text-brand font-medium">
                  {selected.matchLabel}
                </span>
              )}
              {(() => {
                const slots = formatMarketplaceSlots(selected);
                return (
                  <p className="text-xs text-provider-secondary mt-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {slots.claimedText} · {slots.availableText}
                    {selected.slotTotal != null && selected.slotTotal > 1 && (
                      <span className="text-provider-muted">（共 {selected.slotTotal} 名额）</span>
                    )}
                  </p>
                );
              })()}
              <p className="text-sm text-provider-secondary mt-4">{selected.description}</p>
              {brief && (
                <div className="mt-4 p-3 bg-provider-subtle rounded-xl text-xs space-y-1">
                  {brief.brandIntro && <p>品牌介绍：{brief.brandIntro}</p>}
                  {brief.productSellingPoints && <p>卖点：{brief.productSellingPoints}</p>}
                  {brief.targetKeywords?.length ? (
                    <p>关键词：{brief.targetKeywords.join('、')}</p>
                  ) : null}
                  {brief.complianceNotes && <p>合规：{brief.complianceNotes}</p>}
                  {brief.industryLimit && <p>行业限制：{brief.industryLimit}</p>}
                  {brief.regionLimit && <p>地区限制：{brief.regionLimit}</p>}
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
                <span className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-sm font-bold text-brand">
                  {matchPct}%
                </span>
              </div>
              <span className="text-[10px] text-provider-muted mt-2">匹配度</span>
            </div>
          </div>
          {!isQuote && (
            <>
          <p className="text-xs text-provider-secondary mt-6 bg-provider-subtle rounded-lg px-3 py-2">
            领取后任务将立即进入「执行中」，先到先得；若已被他人领取将无法重复领取。
          </p>
          <label className="flex items-start gap-2 mt-4 text-xs text-provider-secondary leading-relaxed">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>
              {PROVIDER_TASK_CLAIM_ACK}
              <span className="block mt-1 text-[10px] text-provider-muted">
                协议依据：{PROVIDER_ONBOARDING_AGREEMENT_LABEL}
              </span>
            </span>
          </label>
          <textarea
            value={claimNote}
            onChange={(e) => setClaimNote(e.target.value)}
            rows={2}
            placeholder="备注（可选，仅自己可见）"
            className="w-full mt-3 px-4 py-2 border border-provider rounded-xl text-sm outline-none focus:border-provider-subtle"
          />
          <button
            type="button"
            className="provider-btn-primary w-full mt-4 py-3 text-sm"
            disabled={loading || !confirmed || formatMarketplaceSlots(selected).isFull}
            onClick={() => void claim()}
          >
            {formatMarketplaceSlots(selected).isFull ? '名额已满' : loading ? '领取中…' : '立即领取'}
          </button>
            </>
          )}
          {isQuote && (
            <button
              type="button"
              className="provider-btn-primary w-full mt-6 py-3 text-sm"
              onClick={() => setShowQuoteForm(true)}
            >
              提交报价
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-provider-title">任务大厅</h1>
          <p className="text-xs text-provider-muted">报价任务提交 P0；历史固定预算任务可直接领取</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-provider-muted w-4 h-4" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 provider-card rounded-lg text-xs outline-none focus:border-brand/50"
            placeholder="搜索本页合作任务..."
          />
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-provider-muted col-span-2 py-8">暂无可领取任务</p>
        ) : (
          filtered.map((t) => {
            const slots = formatMarketplaceSlots(t);
            return (
            <button
              key={t.id}
              type="button"
              onClick={() => void selectTask(t.id)}
              className={`bg-white border rounded-2xl p-5 text-left hover:shadow-md transition-all group ${
                slots.isFull
                  ? 'border-provider opacity-75 hover:border-provider-subtle'
                  : 'border-provider hover:border-brand/40'
              }`}
            >
              <div className="flex gap-4">
                <div
                  className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: platformPlaceholder(t.platform) }}
                >
                  {PLATFORM_SHORT[t.platform] ?? t.platform}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-provider-title truncate group-hover:text-brand">{t.title}</h3>
                  <p className="text-xs text-provider-muted mt-1">{t.brandName}</p>
                  <p className="text-[10px] text-provider-muted mt-0.5">{formatTaskPublishedAt(t.createdAt)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] text-provider-secondary inline-flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      {slots.claimedText}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        slots.isFull ? 'bg-provider-hover text-provider-secondary' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {slots.availableText}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    {t.isQuoteTask || t.pricingMode === 'provider_quote' ? (
                      <span className="text-xs font-semibold text-emerald-700">提交报价</span>
                    ) : (
                      <span className="text-brand font-black">¥{(t.budget ?? 0).toLocaleString()}</span>
                    )}
                    {t.matchLabel && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-light text-brand">{t.matchLabel}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-provider-muted group-hover:text-brand shrink-0" />
              </div>
            </button>
            );
          })
        )}
      </div>
    </div>
  );
}
