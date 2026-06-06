import { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { DEFAULT_AVATAR } from '../lib/provider-ui';

interface NotificationPreview {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userName: string;
  avatarUrl?: string;
  notifications: NotificationPreview[];
  unreadCount: number;
  onNavigateToProfile: () => void;
  onNavigateToMessages: () => void;
  onMarkAllRead?: () => void;
}

export default function ProviderHeader({
  searchQuery,
  onSearchChange,
  userName,
  avatarUrl,
  notifications,
  unreadCount,
  onNavigateToProfile,
  onNavigateToMessages,
  onMarkAllRead,
}: Props) {
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

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 relative z-20">
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

      <div className="flex items-center gap-6 ml-6">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-gray-900">通知中心</span>
                <button
                  type="button"
                  onClick={() => {
                    onMarkAllRead?.();
                    setShowNotifications(false);
                  }}
                  className="text-xs text-brand hover:underline font-semibold cursor-pointer"
                >
                  全部已读
                </button>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">暂无通知</p>
                ) : (
                  notifications.slice(0, 5).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigateToMessages();
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        alert.read
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-brand-light/40 border border-brand-light/20 hover:bg-brand-light/50'
                      }`}
                    >
                      <p className="text-gray-800 leading-normal font-medium">{alert.title}</p>
                      <p className="text-gray-500 mt-0.5 line-clamp-2">{alert.body}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(alert.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                className="w-full mt-3 text-xs text-brand font-semibold hover:underline"
                onClick={() => {
                  setShowNotifications(false);
                  onNavigateToMessages();
                }}
              >
                查看全部消息
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onNavigateToProfile}
          className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
        >
          <img
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
            src={avatarUrl || DEFAULT_AVATAR}
          />
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
              {userName || '媒体人'}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
