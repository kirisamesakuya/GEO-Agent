import {
  Home,
  Target,
  FileText,
  Users,
  Wallet,
  Bell,
  User,
  Hexagon,
  X,
} from 'lucide-react';
import type { ProviderPageId } from '../types';
import AppModeLinks from '../../../components/common/AppModeLinks';
import { PROVIDER_APP_NAME } from '../../../lib/app-branding';
import { isProviderViewEnabled } from '../provider-feature-flags';

interface Props {
  currentTab: ProviderPageId;
  onTabChange: (tab: ProviderPageId) => void;
  unreadMessages: number;
  needsOnboarding: boolean;
  onGoOnboarding: () => void;
  open?: boolean;
  onClose?: () => void;
}

const MAIN_NAV: { id: ProviderPageId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'tasks', label: '任务大厅', icon: Target },
  { id: 'orders', label: '我的订单', icon: FileText },
  { id: 'accounts', label: '账号资源', icon: Users },
  { id: 'earnings', label: '收益中心', icon: Wallet },
].filter((item) => isProviderViewEnabled(item.id));

export default function ProviderSidebar({
  currentTab,
  onTabChange,
  unreadMessages,
  needsOnboarding,
  onGoOnboarding,
  open = false,
  onClose,
}: Props) {
  return (
    <aside
      className={`provider-sidebar fixed left-0 top-0 z-20 flex flex-col justify-between h-screen shrink-0 bg-white border-r border-provider shadow-[2px_0_8px_rgba(0,0,0,0.02)] ${open ? 'provider-sidebar--open' : ''}`}
    >
      <div>
        <div className="h-16 flex items-center px-4 lg:px-6 mb-4 border-b border-provider">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={() => onTabChange('home')}
          >
            <div className="w-8 h-8 bg-brand rounded flex items-center justify-center text-white font-bold text-lg shrink-0">
              <Hexagon className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xs font-bold leading-tight text-provider-title truncate">{PROVIDER_APP_NAME}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg provider-nav-item shrink-0"
              aria-label="关闭导航"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="px-3 space-y-1">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-medium text-left ${
                  isActive ? 'provider-nav-active' : 'provider-nav-item'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand' : 'text-provider-muted'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onTabChange('messages')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer font-medium ${
              currentTab === 'messages' ? 'provider-nav-active' : 'provider-nav-item'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-provider-muted" />
              <span>消息</span>
            </div>
            {unreadMessages > 0 && (
              <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>
        </nav>

        {needsOnboarding && (
          <div className="px-4 mt-3">
            <button
              type="button"
              onClick={onGoOnboarding}
              className="w-full text-left bg-brand-light border border-brand-light rounded-xl p-3 text-xs text-brand font-semibold hover:bg-orange-50 transition-colors"
            >
              完成入驻审核后可接单 →
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-medium text-left ${
            currentTab === 'profile' ? 'provider-nav-active' : 'provider-nav-item'
          }`}
        >
          <User className={`w-5 h-5 shrink-0 ${currentTab === 'profile' ? 'text-brand' : 'text-provider-muted'}`} />
          <span>个人中心</span>
        </button>
        <div className="text-[10px] text-provider-muted px-1">
          <AppModeLinks current="provider" />
        </div>
      </div>
    </aside>
  );
}
