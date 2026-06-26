import { useState, useEffect, type ReactNode } from 'react';
import type { ViewType } from '../types';
import {
  PUBLISHER_APP_BRAND_PREFIX,
  PUBLISHER_APP_NAME,
  PUBLISHER_APP_PRODUCT_NAME,
} from '../lib/app-branding';
import PublisherLogo from './common/PublisherLogo';
import AppBrandMark from './common/AppBrandMark';
import {
  Plus,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Building,
  UserCheck,
  Wallet,
  LayoutDashboard,
  Radar,
  Inbox,
  X,
} from 'lucide-react';
import AppModeLinks from './common/AppModeLinks';
import {
  PUBLISHER_DISPATCH_NAV,
  PUBLISHER_WEBSITE_NAV,
  PUBLISHER_WEBSITE_NAV_SECTION_TITLE,
  PUBLISHER_CONTENT_DELIVERY_NAV,
  PUBLISHER_CONTENT_DELIVERY_SECTION_TITLE,
  isPublisherBusinessNavActive,
  isPublisherContentDeliveryNavActive,
} from '../lib/publisher-business-nav';
import type { ContentDeliveryTab } from '../lib/content-delivery-nav';

interface SidebarProps {
  activeView: ViewType;
  viewHint?: string;
  onViewChange: (view: ViewType, hint?: string) => void;
  onNewTaskClick: () => void;
  open?: boolean;
  onClose?: () => void;
}

const CORE_NAV_ITEMS: { view: ViewType; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'workbench', label: '工作台', icon: LayoutDashboard },
  { view: 'brand_list', label: '品牌管理', icon: Building },
  { view: 'geo_analysis', label: 'GEO 分析', icon: BarChart2 },
  { view: 'indexing_rank', label: 'GEO监控', icon: Radar },
];

const ACCOUNT_NAV_ITEMS = [
  { view: 'account_binding' as ViewType, label: '发布账号', icon: UserCheck },
  { view: 'account_funds' as ViewType, label: '账户余额', icon: Wallet },
] as const;

function isCoreNavActive(activeView: ViewType, view: ViewType): boolean {
  if (view === 'brand_list') {
    return (
      activeView === 'brand_list' ||
      activeView === 'brand_profile' ||
      activeView === 'keyword_library' ||
      activeView === 'knowledge_base' ||
      activeView === 'asset_library'
    );
  }
  if (view === 'agent_task_results') {
    return (
      activeView === 'agent_task_results' ||
      activeView === 'agent_task_result' ||
      activeView === 'agent_task_submitted'
    );
  }
  return activeView === view;
}

function isContentDeliverySectionActive(activeView: ViewType, viewHint?: string): boolean {
  return PUBLISHER_CONTENT_DELIVERY_NAV.some((item) =>
    isPublisherContentDeliveryNavActive(activeView, item.hint as ContentDeliveryTab, viewHint)
  );
}

function isWebsiteSectionActive(activeView: ViewType, viewHint?: string): boolean {
  return PUBLISHER_WEBSITE_NAV.some((item) => isPublisherBusinessNavActive(activeView, item, viewHint));
}

function renderNavButton(
  active: boolean,
  onClick: () => void,
  icon: ReactNode,
  label: string,
  subItem = false
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg min-h-[38px] ${
        subItem ? 'px-3 py-2 text-xs ml-1' : 'px-3 text-sm'
      } ${active ? 'geo-nav-active' : 'geo-nav-item'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function Sidebar({
  activeView,
  viewHint,
  onViewChange,
  onNewTaskClick,
  open = false,
  onClose,
}: SidebarProps) {
  const [accountNavExpanded, setAccountNavExpanded] = useState(true);
  const [websiteNavExpanded, setWebsiteNavExpanded] = useState(true);
  const [contentNavExpanded, setContentNavExpanded] = useState(true);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (isWebsiteSectionActive(activeView, viewHint)) {
      setWebsiteNavExpanded(true);
    }
    if (isContentDeliverySectionActive(activeView, viewHint)) {
      setContentNavExpanded(true);
    }
  }, [activeView, viewHint]);

  useEffect(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((d) => setOrgName(d.organization?.name ?? null))
      .catch(() => {});
  }, []);

  return (
    <aside
      className={`geo-sidebar flex flex-col h-screen fixed left-0 top-0 z-20 shrink-0 border-r ${open ? 'geo-sidebar--open' : ''}`}
      style={{
        background: 'var(--neutral-bg-03)',
        borderColor: 'var(--neutral-divider-02)',
      }}
    >
      <div
        className="flex items-center gap-2 px-4 shrink-0 border-b"
        style={{ height: 'var(--layout-header-height)', borderColor: 'var(--neutral-divider-02)' }}
      >
        <AppBrandMark
          logo={<PublisherLogo size={44} />}
          prefix={PUBLISHER_APP_BRAND_PREFIX}
          productName={PUBLISHER_APP_PRODUCT_NAME}
          fullName={PUBLISHER_APP_NAME}
          subtitle={orgName}
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md geo-nav-item shrink-0"
            aria-label="关闭导航"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 shrink-0 space-y-1">
        <button
          type="button"
          onClick={onNewTaskClick}
          className="w-full geo-btn-primary text-sm font-medium gap-2"
          title="选择功能起点，不会创建单独的项目档案"
        >
          <Plus className="w-4 h-4" />
          快速发起
        </button>
      </div>

      <div className="flex-1 geo-scroll-hide px-3 space-y-0.5">
        {CORE_NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            onClick={() => onViewChange(view)}
            className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm min-h-[38px] ${
              isCoreNavActive(activeView, view) ? 'geo-nav-active' : 'geo-nav-item'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}

        <div className="pt-2 pb-1">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-text-04)]">
            业务发单
          </p>
          {PUBLISHER_DISPATCH_NAV.map((item) => {
            const Icon = item.icon;
            const active = isPublisherBusinessNavActive(activeView, item, viewHint);
            return renderNavButton(
              active,
              () => onViewChange(item.view, item.hint),
              <Icon className="w-4 h-4 shrink-0" />,
              item.label
            );
          })}
        </div>

        <div className="pt-1 pb-1">
          <button
            type="button"
            onClick={() => setWebsiteNavExpanded((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${
              isWebsiteSectionActive(activeView, viewHint)
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--neutral-text-04)]'
            }`}
          >
            <span>{PUBLISHER_WEBSITE_NAV_SECTION_TITLE}</span>
            {websiteNavExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>
          {websiteNavExpanded && (
            <div className="mt-0.5 ml-2 pl-2 border-l border-[var(--neutral-divider-02)] space-y-0.5">
              {PUBLISHER_WEBSITE_NAV.map((item) => {
                const Icon = item.icon;
                const active = isPublisherBusinessNavActive(activeView, item, viewHint);
                return renderNavButton(
                  active,
                  () => onViewChange(item.view, item.hint),
                  <Icon className="w-3.5 h-3.5 shrink-0" />,
                  item.label,
                  true
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-1 pb-1">
          <button
            type="button"
            onClick={() => setContentNavExpanded((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${
              isContentDeliverySectionActive(activeView, viewHint)
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--neutral-text-04)]'
            }`}
          >
            <span>{PUBLISHER_CONTENT_DELIVERY_SECTION_TITLE}</span>
            {contentNavExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>
          {contentNavExpanded && (
            <div className="mt-0.5 ml-2 pl-2 border-l border-[var(--neutral-divider-02)] space-y-0.5">
              {PUBLISHER_CONTENT_DELIVERY_NAV.map((item) => {
                const Icon = item.icon;
                const active = isPublisherContentDeliveryNavActive(
                  activeView,
                  item.hint as ContentDeliveryTab,
                  viewHint
                );
                return renderNavButton(
                  active,
                  () => onViewChange(item.view, item.hint),
                  <Icon className="w-3.5 h-3.5 shrink-0" />,
                  item.label,
                  true
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onViewChange('agent_task_results')}
          className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm min-h-[38px] ${
            isCoreNavActive(activeView, 'agent_task_results') ? 'geo-nav-active' : 'geo-nav-item'
          }`}
        >
          <Inbox className="w-4 h-4 shrink-0" />
          <span>Hermes 日志</span>
        </button>

        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <button
            type="button"
            onClick={() => setAccountNavExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--neutral-text-03)' }}
          >
            <span>账户资金</span>
            <span>{accountNavExpanded ? '−' : '+'}</span>
          </button>
          {accountNavExpanded && (
            <div className="space-y-0.5">
              {ACCOUNT_NAV_ITEMS.map(({ view, label, icon: Icon }) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => onViewChange(view)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                    view === 'account_binding'
                      ? activeView === 'account_binding'
                        ? 'geo-nav-active'
                        : 'geo-nav-item'
                      : activeView === view
                        ? 'geo-nav-active'
                        : 'geo-nav-item'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-4 border-t text-xs shrink-0"
        style={{ borderColor: 'var(--neutral-divider-02)', color: 'var(--neutral-text-03)' }}
      >
        <AppModeLinks current="publisher" />
      </div>
    </aside>
  );
}
