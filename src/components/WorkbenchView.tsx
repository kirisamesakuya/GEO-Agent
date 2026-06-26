import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewType } from '../types';
import WorkbenchResultPanel, {
  type WorkbenchKpi,
} from './workbench/WorkbenchResultPanel';
import { fetchOnboardingStatus, type OnboardingStatus } from '../lib/onboarding-client';
import { PUBLISHER_NOTIFICATIONS_UPDATED_EVENT } from '../lib/publisher-notification-events';

interface PublisherDashboard {
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
  workbenchKpi?: WorkbenchKpi;
  metrics?: {
    totalPublished: number;
    todayPublished: number;
    articlesGenerated: number;
    indexedKeywords: number;
    platformHitRate: number;
    brandMentionRate: number;
    freeSourcePublished: number;
    paidSourcePublished: number;
  };
  platformShare?: Array<{ platform: string; count: number }>;
  indexByKeyword?: Array<{ keyword: string; hits: number }>;
  geoInsight?: {
    latestReportId: string | null;
    analyzedAt: string | null;
    mentionRate: number;
  };
  samplingNote?: string;
  workbenchTodos?: Array<{
    id: string;
    label: string;
    priority?: string;
    type?: string;
    targetView: string;
    targetHint?: string;
  }>;
  taskBoard?: Array<{
    id: string;
    title: string;
    category: 'content' | 'website';
    categoryLabel: string;
    brandStatus: string;
    statusTone: 'warning' | 'info' | 'neutral' | 'success' | 'danger';
    stats: Array<{ label: string; value: number }>;
    progress?: { done: number; total: number; phaseLabel: string };
    keyOutputs?: Array<{ label: string; value: string; tone?: 'success' | 'danger' | 'neutral' }>;
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
  workbenchInProgress?: Array<{
    id: string;
    title: string;
    categoryLabel: string;
    statusLabel: string;
    targetView: string;
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

async function fetchPublisherDashboard(brandName: string): Promise<PublisherDashboard> {
  const res = await fetch(`/api/publisher/dashboard?brandName=${encodeURIComponent(brandName)}`);
  let body: PublisherDashboard & { error?: string } = {} as PublisherDashboard & { error?: string };
  try {
    body = await res.json();
  } catch {
    throw new Error('工作台数据加载失败');
  }
  if (!res.ok || body.error) {
    throw new Error(typeof body.error === 'string' ? body.error : '工作台数据加载失败');
  }
  return body;
}

export default function WorkbenchView({ brandName, onBrandChange, onNavigate, onStartFirstAudit }: Props) {
  const [data, setData] = useState<PublisherDashboard | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { background?: boolean }) => {
    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad && !options?.background) setInitialLoading(true);

    try {
      const dashboard = await fetchPublisherDashboard(brandName);
      setData(dashboard);
      setLoadError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '工作台数据加载失败';
      setLoadError(message);
      if (isFirstLoad && !options?.background) setData(null);
    } finally {
      if (isFirstLoad && !options?.background) setInitialLoading(false);
    }

    void fetchOnboardingStatus(brandName)
      .then(setOnboarding)
      .catch(() => setOnboarding(null));
  }, [brandName]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setData(null);
    setLoadError(null);
    setInitialLoading(true);
    void load();
  }, [brandName, load]);

  useEffect(() => {
    const onNotificationsUpdated = () => {
      void load({ background: true });
    };
    window.addEventListener(PUBLISHER_NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    return () => window.removeEventListener(PUBLISHER_NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
  }, [load]);

  if (initialLoading && !data) {
    return (
      <div className="geo-page-content space-y-4">
        <p className="text-sm text-[var(--neutral-text-03)]">加载工作台…</p>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="geo-page-content space-y-4">
        <div className="geo-card p-6 space-y-3 max-w-lg">
          <p className="text-sm font-medium text-[var(--color-title)]">工作台数据加载失败</p>
          <p className="text-sm text-[var(--neutral-text-03)]">{loadError}</p>
          <button type="button" className="geo-btn-primary geo-btn-sm" onClick={() => void load()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  const overview = data?.brandOverview ?? EMPTY_OVERVIEW;
  const displayBrand = data?.brandName ?? brandName;

  return (
    <div className="geo-page-content space-y-4">
      {loadError && (
        <div
          className="rounded-lg border px-3 py-2 text-xs text-amber-800 bg-amber-50 flex flex-wrap items-center justify-between gap-2"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
        >
          <span>刷新失败：{loadError}</span>
          <button type="button" className="geo-link text-xs" onClick={() => void load({ background: true })}>
            重试
          </button>
        </div>
      )}

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
        kpi={data?.workbenchKpi}
        geoMonitor={
          data?.metrics
            ? {
                metrics: {
                  indexedKeywords: data.metrics.indexedKeywords,
                  platformHitRate: data.metrics.platformHitRate,
                  brandMentionRate: data.metrics.brandMentionRate,
                  freeSourcePublished: data.metrics.freeSourcePublished ?? 0,
                  paidSourcePublished: data.metrics.paidSourcePublished ?? 0,
                },
                platformShare: data.platformShare ?? [],
                indexByKeyword: data.indexByKeyword ?? [],
                geoInsight: data.geoInsight,
              }
            : undefined
        }
        inProgressItems={(data?.workbenchInProgress ?? []).map((item) => ({
          ...item,
          targetView: item.targetView as ViewType,
        }))}
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
    </div>
  );
}
