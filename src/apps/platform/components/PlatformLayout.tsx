import type { ReactNode } from 'react';
import type { PlatformView } from '../types';
import PlatformHeader from './PlatformHeader';
import PlatformSidebar from './PlatformSidebar';

interface Props {
  view: PlatformView;
  onNavigate: (view: PlatformView) => void;
  drawerOpen?: boolean;
  children: ReactNode;
  drawer?: ReactNode;
}

export default function PlatformLayout({ view, onNavigate, drawerOpen, children, drawer }: Props) {
  return (
    <div className="flex h-screen bg-[var(--platform-bg)] text-[var(--platform-text-title)]">
      <PlatformSidebar view={view} onNavigate={onNavigate} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PlatformHeader view={view} />
        <div className="flex min-h-0 flex-1">
          <div className={`flex-1 overflow-y-auto p-4 lg:p-5 xl:p-6 ${drawerOpen ? 'max-w-[calc(100%-480px)]' : ''}`}>
            {children}
          </div>
          {drawer}
        </div>
      </main>
    </div>
  );
}
