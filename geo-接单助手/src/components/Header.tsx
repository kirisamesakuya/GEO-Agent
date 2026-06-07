/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, Sparkles } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userScore: number;
  userName: string;
  avatarUrl: string;
  onNavigateToProfile: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  userScore,
  userName,
  avatarUrl,
  onNavigateToProfile,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const alerts = [
    { id: 1, text: '🎉 恭喜！您获得了青岚咖啡的合作邀约！', time: '10分钟前', read: false },
    { id: 2, text: '💬 品牌方「青岚咖啡」给您发了一条新消息', time: '1小时前', read: false },
    { id: 3, text: '💰 订单「官网内容优化任务」结算收益已到账可提现', time: '1天前', read: true },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 relative z-20">
      {/* Search Input */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-12 py-2 bg-gray-50 border-transparent rounded-xl text-sm focus:border-gray-200 focus:bg-white focus:ring-0 transition-all outline-none"
            placeholder="搜索任务、品牌或关键词..."
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-block border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white shadow-sm">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 ml-6">
        {/* Notifications Icon with Hover Card */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white animate-pulse"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-gray-900">通知中心</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-brand hover:underline font-semibold cursor-pointer"
                >
                  全部忽略
                </button>
              </div>
              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                      alert.read ? 'bg-white hover:bg-gray-50' : 'bg-brand-light/40 border border-brand-light/20 hover:bg-brand-light/50'
                    }`}
                  >
                    <p className="text-gray-800 leading-normal font-medium">{alert.text}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Profile */}
        <div
          onClick={onNavigateToProfile}
          className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
        >
          <div className="relative">
            <img
              alt="User Avatar"
              className="w-8 h-8 rounded-full object-cover border border-gray-100"
              src={avatarUrl}
            />
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] font-black px-1 rounded-sm border border-white leading-tight">
              {userScore >= 1200 ? 'MAX' : 'Lv.3'}
            </div>
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
              {userName}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
