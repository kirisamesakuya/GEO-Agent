import { useEffect, useState } from 'react';
import type { ViewType } from '../types';
import { viewToBrandCenterTab, brandCenterTabLabel } from '../lib/brand-center';
import { User } from 'lucide-react';
import TaskStatusPill from './common/TaskStatusPill';
import HermesStatusBadge from './common/HermesStatusBadge';
import PublisherNotificationBell from './common/PublisherNotificationBell';
import type { AgentTaskStatus } from '../types';
import { loadUserProfile, USER_PROFILE_UPDATED_EVENT } from '../lib/user-profile';

interface HeaderProps {
  activeView: ViewType;
  brandName: string;
  taskStatus?: AgentTaskStatus | null;
  onOpenUserCenter?: () => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

const VIEW_TITLES: Record<ViewType, string> = {
  workbench: '工作台',
  keyword_library: '关键词库',
  knowledge_base: '企业知识库',
  indexing_rank: '排名监控',
  asset_library: '图片素材库',
  publish_schedule: '自有账号发布',
  publish_records: '文章结果 · 发布记录',
  content_publish: '发布任务',
  create_order: '发布任务',
  self_account_publish: '自有账号发布',
  generate_article: '生成 GEO 文章',
  geo_analysis: 'GEO 分析',
  delivery_plan: '发布任务',
  create_website: '发布网页改装',
  brand_list: '品牌管理',
  content_library: '生成 GEO 文章 · 文章结果',
  order_delivery: '任务交付',
  agent_tasks: '任务详情',
  brand_profile: '品牌中心 · 基础资料',
  // keyword_library, knowledge_base, asset_library use dynamic titles below
  account_binding: '发布账号管理',
  account_funds: '账户余额',
  ai_credits: '账户余额',
  budget: '账户余额',
  user_center: '个人与团队中心',
  team_settings: '团队权限',
  notifications: '消息通知',
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
  if (activeView === 'content_library') {
    if (hint.startsWith('content:')) return '文章结果 · 文章详情';
    if (hint.startsWith('publish:')) return '文章结果 · 发布详情';
    if (params.get('contentTab') === 'publish_records') return '文章结果 · 发布记录';
  }
  if (activeView === 'order_delivery') {
    if (hint.startsWith('order:')) return '任务交付 · 任务详情';
    if (hint.startsWith('website_req:')) return '任务交付 · 网页需求详情';
    if (params.get('orderTab') === 'website') return '任务交付 · 网页需求';
  }
  return VIEW_TITLES[activeView] ?? activeView;
}

export default function Header({
  activeView,
  brandName,
  taskStatus,
  onOpenUserCenter,
  onNavigate,
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
      className="flex items-center justify-between px-8 shrink-0 fixed top-0 right-0 z-10 border-b backdrop-blur-md"
      style={{
        height: 'var(--layout-header-height)',
        width: 'calc(100% - var(--layout-sidebar-width))',
        borderColor: 'var(--neutral-divider-02)',
        background: 'rgba(255,255,255,0.92)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-bold truncate" style={{ color: 'var(--neutral-text-01)' }}>
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {activeView === 'agent_tasks' && <HermesStatusBadge />}
        {taskStatus ? (
          <TaskStatusPill status={taskStatus} />
        ) : activeView === 'agent_tasks' ? (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
          >
            后台任务详情
          </span>
        ) : activeView === 'generate_article' ? (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
          >
            AI 撰写 · 可入库或自有账号发布
          </span>
        ) : null}

        {onNavigate ? (
          <PublisherNotificationBell brandName={brandName} onNavigate={onNavigate} />
        ) : null}

        <button
          type="button"
          onClick={onOpenUserCenter}
          className={`flex items-center gap-2 pl-3 border-l rounded-lg p-1 geo-nav-item text-left ${
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
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--neutral-text-01)' }}>
              {profile.displayName}
            </span>
            <span className="text-[10px] truncate" style={{ color: 'var(--neutral-text-03)' }}>
              {profile.phone || '未绑定手机'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
