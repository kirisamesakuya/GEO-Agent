import { useEffect, useState } from 'react';
import type { ViewType } from '../types';
import { viewToBrandCenterTab, brandCenterTabLabel } from '../lib/brand-center';
import { User, Menu } from 'lucide-react';
import TaskStatusPill from './common/TaskStatusPill';
import HermesConnectionIndicator from './common/HermesConnectionIndicator';
import HermesStatusBadge from './common/HermesStatusBadge';
import PublisherNotificationBell from './common/PublisherNotificationBell';
import type { AgentTaskStatus } from '../types';
import { loadUserProfile, USER_PROFILE_UPDATED_EVENT } from '../lib/user-profile';
import { CONTENT_DELIVERY_TABS } from '../lib/content-delivery-nav';

interface HeaderProps {
  activeView: ViewType;
  brandName: string;
  taskStatus?: AgentTaskStatus | null;
  onOpenUserCenter?: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  onMenuToggle?: () => void;
}

const VIEW_TITLES: Record<ViewType, string> = {
  workbench: '工作台',
  keyword_library: '关键词库',
  knowledge_base: '企业知识库',
  indexing_rank: 'GEO监控',
  asset_library: '图片素材库',
  publish_schedule: '自有账号发布',
  publish_records: '内容交付 · 发布记录',
  content_publish: '发布任务',
  create_order: '发布任务',
  self_account_publish: '自有账号发布',
  generate_article: '生成 GEO 文章',
  geo_analysis: 'GEO 分析',
  delivery_plan: '发布任务',
  create_website: '发布网页改装',
  brand_list: '品牌管理',
  content_library: '生成 GEO 文章 · 内容交付',
  content_delivery: '内容交付',
  order_delivery: '内容交付',
  hermes_console: '本机 Hermes',
  agent_task_submitted: '后台任务',
  agent_task_results: '任务结果中心',
  agent_tasks: '任务详情',
  agent_task_result: 'Hermes 任务结果',
  brand_profile: '品牌中心 · 基础资料',
  // keyword_library, knowledge_base, asset_library use dynamic titles below
  account_binding: '发布账号管理',
  account_funds: '账户余额',
  ai_credits: '账户余额',
  budget: '账户余额',
  user_center: '个人与团队中心',
  team_settings: '团队权限',
  notifications: '消息通知',
  brand_confirm: '确认品牌资料',
  brand_onboarding: '添加品牌 · 首次体检',
  onboarding_console: 'GEO 检测',
};

function resolvePageTitle(activeView: ViewType): string {
  const params = new URLSearchParams(window.location.search);
  const hint = params.get('hint') ?? '';
  const centerTab = viewToBrandCenterTab(activeView);
  if (centerTab) {
    return `品牌管理 · ${brandCenterTabLabel(centerTab)}`;
  }
  if (activeView === 'geo_analysis') {
    const geoTab = params.get('geoTab');
    if (geoTab === 'history') return 'GEO 分析 · 报告历史';
  }
  if (activeView === 'content_delivery' || activeView === 'content_library' || activeView === 'order_delivery') {
    if (hint.startsWith('delivery:content:')) return '内容交付 · 文章交付 · 详情';
    if (hint.startsWith('delivery:order:')) return '内容交付 · 文章交付 · 任务详情';
    if (hint.startsWith('content:')) return '内容交付 · 文章交付 · 详情';
    if (hint.startsWith('publish:')) return '内容交付 · 发布详情';
    if (hint.startsWith('order:')) return '内容交付 · 文章交付 · 任务详情';
    if (hint.startsWith('website_req:')) return '内容交付 · 网页需求详情';
    const deliveryTab = params.get('deliveryTab');
    const tabMeta = CONTENT_DELIVERY_TABS.find((t) => t.id === deliveryTab);
    if (tabMeta) return `内容交付 · ${tabMeta.label}`;
    if (params.get('contentTab') === 'publish_records') return '内容交付 · 文章交付';
    if (params.get('orderTab') === 'website') return '内容交付 · 网页需求';
    if (params.get('orderTab') === 'task') return '内容交付 · 文章交付';
    if (params.get('deliveryTab') === 'list' || params.get('deliveryTab') === 'manual') {
      return '内容交付 · 文章交付';
    }
  }
  return VIEW_TITLES[activeView] ?? activeView;
}

export default function Header({
  activeView,
  brandName,
  taskStatus,
  onOpenUserCenter,
  onNavigate,
  onMenuToggle,
}: HeaderProps) {
  const [profile, setProfile] = useState(loadUserProfile);
  const pageTitle = resolvePageTitle(activeView);

  useEffect(() => {
    const refresh = () => setProfile(loadUserProfile());
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(USER_PROFILE_UPDATED_EVENT, refresh);
  }, []);

  return (
    <header
      className="geo-layout-header flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 fixed top-0 right-0 z-10 border-b backdrop-blur-md min-w-0"
      style={{
        height: 'var(--layout-header-height)',
        left: 'var(--layout-main-offset)',
        borderColor: 'var(--neutral-divider-02)',
        background: 'rgba(255,255,255,0.92)',
      }}
    >
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-md geo-nav-item shrink-0"
            aria-label="打开导航"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-sm md:text-base font-bold truncate" style={{ color: 'var(--neutral-text-01)' }}>
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {(activeView === 'agent_tasks' || activeView === 'hermes_console') && <HermesStatusBadge />}
        {taskStatus ? (
          <TaskStatusPill status={taskStatus} />
        ) : activeView === 'agent_tasks' ? (
          <span
            className="hidden sm:inline text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
          >
            后台任务详情
          </span>
        ) : activeView === 'generate_article' ? (
          <span
            className="hidden md:inline text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
          >
            AI 撰写 · 可入库或自有账号发布
          </span>
        ) : null}

        <HermesConnectionIndicator onNavigate={onNavigate} />

        {onNavigate ? (
          <PublisherNotificationBell brandName={brandName} onNavigate={onNavigate} />
        ) : null}

        <button
          type="button"
          onClick={onOpenUserCenter}
          className={`flex items-center gap-2 pl-2 md:pl-3 border-l rounded-lg p-1 geo-nav-item text-left ${
            activeView === 'user_center' ? 'ring-1 ring-[var(--color-accent)]' : ''
          }`}
          style={{ borderColor: 'var(--neutral-divider-02)' }}
          title="个人与团队中心"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{ background: 'var(--neutral-text-01)' }}
          >
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--neutral-text-01)' }}>
              {profile.displayName}
            </span>
            <span
              className="text-[10px] truncate"
              style={{ color: profile.phone ? 'var(--neutral-text-03)' : '#d97706' }}
            >
              {profile.phone || '△ 未绑定手机'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
