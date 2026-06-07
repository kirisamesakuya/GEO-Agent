import { useState, useEffect } from 'react';
import type { ViewType } from '../types';
import { PUBLISHER_APP_NAME } from '../lib/app-branding';
import {
  Plus,
  Sparkles,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Building,
  UserCheck,
  Wallet,
  LayoutDashboard,
  Radar,
  ClipboardList,
  Inbox,
  Cpu,
  Package,
  X,
} from 'lucide-react';
import AppModeLinks from './common/AppModeLinks';
import { isCreateOrderView, CUSTOM_PUBLISH_ENABLED } from '../lib/create-order-nav';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType, hint?: string) => void;
  onNewTaskClick: () => void;
  open?: boolean;
  onClose?: () => void;
}

/** 发布端一级导航（见 docs/GEO投放助手_发布端信息架构优化方案.md §3） */
const MAIN_NAV_ITEMS: { view: ViewType; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'workbench', label: '工作台', icon: LayoutDashboard },
  { view: 'brand_list', label: '品牌管理', icon: Building },
  { view: 'geo_analysis', label: 'GEO 分析', icon: BarChart2 },
  { view: 'indexing_rank', label: '排名监控', icon: Radar },
  { view: 'create_order', label: '发布任务', icon: ClipboardList },
  { view: 'content_delivery', label: '内容交付', icon: Package },
  { view: 'agent_task_results', label: '结果中心', icon: Inbox },
];

const ACCOUNT_NAV_ITEMS = [
  { view: 'hermes_console' as ViewType, label: '本机 Hermes', icon: Cpu },
  { view: 'account_binding' as ViewType, label: '发布账号', icon: UserCheck },
  { view: 'account_funds' as ViewType, label: '账户余额', icon: Wallet },
] as const;

function isNavActive(activeView: ViewType, view: ViewType): boolean {
  if (view === 'create_order') return isCreateOrderView(activeView);
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
    return activeView === 'agent_task_results' || activeView === 'agent_task_result' || activeView === 'agent_task_submitted';
  }
  if (view === 'content_delivery') {
    return (
      activeView === 'content_delivery' ||
      activeView === 'content_library' ||
      activeView === 'order_delivery'
    );
  }
  return activeView === view;
}

export default function Sidebar({ activeView, onViewChange, onNewTaskClick, open = false, onClose }: SidebarProps) {
  const [accountNavExpanded, setAccountNavExpanded] = useState(true);
  const [publishNavExpanded, setPublishNavExpanded] = useState(true);
  const [orgName, setOrgName] = useState<string | null>(null);

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
        className="flex items-center gap-2.5 px-5 shrink-0 border-b"
        style={{ height: 'var(--layout-header-height)', borderColor: 'var(--neutral-divider-02)' }}
      >
        <span
          className="grid place-items-center w-8 h-8 rounded-lg text-white text-xs font-bold shrink-0"
          style={{ background: 'var(--color-primary)' }}
        >
          GEO
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--neutral-text-01)' }}>
            {PUBLISHER_APP_NAME}
          </div>
          {orgName && (
            <div className="text-[10px] truncate" style={{ color: 'var(--neutral-text-03)' }}>
              {orgName}
            </div>
          )}
        </div>
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
          快速发起项目
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {MAIN_NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          if (view === 'create_order') {
            const active = isNavActive(activeView, view);
            /* 一期 CUSTOM_PUBLISH_ENABLED=false：隐藏「发布文章 / 网页改装」子入口，仅保留 AI 拆包 */
            if (!CUSTOM_PUBLISH_ENABLED) {
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => onViewChange('create_order', 'ai')}
                  className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm min-h-[38px] ${
                    active ? 'geo-nav-active' : 'geo-nav-item'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            }
            return (
              <div key={view}>
                <button
                  type="button"
                  onClick={() => {
                    setPublishNavExpanded((v) => !v);
                    onViewChange('create_order', 'ai');
                  }}
                  className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm min-h-[38px] ${
                    active ? 'geo-nav-active' : 'geo-nav-item'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {publishNavExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>
                {publishNavExpanded && (
                  <div className="ml-7 mt-1 mb-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => onViewChange('create_order', 'article_writing')}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs geo-nav-item"
                    >
                      发布文章
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewChange('create_order', 'website')}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs geo-nav-item"
                    >
                      发布网页改装
                    </button>
                  </div>
                )}
              </div>
            );
          }
          return (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange(view)}
              className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm min-h-[38px] ${
                isNavActive(activeView, view) ? 'geo-nav-active' : 'geo-nav-item'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}

        <div className="pt-2 pb-1">
          <button
            type="button"
            onClick={() => onViewChange('generate_article', 'quick')}
            className={`geo-sidebar-create ${
              activeView === 'generate_article' ? 'geo-sidebar-create-active' : ''
            }`}
          >
            <span className="geo-sidebar-create-rail" aria-hidden>
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="geo-sidebar-create-body">
              <span className="geo-sidebar-create-title">生成 GEO 文章</span>
              <span className="geo-sidebar-create-desc">AI 撰写与入库</span>
            </span>
          </button>
        </div>

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
