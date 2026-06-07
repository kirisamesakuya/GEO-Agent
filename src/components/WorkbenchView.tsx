import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ViewType } from '../types';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import WorkbenchAlertStrip from './workbench/WorkbenchAlertStrip';
import WorkbenchDashboard, { type CockpitData } from './workbench/WorkbenchDashboard';
import WorkbenchHermesSummary from './workbench/WorkbenchHermesSummary';
import BrandClueStartFlow from './onboarding/BrandClueStartFlow';
import { fetchOnboardingStatus, type OnboardingStatus } from '../lib/onboarding-client';

interface PublisherDashboard extends CockpitData {
  brandName: string;
  geoInsight?: CockpitData['geoInsight'];
  todos: Array<{
    id: string;
    type: string;
    label: string;
    priority: string;
    targetView: string;
    targetHint?: string;
    count?: number;
  }>;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate: (view: ViewType, hint?: string) => void;
  onOnboardingStart?: (result: {
    brandName: string;
    extractTaskId: string;
    goal: string;
    clue?: {
      brandUrl?: string;
      website?: string;
      socialLink?: string;
      description?: string;
    };
  }) => void;
}

export default function WorkbenchView({ brandName, onBrandChange, onNavigate, onOnboardingStart }: Props) {
  const [data, setData] = useState<PublisherDashboard | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="geo-page-content overflow-y-auto h-full space-y-4">
        <PageHeaderWithBrand
          title="工作台"
          titleClassName="text-lg font-bold"
          brandName={brandName}
          onBrandChange={onBrandChange}
        />
        <p className="text-sm text-[var(--neutral-text-03)]">加载工作台…</p>
      </div>
    );
  }

  return (
    <div className="geo-page-content overflow-y-auto h-full space-y-4">
      <PageHeaderWithBrand
        title="工作台"
        titleClassName="text-lg font-bold"
        brandName={brandName}
        onBrandChange={onBrandChange}
        actions={
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
        }
      />

      {onboarding?.showOnboardingHero && onOnboardingStart && (
        <BrandClueStartFlow
          variant="page"
          onNavigate={onNavigate}
          onComplete={(result) => onOnboardingStart(result)}
        />
      )}

      {data && data.todos.length > 0 && (
        <WorkbenchAlertStrip todos={data.todos} onNavigate={onNavigate} />
      )}

      <WorkbenchHermesSummary brandName={brandName} onNavigate={onNavigate} />

      {!data ? (
        <div className="geo-card p-8 text-center text-sm text-[var(--neutral-text-03)]">
          <p>暂无该品牌看板数据。请从左侧导航进入 GEO 分析、收录排名或发布任务；待办条会提示需处理事项。</p>
        </div>
      ) : (
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
