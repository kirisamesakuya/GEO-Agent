import { useCallback, useState, type ReactNode } from 'react';
import type { PlatformView } from '../types';
import PlatformHeader from './PlatformHeader';
import PlatformSidebar from './PlatformSidebar';

interface Props {
  view: PlatformView;
  onNavigate: (view: PlatformView) => void;
  children: ReactNode;
  drawer?: ReactNode;
}

export default function PlatformLayout({ view, onNavigate, children, drawer }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleNavigate = useCallback(
    (next: PlatformView) => {
      closeSidebar();
      onNavigate(next);
    },
    [closeSidebar, onNavigate],
  );

  return (
    <div className="flex h-screen bg-[var(--platform-bg)] text-[var(--platform-text-title)]">
      <div
        className={`platform-sidebar-backdrop ${sidebarOpen ? 'platform-sidebar-backdrop--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <PlatformSidebar view={view} onNavigate={handleNavigate} open={sidebarOpen} onClose={closeSidebar} />

      <main className="platform-layout-main flex min-w-0 flex-1 flex-col overflow-hidden">
        <PlatformHeader view={view} onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-5 xl:p-6">
            {children}
          </div>
          {drawer}
        </div>
      </main>
    </div>
  );
}
