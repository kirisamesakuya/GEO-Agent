import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppMode, ViewType, AgentTaskStatus } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WorkbenchView from './components/WorkbenchView';
import IndexingRankView from './components/IndexingRankView';
import GenerateArticleView from './components/GenerateArticleView';
import GeoAnalysisView from './components/GeoAnalysisView';
import { HermesSubmitGuardProvider } from './components/hermes/HermesSubmitGuard';
import CreateOrderView from './components/CreateOrderView';
import {
  createOrderModeFromHint,
  CUSTOM_PUBLISH_ENABLED,
  parseCampaignPlanIdFromHint,
  parseGeoReportIdFromHint,
  parseGeoReportIdFromUrl,
  resolveCreateOrderEntry,
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
import AgentTaskResultView from './components/agent/AgentTaskResultView';
import AgentTaskResultsCenterView from './components/agent/AgentTaskResultsCenterView';
import AgentTaskSubmittedView from './components/agent/AgentTaskSubmittedView';
import HermesConsoleView from './components/hermes/HermesConsoleView';
import ContentDeliveryView from './components/ContentDeliveryView';
import {
  contentDeliveryTabFromHint,
  normalizeToContentDelivery,
  parseContentDeliveryTabFromUrl,
} from './lib/content-delivery-nav';
import ArticleResultDetailView from './components/article/ArticleResultDetailView';
import ArticleDeliveryDetailView from './components/delivery/ArticleDeliveryDetailView';
import ArticleDeliveryOrderDetailView from './components/delivery/ArticleDeliveryOrderDetailView';
import PublishRecordDetailView from './components/article/PublishRecordDetailView';
import TaskOrderDetailView from './components/delivery/TaskOrderDetailView';
import WebPageRequirementDetailView from './components/delivery/WebPageRequirementDetailView';
import {
  parseArticleResultSectionFromUrl,
  parseContentItemIdFromHint,
  parsePublishRecordIdFromHint,
} from './lib/article-result-nav';
import {
  articleDeliveryStatusFromHint,
  parseArticleDeliveryDetailHint,
  parseArticleDeliveryOrderHint,
} from './lib/article-delivery-unified';
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
import BrandOnboardingWizard from './components/onboarding/BrandOnboardingWizard';
import { BrandWorkspaceProvider, useBrandWorkspace } from './context/BrandWorkspaceContext';

/**
 * DEMO_ONLY:
 * 当前通过 URL 参数切换商家端、接单端、平台端，仅用于演示。
 *
 * PRODUCTION_TODO:
 * 真实上线应由独立域名或独立前端入口决定端类型。
 */
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
  if (v === 'publish_records') return { view: 'content_delivery', hint: 'publish_records' };
  if (v === 'self_account_publish' && publishTab === 'records') {
    return { view: 'content_delivery', hint: 'publish_records' };
  }
  if (v === 'content_delivery') {
    const hint = params.get('hint') ?? undefined;
    return { view: 'content_delivery', hint };
  }
  if (v === 'content_library') {
    const hint = params.get('hint') ?? undefined;
    if (hint) return { view: 'content_delivery', hint };
    const contentTab = params.get('contentTab');
    if (contentTab === 'publish_records') return { view: 'content_delivery', hint: 'publish_records' };
    return { view: 'content_delivery', hint };
  }
  if (v === 'order_delivery') {
    if (params.get('orderTab') === 'publish_records') {
      return { view: 'content_delivery', hint: 'publish_records' };
    }
    const hint = params.get('hint') ?? undefined;
    return { view: 'content_delivery', hint };
  }
  if (v === 'content_publish' || v === 'create_order') {
    if (v === 'content_publish') {
      const legacy = legacyContentTabToOrderStage(params.get('contentTab'));
      if (legacy) return { view: 'content_delivery', hint: legacy };
    }
    const om = params.get('orderMode');
    if (om === 'custom' || om === 'article' || om === 'manual') {
      const taskHint = params.get('orderTask') ?? (om === 'custom' ? 'article_writing' : undefined);
      return resolveCreateOrderEntry(taskHint ?? undefined);
    }
    const planId = params.get('campaignPlanId');
    if (planId) return { view: 'create_order', hint: `plan:${planId}` };
    const geoReportId = params.get('geoReportId');
    if (geoReportId) return { view: 'create_order', hint: `geo:${geoReportId}` };
    return { view: 'create_order', hint: 'ai' };
  }
  if (v === 'delivery_plan') {
    const planId = params.get('campaignPlanId');
    if (planId) return { view: 'create_order', hint: `plan:${planId}` };
    return { view: 'create_order', hint: 'ai' };
  }
  const allowed: ViewType[] = [
    'workbench', 'keyword_library', 'knowledge_base', 'indexing_rank',
    'asset_library', 'publish_schedule', 'publish_records', 'content_publish',
    'create_order', 'self_account_publish', 'generate_article', 'geo_analysis', 'delivery_plan',
    'create_website', 'content_library', 'content_delivery', 'order_delivery', 'hermes_console', 'agent_task_submitted',
    'agent_task_results', 'agent_tasks', 'agent_task_result', 'brand_list',
    'brand_profile', 'account_binding', 'account_funds', 'user_center', 'team_settings',
    'notifications', 'brand_confirm', 'brand_onboarding', 'onboarding_console',
  ];
  if (v && allowed.includes(v as ViewType)) {
    const hint = params.get('hint') ?? undefined;
    return { view: v as ViewType, hint };
  }
  return { view: 'workbench' };
}

export default function App() {
  const shareReportId = new URLSearchParams(window.location.search).get('shareReport');
  if (shareReportId) {
    return <ShareGeoReportView reportId={shareReportId} />;
  }
  const appMode = resolveAppMode();
  if (appMode === 'provider') return <ProviderApp />;
  if (appMode === 'platform') return <PlatformApp />;
  return (
    <BrandWorkspaceProvider>
      <PublisherMain />
    </BrandWorkspaceProvider>
  );
}

function PublisherMain() {
  const initialRoute = resolveInitialRoute();
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const route = initialRoute;
    if (route.view === 'brand_confirm' || route.view === 'onboarding_console') {
      return 'brand_onboarding';
    }
    return route.view;
  });
  const [viewHint, setViewHint] = useState<string | undefined>(initialRoute.hint);
  const { workspaceBrand: brandName, switchWorkspace } = useBrandWorkspace();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [headerTaskStatus, setHeaderTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navStackRef = useRef<Array<{ view: ViewType; hint?: string }>>([]);
  const skipNavRecordRef = useRef(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleBrandChange = useCallback(
    (name: string) => {
      void switchWorkspace(name);
    },
    [switchWorkspace]
  );

  const openBrandOnboarding = useCallback(
    (hint?: string) => {
      setActiveView('brand_onboarding');
      setViewHint(hint);
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'brand_onboarding');
      if (hint) url.searchParams.set('hint', hint);
      else url.searchParams.delete('hint');
      window.history.pushState({}, '', url);
    },
    []
  );

  const effectiveBrand =
    brandName === '__all__' || isProspectBrandScope(brandName) ? '云杉口腔' : brandName;

  const navigate = (view: ViewType, hint?: string) => {
    if (!skipNavRecordRef.current) {
      navStackRef.current.push({ view: activeView, hint: viewHint });
      if (navStackRef.current.length > 50) navStackRef.current.shift();
    } else {
      skipNavRecordRef.current = false;
    }
    closeSidebar();
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
      targetView = 'content_delivery';
      targetHint = 'publish_records';
    }
    const contentDeliveryNorm = normalizeToContentDelivery(targetView, targetHint);
    if (contentDeliveryNorm) {
      targetView = contentDeliveryNorm.view;
    }
    if (!CUSTOM_PUBLISH_ENABLED && targetView === 'create_order') {
      const resolved = resolveCreateOrderEntry(targetHint);
      targetView = resolved.view;
      targetHint = resolved.hint;
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
      const campaignPlanId = parseCampaignPlanIdFromHint(targetHint);
      if (campaignPlanId) url.searchParams.set('campaignPlanId', campaignPlanId);
      else url.searchParams.delete('campaignPlanId');
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
      } else if (targetHint === 'audit' || targetHint === 'assets' || targetHint === 'quick_start' || targetHint === 'smart_check') {
        url.searchParams.set('geoTab', 'smart_check');
        url.searchParams.delete('reportId');
      } else {
        url.searchParams.set('geoTab', 'smart_check');
        url.searchParams.delete('reportId');
      }
    } else if (targetView === 'content_delivery') {
      url.searchParams.delete('publishTab');
      url.searchParams.delete('geoTab');
      url.searchParams.delete('reportId');
      url.searchParams.delete('contentTab');
      url.searchParams.delete('orderTab');
      url.searchParams.set('deliveryTab', contentDeliveryTabFromHint(targetHint));
      const stageFromHint = articleDeliveryStatusFromHint(targetHint);
      if (stageFromHint && stageFromHint !== 'all') {
        url.searchParams.set('articleStage', stageFromHint);
      } else {
        url.searchParams.delete('articleStage');
      }
      if (stageFromHint) {
        url.searchParams.delete('hint');
      } else if (
        targetHint?.startsWith('content:') ||
        targetHint?.startsWith('publish:') ||
        targetHint?.startsWith('order:') ||
        targetHint?.startsWith('website_req:') ||
        targetHint?.startsWith('project:') ||
        targetHint?.startsWith('delivery:')
      ) {
        url.searchParams.set('hint', targetHint);
      } else if (targetHint && isLikelyOrderId(targetHint)) {
        url.searchParams.set('hint', `order:${targetHint}`);
      } else {
        url.searchParams.delete('hint');
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
      url.searchParams.delete('orderMode');
      url.searchParams.delete('orderTask');
      url.searchParams.delete('geoReportId');
      url.searchParams.delete('campaignPlanId');
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
    } else if (targetHint && !['create_order', 'self_account_publish', 'indexing_rank', 'content_library', 'content_delivery'].includes(targetView)) {
      url.searchParams.set('hint', targetHint);
    } else if (targetView !== 'indexing_rank') {
      url.searchParams.delete('hint');
    }
    window.history.pushState({}, '', url);
  };

  const goBack = () => {
    const prev = navStackRef.current.pop();
    if (prev) {
      skipNavRecordRef.current = true;
      navigate(prev.view, prev.hint);
      return;
    }
    skipNavRecordRef.current = true;
    navigate('agent_task_results');
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

  const renderActiveView = () => {
    switch (activeView) {
      case 'workbench':
        return (
          <WorkbenchView
            brandName={effectiveBrand}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            onStartFirstAudit={() => openBrandOnboarding()}
          />
        );
      case 'brand_onboarding':
      case 'brand_confirm':
      case 'onboarding_console': {
        const resumeConsole =
          activeView === 'onboarding_console' ||
          (activeView === 'brand_onboarding' &&
            Boolean(viewHint && viewHint.length > 8 && !viewHint.startsWith('return:')));
        return (
          <BrandOnboardingWizard
            initialStep={resumeConsole ? 'console' : undefined}
            brandName={resumeConsole ? brandName : undefined}
            taskId={resumeConsole ? viewHint : undefined}
            onWorkspaceSwitch={switchWorkspace}
            onNavigate={navigate}
            onExit={() => navigate('workbench')}
          />
        );
      }
      case 'indexing_rank':
        return (
          <HermesSubmitGuardProvider onNavigate={navigate}>
            <IndexingRankView
              brandName={effectiveBrand}
              onBrandChange={handleBrandChange}
              onNavigate={navigate}
            />
          </HermesSubmitGuardProvider>
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
          <ContentDeliveryView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            initialTab="article"
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
      case 'order_delivery':
      case 'content_delivery': {
        const hintFromUrl = new URLSearchParams(window.location.search).get('hint') ?? viewHint;
        const deliveryDetail = parseArticleDeliveryDetailHint(hintFromUrl ?? undefined);
        const contentItemId =
          parseContentItemIdFromHint(hintFromUrl ?? undefined) ??
          (deliveryDetail?.kind === 'content' ? deliveryDetail.id : undefined);
        const publishRecordId = parsePublishRecordIdFromHint(hintFromUrl ?? undefined);
        const deliveryOrderId = parseArticleDeliveryOrderHint(hintFromUrl ?? undefined);
        const taskOrderId =
          deliveryOrderId ?? parseTaskOrderIdFromHint(hintFromUrl ?? undefined);
        const websiteReqId = parseWebsiteRequirementIdFromHint(hintFromUrl ?? undefined);
        const projectId = hintFromUrl?.startsWith('project:')
          ? hintFromUrl.slice('project:'.length)
          : undefined;

        if (deliveryDetail?.kind === 'order' && taskOrderId && activeView === 'content_delivery') {
          return (
            <ArticleDeliveryOrderDetailView orderId={taskOrderId} onNavigate={navigate} />
          );
        }
        if (deliveryDetail?.kind === 'content' && contentItemId) {
          return (
            <ArticleDeliveryDetailView
              brandName={brandName}
              contentItemId={contentItemId}
              onNavigate={navigate}
            />
          );
        }
        if (contentItemId && activeView === 'content_delivery') {
          return (
            <ArticleDeliveryDetailView
              brandName={brandName}
              contentItemId={contentItemId}
              onNavigate={navigate}
            />
          );
        }
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
        if (taskOrderId && activeView === 'content_delivery') {
          return (
            <ArticleDeliveryOrderDetailView orderId={taskOrderId} onNavigate={navigate} />
          );
        }
        if (taskOrderId) {
          return (
            <TaskOrderDetailView
              orderId={taskOrderId}
              onNavigate={navigate}
              onBack={() => navigate('content_delivery')}
            />
          );
        }
        if (websiteReqId) {
          return (
            <WebPageRequirementDetailView
              requirementId={websiteReqId}
              onNavigate={navigate}
              onBack={() => navigate('content_delivery', 'website')}
            />
          );
        }

        const deliveryTab =
          activeView === 'content_delivery'
            ? contentDeliveryTabFromHint(hintFromUrl ?? viewHint) || parseContentDeliveryTabFromUrl()
            : resolveOrderDeliveryProps(viewHint).mainTab === 'website'
              ? 'website'
              : 'article';

        if (activeView === 'order_delivery') {
          return (
            <OrderDeliveryView
              brandName={brandName}
              onBrandChange={handleBrandChange}
              initialMainTab={resolveOrderDeliveryProps(viewHint).mainTab}
              onNavigate={navigate}
            />
          );
        }

        return (
          <ContentDeliveryView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            initialTab={deliveryTab}
            initialProjectId={projectId}
          />
        );
      }
      case 'agent_task_result': {
        const taskId =
          viewHint && !['quick', 'mine'].includes(viewHint) ? viewHint : null;
        if (!taskId) {
          return (
            <div className="geo-page-content p-8 text-sm text-[var(--color-text-secondary)]">
              未指定任务。请从通知中心或任务列表进入。
            </div>
          );
        }
        return (
          <AgentTaskResultView
            taskId={taskId}
            brandName={brandName}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      }
      case 'agent_task_submitted': {
        const taskId = viewHint && !['quick', 'mine'].includes(viewHint) ? viewHint : null;
        if (!taskId) {
          return (
            <div className="geo-page-content p-8 text-sm text-[var(--color-text-secondary)]">
              未指定后台任务。请从结果中心或通知进入。
            </div>
          );
        }
        return <AgentTaskSubmittedView taskId={taskId} onNavigate={navigate} />;
      }
      case 'agent_task_results':
        return (
          <AgentTaskResultsCenterView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            onGoBack={goBack}
            selectedTaskId={viewHint && !['quick', 'mine'].includes(viewHint) ? viewHint : undefined}
          />
        );
      case 'hermes_console':
        return <HermesConsoleView onNavigate={navigate} scrollHint={viewHint} />;
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
        return (
          <ContentDeliveryView
            brandName={brandName}
            onBrandChange={handleBrandChange}
            onNavigate={navigate}
            initialTab="article"
            initialProjectId={projectId}
          />
        );
      }
      case 'brand_list':
        return (
          <BrandListView
            onBrandCreated={(name) => {
              handleBrandChange(name);
            }}
            onStartFirstAudit={() => openBrandOnboarding()}
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
          <BrandCenterView
            key={`${effectiveBrand}-${activeView}`}
            brandName={effectiveBrand}
            initialTab={centerTab}
            keywordHint={activeView === 'keyword_library' ? viewHint : undefined}
            onBrandNameChange={handleBrandChange}
            onBackToBrandManagement={() => navigate('brand_list')}
            onNavigate={navigate}
          />
        );
      }
      case 'account_binding':
        return (
          <PublishAccountManageView brandName={brandName} onBrandChange={handleBrandChange} onNavigate={navigate} />
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
            onStartFirstAudit={() => openBrandOnboarding()}
          />
        );
    }
  };

  return (
    <div className="geo-page-shell flex h-screen bg-[var(--color-bg)] antialiased overflow-hidden">
      <div
        className={`geo-sidebar-backdrop ${sidebarOpen ? 'geo-sidebar-backdrop--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <Sidebar
        activeView={activeView}
        onViewChange={(view, hint) => navigate(view, hint)}
        onNewTaskClick={() => setShowNewTaskModal(true)}
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="geo-layout-main flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          activeView={activeView}
          brandName={brandName}
          taskStatus={headerTaskStatus}
          onNavigate={navigate}
          onOpenUserCenter={() => {
            setActiveView('user_center');
            setHeaderTaskStatus(null);
          }}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <div
          className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0"
          style={{ marginTop: 'var(--layout-header-height)' }}
        >
          <main className="geo-layout-scroll flex-1 min-h-0 min-w-0">{renderActiveView()}</main>
        </div>
      </div>

      {showNewTaskModal && (
        <QuickStartModal
          brandName={brandName}
          onClose={() => setShowNewTaskModal(false)}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}
