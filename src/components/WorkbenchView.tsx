import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ViewType } from '../types';
import WorkbenchResultPanel from './workbench/WorkbenchResultPanel';
import WorkbenchDashboard, { type CockpitData } from './workbench/WorkbenchDashboard';
import { fetchOnboardingStatus, type OnboardingStatus } from '../lib/onboarding-client';

interface PublisherDashboard extends CockpitData {
  brandName: string;
  brandIndustry?: string;
  brandOverview?: {
    inProgress: number;
    pendingAction: number;
    completedThisWeek: number;
    creditsBalance: number;
    deliveryBalance: number;
    publishAccountCount: number;
    websiteServiceBalance?: number;
  };
  workbenchTodos?: Array<{
    id: string;
    label: string;
    targetView: string;
    targetHint?: string;
  }>;
  taskBoard?: Array<{
    id: string;
    title: string;
    category: 'content' | 'website';
    categoryLabel: string;
    brandStatus: string;
    statusTone: 'warning' | 'info' | 'neutral';
    stats: Array<{ label: string; value: number }>;
    actionLabel: string;
    targetView: string;
    targetHint?: string;
  }>;
  recentCompleted?: Array<{
    id: string;
    title: string;
    statusLabel: string;
    categoryLabel: string;
    responsibleParty?: string;
    completedAt: string;
    targetView?: string;
    targetHint?: string;
  }>;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate: (view: ViewType, hint?: string) => void;
  onStartFirstAudit?: () => void;
}

const EMPTY_OVERVIEW = {
  inProgress: 0,
  pendingAction: 0,
  completedThisWeek: 0,
  creditsBalance: 0,
  deliveryBalance: 0,
  publishAccountCount: 0,
  websiteServiceBalance: 0,
};

export default function WorkbenchView({ brandName, onBrandChange, onNavigate, onStartFirstAudit }: Props) {
  const [data, setData] = useState<PublisherDashboard | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLegacyCharts, setShowLegacyCharts] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/publisher/dashboard?brandName=${encodeURIComponent(brandName)}`).then((r) => r.json()),
      fetchOnboardingStatus(brandName).catch(() => null),
    ])
      .then(([d, ob]) => {
        if (d.error) setData(null);
        else setData(d);
        setOnboarding(ob);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [brandName]);

  if (loading && !data) {
    return (
      <div className="geo-page-content space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--color-title)]">工作台</h2>
        </header>
        <p className="text-sm text-[var(--neutral-text-03)]">加载工作台…</p>
      </div>
    );
  }

  const overview = data?.brandOverview ?? EMPTY_OVERVIEW;
  const displayBrand = data?.brandName ?? brandName;

  return (
    <div className="geo-page-content space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--color-title)]">工作台</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm text-xs"
            onClick={() => setShowLegacyCharts((v) => !v)}
          >
            {showLegacyCharts ? '收起数据图表' : '展开数据图表'}
          </button>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm inline-flex items-center gap-1.5"
            onClick={load}
            disabled={loading}
            aria-label="刷新工作台数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            刷新
          </button>
        </div>
      </header>

      {onboarding?.showOnboardingHero && onStartFirstAudit && (
        <div className="geo-card p-6 md:p-8 space-y-3">
          <h3 className="font-bold text-base">3 分钟完成首次 GEO 检测</h3>
          <p className="text-sm text-[var(--neutral-text-03)]">
            添加品牌资料并发起 AI 可见度首检。完成后可在 GEO 分析与任务结果中心查看报告。
          </p>
          <button type="button" className="geo-btn-primary geo-btn-sm" onClick={onStartFirstAudit}>
            添加品牌 · 首次体检
          </button>
        </div>
      )}

      <WorkbenchResultPanel
        brandName={displayBrand}
        brandIndustry={data?.brandIndustry}
        overview={overview}
        todos={(data?.workbenchTodos ?? []).map((t) => ({
          ...t,
          targetView: t.targetView as ViewType,
        }))}
        taskCards={(data?.taskBoard ?? []).map((c) => ({
          ...c,
          targetView: c.targetView as ViewType,
        }))}
        recentCompleted={(data?.recentCompleted ?? []).map((r) => ({
          ...r,
          targetView: r.targetView as ViewType | undefined,
        }))}
        onNavigate={onNavigate}
        onBrandChange={onBrandChange}
      />

      {showLegacyCharts && data && (
        <WorkbenchDashboard
          data={{
            metrics: data.metrics,
            platformShare: data.platformShare,
            indexByKeyword: data.indexByKeyword,
            publishTrend: data.publishTrend,
            indexTrend: data.indexTrend,
            recentIndexResults: data.recentIndexResults,
            samplingNote: data.samplingNote,
            geoInsight: data.geoInsight,
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
