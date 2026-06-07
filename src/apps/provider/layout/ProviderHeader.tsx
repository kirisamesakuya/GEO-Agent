import { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, Menu } from 'lucide-react';
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
  onMenuToggle?: () => void;
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
  onMenuToggle,
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
    <header className="h-16 bg-white border-b border-provider flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-20 gap-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-lg provider-nav-item shrink-0"
            aria-label="打开导航"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 max-w-xl min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-provider-muted w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="provider-input"
              placeholder="搜索任务、品牌或关键词..."
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-block border border-provider-subtle rounded px-1.5 py-0.5 text-[10px] font-mono text-provider-muted bg-white shadow-sm">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6 shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 text-provider-muted hover:text-provider-body rounded-lg hover:bg-provider-hover cursor-pointer transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] provider-card shadow-xl z-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-provider-title">通知中心</span>
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
                  <p className="text-xs text-provider-muted py-4 text-center">暂无通知</p>
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
                          ? 'bg-white hover:bg-provider-hover'
                          : 'bg-brand-light/40 border border-brand-light/20 hover:bg-brand-light/50'
                      }`}
                    >
                      <p className="text-provider-title leading-normal font-medium">{alert.title}</p>
                      <p className="text-provider-secondary mt-0.5 line-clamp-2">{alert.body}</p>
                      <span className="text-[10px] text-provider-muted mt-1 block">
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
          className="flex items-center gap-3 p-1 hover:bg-provider-hover rounded-xl cursor-pointer transition-colors"
        >
          <img
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-provider shrink-0"
            src={avatarUrl || DEFAULT_AVATAR}
          />
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-provider-body flex items-center gap-1">
              {userName || '媒体人'}
              <ChevronDown className="w-3.5 h-3.5 text-provider-muted" />
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
