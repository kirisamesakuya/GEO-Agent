import { useState, useEffect } from 'react';
import type { AppMode, ViewType, AgentTaskStatus } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WorkbenchView from './components/WorkbenchView';
import IndexingRankView from './components/IndexingRankView';
import GenerateArticleView from './components/GenerateArticleView';
import GeoAnalysisView from './components/GeoAnalysisView';
import CreateOrderView from './components/CreateOrderView';
import {
  createOrderModeFromHint,
  parseGeoReportIdFromHint,
  parseGeoReportIdFromUrl,
} from './lib/create-order-nav';
import { parseCustomTaskKindFromHint } from './lib/custom-order-types';
import CreateWebsiteView from './components/CreateWebsiteView';
import OrderDeliveryView from './components/OrderDeliveryView';
import BrandCenterView from './components/BrandCenterView';
import BrandListView from './components/BrandListView';
import SelfAccountPublishView, { selfAccountPublishTabFromHint } from './components/SelfAccountPublishView';
import { legacyContentTabToOrderStage } from './lib/order-delivery-filters';

function isLikelyOrderId(hint: string): boolean {
  return hint.length >= 20 && /^[a-z0-9_-]+$/i.test(hint);
}

function resolveOrderDeliveryProps(viewHint?: string) {
  const params = new URLSearchParams(window.location.search);
  const orderTab = params.get('orderTab');
  let mainTab: 'task' | 'website' | undefined;
  if (orderTab === 'website') {
    mainTab = 'website';
  } else if (orderTab === 'task') {
    mainTab = 'task';
  }

  const hintParam = params.get('hint') ?? viewHint;
  const taskOrderId = parseTaskOrderIdFromHint(hintParam ?? undefined);
  const websiteReqId = parseWebsiteRequirementIdFromHint(hintParam ?? undefined);

  return { mainTab, taskOrderId, websiteReqId };
}
import {
  viewToBrandCenterTabWithHint,
  resolveBrandCenterTabFromUrl,
  brandCenterTabToView,
  type BrandCenterTab,
} from './lib/brand-center';
import PublishAccountManageView from './components/PublishAccountManageView';
import AccountFundsView from './components/AccountFundsView';
import UserCenterView from './components/UserCenterView';
import AgentTasksView from './components/AgentTasksView';
import GeoProjectLibraryShell from './components/geo-project/GeoProjectLibraryShell';
import ArticleResultDetailView from './components/article/ArticleResultDetailView';
import PublishRecordDetailView from './components/article/PublishRecordDetailView';
import TaskOrderDetailView from './components/delivery/TaskOrderDetailView';
import WebPageRequirementDetailView from './components/delivery/WebPageRequirementDetailView';
import {
  parseArticleResultSectionFromUrl,
  parseContentItemIdFromHint,
  parsePublishRecordIdFromHint,
} from './lib/article-result-nav';
import {
  parseTaskOrderIdFromHint,
  parseWebsiteRequirementIdFromHint,
} from './lib/website-requirement-nav';
import TeamSettingsView from './components/TeamSettingsView';
import NotificationsView from './components/NotificationsView';
import ShareGeoReportView from './components/ShareGeoReportView';
import ProviderApp from './apps/provider/ProviderApp';
import { isProspectBrandScope } from './lib/brand-scope';
import PlatformApp from './apps/platform/PlatformApp';
import QuickStartModal from './components/common/QuickStartModal';
import BrandConfirmView from './components/onboarding/BrandConfirmView';
import OnboardingConsoleView from './components/onboarding/OnboardingConsoleView';
import type { OnboardingGoal } from './lib/brand-clue';

const BRAND_STORAGE_KEY = 'geo_selected_brand';

function resolveAppMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  const app = params.get('app');
  if (app === 'provider' || app === 'platform') return app;
  return 'publisher';
}

function resolveInitialRoute(): { view: ViewType; hint?: string } {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('view');
  const publishTab = params.get('publishTab');

  if (v === 'publish_schedule') return { view: 'self_account_publish', hint: 'schedule' };
  if (v === 'publish_records') return { view: 'content_library', hint: 'publish_records' };
  if (v === 'self_account_publish' && publishTab === 'records') {
    return { view: 'content_library', hint: 'publish_records' };
  }
  if (v === 'content_library') {
    const hint = params.get('hint') ?? undefined;
    if (hint) return { view: 'content_library', hint };
    const contentTab = params.get('contentTab');
    if (contentTab === 'publish_records') return { view: 'content_library', hint: 'publish_records' };
  }
  if (v === 'order_delivery') {
    if (params.get('orderTab') === 'publish_records') {
      return { view: 'content_library', hint: 'publish_records' };
    }
    const hint = params.get('hint') ?? undefined;
    if (hint) return { view: 'order_delivery', hint };
  }
  if (v === 'content_publish' || v === 'create_order') {
    if (v === 'content_publish') {
      const legacy = legacyContentTabToOrderStage(params.get('contentTab'));
      if (legacy) return { view: 'order_delivery', hint: legacy };
    }
    const om = params.get('orderMode');
    if (om === 'custom') {
      return { view: 'create_order', hint: params.get('orderTask') ?? 'article_writing' };
    }
    return { view: 'create_order', hint: 'ai' };
  }
  if (v === 'delivery_plan') {
    return { view: 'create_order', hint: 'ai' };
  }
  const allowed: ViewType[] = [
    'workbench', 'keyword_library', 'knowledge_base', 'indexing_rank',
    'asset_library', 'publish_schedule', 'publish_records', 'content_publish',
    'create_order', 'self_account_publish', 'generate_article', 'geo_analysis', 'delivery_plan',
    'create_website', 'content_library', 'order_delivery', 'agent_tasks', 'brand_list',
    'brand_profile', 'account_binding', 'account_funds', 'user_center', 'team_settings',
    'notifications', 'brand_confirm', 'onboarding_console',
  ];
  if (v && allowed.includes(v as ViewType)) return { view: v as ViewType };
  return { view: 'workbench' };
}

export default function App() {
  const shareReportId = new URLSearchParams(window.location.search).get('shareReport');
  const initialRoute = resolveInitialRoute();
  const [appMode] = useState<AppMode>(resolveAppMode);
  const [activeView, setActiveView] = useState<ViewType>(initialRoute.view);
  const [viewHint, setViewHint] = useState<string | undefined>(initialRoute.hint);
  const [brandName, setBrandName] = useState<string>('云杉口腔');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [onboardingBrand, setOnboardingBrand] = useState<string | null>(null);
  const [onboardingGoal, setOnboardingGoal] = useState<OnboardingGoal>('geo_quick_start');
  const [onboardingClue, setOnboardingClue] = useState<{
    brandUrl?: string;
    website?: string;
    socialLink?: string;
    description?: string;
  } | null>(null);
  const [headerTaskStatus, setHeaderTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [brandOptions, setBrandOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(BRAND_STORAGE_KEY);
    fetch('/api/brands')
      .then((res) => res.json())
      .then((data) => {
        const brands = data.brands as Array<{ id: string; name: string; isDefault?: boolean }> | undefined;
        if (brands?.length) {
          setBrandOptions(brands.map((b) => ({ id: b.id, name: b.name })));
        }
        if (saved && brands?.some((b) => b.name === saved)) {
          setBrandName(saved);
          return;
        }
        const def = brands?.find((b) => b.isDefault) ?? brands?.[0];
        if (def?.name) setBrandName(def.name);
      })
      .catch(() => {
        fetch('/api/brand-profile')
          .then((r) => r.json())
          .then((d) => { if (d?.name) setBrandName(d.name); })
          .catch(() => {});
      });
  }, []);

  if (shareReportId) {
    return <ShareGeoReportView reportId={shareReportId} />;
  }

  const handleBrandChange = (name: string) => {
    setBrandName(name);
    if (name !== '__all__' && !isProspectBrandScope(name)) {
      localStorage.setItem(BRAND_STORAGE_KEY, name);
    }
  };

  if (appMode === 'provider') return <ProviderApp />;
  if (appMode === 'platform') return <PlatformApp />;

  const effectiveBrand =
    brandName === '__all__' || isProspectBrandScope(brandName) ? '云杉口腔' : brandName;

  const navigate = (view: ViewType, hint?: string) => {
    let targetView = view;
    let targetHint = hint;
    if (view === 'content_publish') {
      targetView = 'create_order';
      if (!targetHint) targetHint = 'ai';
    } else if (view === 'delivery_plan') {
      targetView = 'create_order';
      if (!targetHint) targetHint = 'ai';
    }
    if (view === 'publish_schedule') {
      targetView = 'self_account_publish';
      targetHint = 'schedule';
    } else if (view === 'publish_records') {
      targetView = 'content_library';
      targetHint = 'publish_records';
    }
    setActiveView(targetView);
    setViewHint(targetHint);
    setShowNewTaskModal(false);
    if (targetView !== 'generate_article') setHeaderTaskStatus(null);
    const url = new URL(window.location.href);
    url.searchParams.set('view', targetView);
    if (targetView === 'self_account_publish') {
      url.searchParams.set('publishTab', selfAccountPublishTabFromHint(targetHint));
      url.searchParams.delete('contentTab');
    } else if (targetView === 'create_order') {
      const orderMode = createOrderModeFromHint(targetHint);
      url.searchParams.set('orderMode', orderMode);
      const geoReportId = parseGeoReportIdFromHint(targetHint);
      if (geoReportId) url.searchParams.set('geoReportId', geoReportId);
      else url.searchParams.delete('geoReportId');
      if (orderMode === 'custom') {
        const task = parseCustomTaskKindFromHint(targetHint);
        if (task) url.searchParams.set('orderTask', task);
      } else {
        url.searchParams.delete('orderTask');
      }
      url.searchParams.delete('publishTab');
      url.searchParams.delete('contentTab');
    } else if (targetView === 'geo_analysis') {
      url.searchParams.delete('publishTab');
      url.searchParams.delete('contentTab');
      if (targetHint === 'history' || targetHint?.startsWith('report:')) {
        url.searchParams.set('geoTab', 'history');
        if (targetHint?.startsWith('report:')) url.searchParams.set('reportId', targetHint.slice(7));
      } else if (targetHint === 'audit') {
        url.searchParams.set('geoTab', 'audit');
        url.searchParams.delete('reportId');
      } else if (targetHint === 'assets') {
        url.searchParams.set('geoTab', 'assets');
        url.searchParams.delete('reportId');
      } else if (targetHint === 'quick_start' || targetHint === 'smart_check') {
        url.searchParams.set('geoTab', 'smart_check');
        url.searchParams.delete('reportId');
      } else {
        url.searchParams.set('geoTab', 'smart_check');
        url.searchParams.delete('reportId');
      }
    } else if (targetView === 'content_library') {
      url.searchParams.delete('publishTab');
      url.searchParams.delete('geoTab');
      url.searchParams.delete('reportId');
      if (targetHint === 'publish_records') {
        url.searchParams.set('contentTab', 'publish_records');
        url.searchParams.delete('hint');
      } else if (targetHint?.startsWith('content:') || targetHint?.startsWith('publish:')) {
        url.searchParams.set('hint', targetHint);
        url.searchParams.delete('contentTab');
      } else if (targetHint?.startsWith('project:')) {
        url.searchParams.set('hint', targetHint);
      } else {
        url.searchParams.delete('hint');
      }
    } else {
      url.searchParams.delete('publishTab');
      url.searchParams.delete('contentTab');
      url.searchParams.delete('geoTab');
      url.searchParams.delete('reportId');
    }
    if (targetView === 'indexing_rank' && targetHint) {
      url.searchParams.set('planId', targetHint);
      url.searchParams.delete('hint');
    } else {
      url.searchParams.delete('planId');
    }
    if (targetView === 'order_delivery') {
      url.searchParams.delete('contentTab');
      url.searchParams.delete('publishTab');
      if (targetHint?.startsWith('order:')) {
        url.searchParams.set('hint', targetHint);
        url.searchParams.set('orderTab', 'task');
      } else if (targetHint?.startsWith('website_req:')) {
        url.searchParams.set('hint', targetHint);
        url.searchParams.set('orderTab', 'website');
      } else if (targetHint === 'website') {
        url.searchParams.set('orderTab', 'website');
        url.searchParams.delete('hint');
      } else if (targetHint === 'task') {
        url.searchParams.set('orderTab', 'task');
        url.searchParams.delete('hint');
      } else if (targetHint && isLikelyOrderId(targetHint)) {
        url.searchParams.set('hint', `order:${targetHint}`);
        url.searchParams.set('orderTab', 'task');
      } else {
        if (!url.searchParams.get('orderTab')) url.searchParams.set('orderTab', 'task');
        url.searchParams.delete('hint');
      }
      url.searchParams.delete('orderStage');
    } else if (targetHint && !['create_order', 'self_account_publish', 'indexing_rank', 'content_library'].includes(targetView)) {
      url.searchParams.set('hint', targetHint);
    } else if (targetView !== 'indexing_rank') {
      url.searchParams.delete('hint');
    }
    window.history.pushState({}, '', url);
  };

  const openBrandWorkspace = (name: string, tab: BrandCenterTab) => {
    handleBrandChange(name);
    setActiveView(brandCenterTabToView(tab));
    setViewHint(undefined);
    const url = new URL(window.location.href);
    url.searchParams.set('view', brandCenterTabToView(tab));
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  const handleOnboardingStart = (result: {
    brandName: string;
    extractTaskId: string;
    goal: string;
    clue?: {
      brandUrl?: string;
      website?: string;
      socialLink?: string;
      description?: string;
    };
    brand?: { website?: string; description?: string };
  }) => {
    handleBrandChange(result.brandName);
    setOnboardingBrand(result.brandName);
    setOnboardingGoal((result.goal as OnboardingGoal) ?? 'geo_quick_start');
    const website =
      result.clue?.brandUrl?.trim() ||
      result.clue?.website?.trim() ||
      result.brand?.website?.trim() ||
      '';
    setOnboardingClue({
      brandUrl: website || undefined,
      website: website || undefined,
      socialLink: result.clue?.socialLink?.trim() || undefined,
      description:
        result.clue?.description?.trim() ||
        result.brand?.description?.trim() ||
        undefined,
    });
    setShowNewTaskModal(false);
    setActiveView('brand_confirm');
    setViewHint(result.extractTaskId);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'workbench':
        return (
          <WorkbenchView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            onOnboardingStart={handleOnboardingStart}
          />
        );
      case 'brand_confirm':
        return (
          <BrandConfirmView
            brandName={onboardingBrand ?? effectiveBrand}
            goal={onboardingGoal}
            initialProfile={{
              website: onboardingClue?.brandUrl ?? onboardingClue?.website ?? '',
              description: onboardingClue?.description ?? '',
              socialLink: onboardingClue?.socialLink ?? '',
            }}
            onBack={() => navigate('workbench')}
            onConfirmed={({ brandName: confirmedBrand, taskId }) => {
              handleBrandChange(confirmedBrand);
              setOnboardingBrand(confirmedBrand);
              navigate('onboarding_console', taskId);
            }}
          />
        );
      case 'onboarding_console':
        return (
          <OnboardingConsoleView
            brandName={onboardingBrand ?? effectiveBrand}
            taskId={viewHint}
            onNavigate={navigate}
          />
        );
      case 'indexing_rank':
        return (
          <IndexingRankView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
          />
        );
      case 'create_order':
      case 'content_publish':
      case 'delivery_plan':
        return (
          <CreateOrderView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            initialMode={createOrderModeFromHint(viewHint)}
            initialGeoReportId={parseGeoReportIdFromHint(viewHint) ?? parseGeoReportIdFromUrl() ?? undefined}
            viewHint={viewHint}
            onNavigate={navigate}
          />
        );
      case 'self_account_publish':
      case 'publish_schedule':
        return (
          <SelfAccountPublishView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
          />
        );
      case 'publish_records':
        return (
          <GeoProjectLibraryShell
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            initialSection="publish_records"
          />
        );
      case 'generate_article':
        return (
          <GenerateArticleView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            onTaskStatusChange={setHeaderTaskStatus}
            initialMode={viewHint === 'quick' ? 'quick' : undefined}
            indexingGapHint={viewHint?.startsWith('index:') ? viewHint : undefined}
            audience="publisher"
            onNavigate={navigate}
          />
        );
      case 'geo_analysis':
        return (
          <GeoAnalysisView
            brandName={brandName === '__all__' ? effectiveBrand : brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
          />
        );
      case 'create_website':
        return (
          <CreateWebsiteView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
          />
        );
      case 'order_delivery': {
        const od = resolveOrderDeliveryProps(viewHint);
        if (od.taskOrderId) {
          return (
            <TaskOrderDetailView
              orderId={od.taskOrderId}
              onNavigate={navigate}
              onBack={() => navigate('order_delivery', 'task')}
            />
          );
        }
        if (od.websiteReqId) {
          return (
            <WebPageRequirementDetailView
              requirementId={od.websiteReqId}
              onNavigate={navigate}
              onBack={() => navigate('order_delivery', 'website')}
            />
          );
        }
        return (
          <OrderDeliveryView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            initialMainTab={od.mainTab}
            onNavigate={navigate}
          />
        );
      }
      case 'agent_tasks':
        return (
          <AgentTasksView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            initialSelectedTaskId={
              viewHint && !['quick', 'mine'].includes(viewHint) ? viewHint : undefined
            }
          />
        );
      case 'content_library': {
        const hintFromUrl = new URLSearchParams(window.location.search).get('hint') ?? viewHint;
        const contentItemId = parseContentItemIdFromHint(hintFromUrl ?? undefined);
        const publishRecordId = parsePublishRecordIdFromHint(hintFromUrl ?? undefined);
        const projectId = hintFromUrl?.startsWith('project:')
          ? hintFromUrl.slice('project:'.length)
          : undefined;
        if (contentItemId) {
          return (
            <ArticleResultDetailView
              brandName={brandName}
              contentItemId={contentItemId}
              onNavigate={navigate}
            />
          );
        }
        if (publishRecordId) {
          return (
            <PublishRecordDetailView
              brandName={brandName}
              recordId={publishRecordId}
              onNavigate={navigate}
            />
          );
        }
        const section =
          viewHint === 'publish_records' || parseArticleResultSectionFromUrl() === 'publish_records'
            ? 'publish_records'
            : 'articles';
        return (
          <GeoProjectLibraryShell
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            initialProjectId={projectId}
            initialSection={section}
          />
        );
      }
      case 'brand_list':
        return (
          <BrandListView
            onBrandCreated={(name) => {
              handleBrandChange(name);
            }}
            onOpenBrandWorkspace={openBrandWorkspace}
          />
        );
      case 'brand_profile':
      case 'keyword_library':
      case 'knowledge_base':
      case 'asset_library': {
        const centerTab = viewToBrandCenterTabWithHint(
          activeView,
          resolveBrandCenterTabFromUrl()
        );
        return (
          <div key={`${effectiveBrand}-${activeView}`} className="flex h-full min-h-0 flex-col overflow-hidden">
            <BrandCenterView
              brandName={effectiveBrand}
              initialTab={centerTab}
              keywordHint={activeView === 'keyword_library' ? viewHint : undefined}
              onBrandNameChange={handleBrandChange}
              onBackToBrandManagement={() => navigate('brand_list')}
              onNavigate={navigate}
            />
          </div>
        );
      }
      case 'account_binding':
        return (
          <PublishAccountManageView brandName={brandName} onBrandChange={handleBrandChange} />
        );
      case 'account_funds':
      case 'ai_credits':
      case 'budget':
        return <AccountFundsView brandName={effectiveBrand} />;
      case 'notifications':
        return (
          <NotificationsView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
          />
        );
      case 'user_center':
        return <UserCenterView />;
      case 'team_settings':
        return <TeamSettingsView brandName={brandName} />;
      default:
        return (
          <WorkbenchView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <div className="geo-page-shell flex h-screen bg-[var(--color-bg)] antialiased overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={(view, hint) => navigate(view, hint)}
        onNewTaskClick={() => setShowNewTaskModal(true)}
      />

      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        style={{ marginLeft: 'var(--layout-sidebar-width)' }}
      >
        <Header
          activeView={activeView}
          brandName={brandName}
          taskStatus={headerTaskStatus}
          onNavigate={navigate}
          onOpenUserCenter={() => {
            setActiveView('user_center');
            setHeaderTaskStatus(null);
          }}
        />
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ marginTop: 'var(--layout-header-height)' }}
        >
          <main className="flex-1 overflow-hidden flex flex-col">{renderActiveView()}</main>
        </div>
      </div>

      {showNewTaskModal && (
        <QuickStartModal
          brandName={brandName}
          displayBrandName={effectiveBrand}
          needsBrandScope={brandName === '__all__'}
          onClose={() => setShowNewTaskModal(false)}
          onFlowComplete={handleOnboardingStart}
        />
      )}
    </div>
  );
}
