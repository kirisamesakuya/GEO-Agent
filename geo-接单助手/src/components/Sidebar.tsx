/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Target, FileText, Users, Wallet, Bell, Crown, Hexagon } from 'lucide-react';
import { PageId } from '../types';

interface SidebarProps {
  currentTab: PageId;
  onTabChange: (tab: PageId) => void;
  userScore: number;
  onUpgrade: () => void;
}

export default function Sidebar({ currentTab, onTabChange, userScore, onUpgrade }: SidebarProps) {
  const navItems = [
    { id: 'home' as PageId, label: '首页', icon: Home },
    { id: 'tasks' as PageId, label: '任务大厅', icon: Target },
    { id: 'orders' as PageId, label: '我的订单', icon: FileText },
    { id: 'accounts' as PageId, label: '资源账号', icon: Users },
    { id: 'earnings' as PageId, label: '收益中心', icon: Wallet },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between h-full z-10 shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
      <div>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 mb-4 border-b border-gray-50">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('home')}>
            <div className="w-8 h-8 bg-brand rounded flex items-center justify-center text-white font-bold text-lg">
              <Hexagon className="w-5 h-5 fill-current" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">GEO 接单助手</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-medium text-left ${
                  isActive
                    ? 'text-brand bg-brand-light font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => onTabChange('orders')}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer font-medium"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <span>消息</span>
            </div>
            <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              8
            </span>
          </button>
        </nav>
      </div>

      {/* Creator Growth Plan */}
      <div className="p-4">
        <div
          onClick={() => onTabChange('profile')}
          className="bg-orange-50 rounded-2xl p-4 border border-orange-100 relative overflow-hidden cursor-pointer hover:bg-orange-100/50 transition-all text-left"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-200/50 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span className="font-bold text-orange-850 text-xs">创作者成长计划</span>
          </div>
          <p className="text-[10px] text-orange-600/80 mb-3">提升等级，解锁更多权益</p>
          <div className="flex justify-between items-end mb-1">
            <span className="text-[11px] font-bold text-orange-800">Lv.3 创作达人</span>
            <span className="text-[10px] text-orange-500 font-mono">
              {userScore} / 1200
            </span>
          </div>
          <div className="h-1.5 bg-orange-250 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${(userScore / 1200) * 105}%` }}
            ></div>
          </div>
          <button
            id="upgrade-button"
            onClick={(e) => {
              e.stopPropagation(); // Avoid triggering tab change on button click
              onUpgrade();
            }}
            disabled={userScore >= 1200}
            className={`w-full bg-brand text-white text-xs font-semibold py-2 rounded-xl transition-all shadow-sm ${
              userScore >= 1200
                ? 'opacity-65 cursor-not-allowed bg-gray-400 shadow-none'
                : 'hover:bg-brand-hover shadow-brand/20 active:scale-98 cursor-pointer'
            }`}
          >
            {userScore >= 1200 ? '已达到最高级' : '去升级'}
          </button>
        </div>
      </div>
    </aside>
  );
}
