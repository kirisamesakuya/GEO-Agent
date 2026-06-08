import { CalendarDays, ChevronDown, Menu, Search } from 'lucide-react';
import { PLATFORM_VIEW_LABELS } from '../nav';
import type { PlatformView } from '../types';

interface Props {
  view: PlatformView;
  onMenuToggle?: () => void;
}

export default function PlatformHeader({ view, onMenuToggle }: Props) {
  const title = view === 'dashboard' ? '平台驾驶舱' : PLATFORM_VIEW_LABELS[view];

  return (
    <header className="flex h-14 lg:h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[var(--platform-border)] bg-white px-4 lg:px-7 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-[var(--platform-surface-subtle)]"
            aria-label="打开导航"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg lg:text-2xl font-bold tracking-normal truncate text-[var(--platform-text-title)]">{title}</h1>
      </div>
      <div className="flex items-center gap-2 lg:gap-4 shrink-0">
        <button
          type="button"
          className="platform-header-date hidden sm:flex h-9 items-center gap-2 rounded-md border border-[var(--platform-border)] bg-white px-3 text-sm text-[var(--platform-text-primary)]"
        >
          近 7 天
          <CalendarDays className="h-4 w-4 text-[var(--platform-text-tertiary)]" />
        </button>
        <label className="platform-header-search hidden md:flex h-9 w-[360px] items-center gap-2 rounded-md border border-[var(--platform-border)] bg-white px-3 text-sm text-[var(--platform-text-placeholder)]">
          <span className="sr-only">搜索</span>
          <span className="flex-1 truncate">搜索商家 / Agent / 订单 / 内容</span>
          <Search className="h-4 w-4 shrink-0 text-[var(--platform-text-primary)]" />
        </label>
        <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-[var(--platform-text-primary)]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#667085] text-sm font-bold text-white">A</span>
          <span className="hidden md:inline">admin</span>
          <ChevronDown className="h-4 w-4 text-[var(--platform-text-tertiary)]" />
        </div>
      </div>
    </header>
  );
}
