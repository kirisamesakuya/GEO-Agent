import { useState, useEffect, useCallback } from 'react';
import './provider-theme.css';
import type { ProviderPageId, ProviderRecord } from './types';
import ProviderSidebar from './layout/ProviderSidebar';
import ProviderHeader from './layout/ProviderHeader';
import ProviderHomeView from './views/ProviderHomeView';
import ProviderTaskView from './views/ProviderTaskView';
import ProviderOrderView from './views/ProviderOrderView';
import ProviderAccountView from './views/ProviderAccountView';
import ProviderEarningView from './views/ProviderEarningView';
import ProviderProfileView from './views/ProviderProfileView';
import ProviderMessages from './ProviderMessages';
import ProviderQuotesView from './views/ProviderQuotesView';
import ProviderOnboarding from './ProviderOnboarding';
import {
  resolveProviderNotifications,
  markAllNotificationsReadLocal,
  type ProviderNotificationItem,
} from './lib/provider-mock-notifications';
import { isProviderViewEnabled } from './provider-feature-flags';

export default function ProviderApp() {
  const [currentTab, setCurrentTab] = useState<ProviderPageId>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<ProviderNotificationItem[]>([]);
  const [notificationsDemo, setNotificationsDemo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const refreshNotifications = useCallback(() => {
    if (!provider?.id) return;
    fetch(`/api/provider/notifications?providerId=${provider.id}`)
      .then((r) => r.json())
      .then((d) => {
        const resolved = resolveProviderNotifications(d);
        setUnreadMessages(resolved.unreadCount);
        setNotifications(resolved.notifications);
        setNotificationsDemo(resolved.isDemo);
      })
      .catch(() => {
        const resolved = resolveProviderNotifications({});
        setUnreadMessages(resolved.unreadCount);
        setNotifications(resolved.notifications);
        setNotificationsDemo(true);
      });
  }, [provider?.id]);

  useEffect(() => {
    fetch('/api/provider/me')
      .then((r) => {
        if (!r.ok) throw new Error('me failed');
        return r.json();
      })
      .then((d) => {
        if (d.provider) {
          setProvider(d.provider);
          if (d.provider.applicationStatus !== 'approved') {
            setCurrentTab('profile');
          }
        }
      })
      .catch(() => {
        fetch('/api/providers')
          .then((r) => r.json())
          .then((d) => {
            const list = d.providers ?? [];
            const approved = list.find((p: ProviderRecord) => p.applicationStatus === 'approved');
            const first = approved ?? list[0];
            if (first) {
              setProvider(first);
              if (first.applicationStatus !== 'approved') {
                setCurrentTab('profile');
              }
            }
          });
      });
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [provider?.id, currentTab, refreshNotifications]);

  const handleTabChange = (tab: ProviderPageId) => {
    closeSidebar();
    const nextTab = isProviderViewEnabled(tab) ? tab : 'profile';
    setCurrentTab(nextTab);
    if (nextTab !== 'tasks') setActiveTaskId(null);
    if (nextTab !== 'orders') setActiveOrderId(null);
  };

  const approved = provider?.applicationStatus === 'approved';
  const needsOnboarding = Boolean(provider && !approved);

  const markAllRead = async () => {
    if (!provider?.id) return;
    if (notificationsDemo) {
      const next = markAllNotificationsReadLocal(notifications);
      setNotifications(next);
      setUnreadMessages(0);
      return;
    }
    await fetch('/api/provider/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: provider.id }),
    });
    refreshNotifications();
  };

  const renderMain = () => {
    if (!provider) {
      return (
        <div className="max-w-2xl mx-auto">
          <ProviderOnboarding providerId={null} onProviderReady={(id) => {
            fetch(`/api/provider/profile?providerId=${id}`)
              .then((r) => r.json())
              .then((d) => setProvider(d.provider));
          }} />
        </div>
      );
    }

    switch (currentTab) {
      case 'home':
        return (
          <ProviderHomeView
            providerId={provider.id}
            providerName={provider.name}
            searchQuery={searchQuery}
            onNavigate={handleTabChange}
            onSelectTask={(id) => {
              setActiveTaskId(id);
              setCurrentTab('tasks');
            }}
            onSelectOrder={(id) => {
              setActiveOrderId(id);
              setCurrentTab('orders');
            }}
          />
        );
      case 'tasks':
        return (
          <ProviderTaskView
            providerId={provider.id}
            providerName={provider.name}
            approved={approved}
            searchQuery={searchQuery}
            activeTaskId={activeTaskId}
            onSelectTask={setActiveTaskId}
            onNeedOnboarding={() => setCurrentTab('profile')}
            onClaimed={() => setCurrentTab('orders')}
          />
        );
      case 'quotes':
        return (
          <ProviderQuotesView
            providerId={provider.id}
            onSelectOrder={(id) => {
              setActiveOrderId(id);
              setCurrentTab('orders');
            }}
          />
        );
      case 'orders':
        return (
          <ProviderOrderView
            providerId={provider.id}
            searchQuery={searchQuery}
            activeOrderId={activeOrderId}
            onSelectOrder={setActiveOrderId}
          />
        );
      case 'accounts':
        return <ProviderAccountView providerId={provider.id} />;
      case 'earnings':
        return <ProviderEarningView providerId={provider.id} />;
      case 'profile':
        return (
          <ProviderProfileView
            provider={provider}
            providerId={provider.id}
            onProviderReady={(id) => {
              fetch(`/api/provider/profile?providerId=${id}`)
                .then((r) => r.json())
                .then((d) => setProvider(d.provider));
            }}
          />
        );
      case 'messages':
        return <ProviderMessages providerId={provider.id} embedded />;
      default:
        return null;
    }
  };

  return (
    <div className="provider-app flex h-screen w-full bg-provider-page font-sans antialiased overflow-hidden">
      <div
        className={`provider-sidebar-backdrop ${sidebarOpen ? 'provider-sidebar-backdrop--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <ProviderSidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        unreadMessages={unreadMessages}
        needsOnboarding={needsOnboarding}
        onGoOnboarding={() => {
          if (provider) setCurrentTab('profile');
        }}
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="provider-layout-main flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {provider && (
          <ProviderHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            userName={provider.name}
            notifications={notifications}
            unreadCount={unreadMessages}
            onNavigateToProfile={() => handleTabChange('profile')}
            onNavigateToMessages={() => handleTabChange('messages')}
            onMarkAllRead={() => void markAllRead()}
            onMenuToggle={() => setSidebarOpen((v) => !v)}
          />
        )}

        <main className="flex-1 overflow-y-auto provider-page-content scrollbar-hide">
          <div className="max-w-6xl mx-auto pb-12">{renderMain()}</div>
        </main>
      </div>
    </div>
  );
}
