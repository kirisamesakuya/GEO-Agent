import { Bell, CalendarDays, ChevronDown, Search } from 'lucide-react';
import { PLATFORM_VIEW_LABELS } from '../nav';
import type { PlatformView } from '../types';

interface Props {
  view: PlatformView;
}

export default function PlatformHeader({ view }: Props) {
  const title = view === 'dashboard' ? '平台驾驶舱' : PLATFORM_VIEW_LABELS[view];

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--platform-border)] bg-white px-7">
      <h1 className="text-2xl font-bold tracking-normal text-[var(--platform-text-title)]">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-md border border-[var(--platform-border)] bg-white px-3 text-sm text-[var(--platform-text-primary)]"
        >
          近 7 天
          <CalendarDays className="h-4 w-4 text-[var(--platform-text-tertiary)]" />
        </button>
        <label className="flex h-9 w-[360px] items-center gap-2 rounded-md border border-[var(--platform-border)] bg-white px-3 text-sm text-[var(--platform-text-placeholder)]">
          <span className="sr-only">搜索</span>
          <span className="flex-1">搜索商家 / Agent / 订单 / 内容</span>
          <Search className="h-4 w-4 text-[var(--platform-text-primary)]" />
        </label>
        <button type="button" className="relative grid h-9 w-9 place-items-center rounded-full text-[var(--platform-text-title)] hover:bg-[var(--platform-surface-subtle)]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff4757] px-1 text-[10px] font-bold text-white">12</span>
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--platform-text-primary)]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#667085] text-sm font-bold text-white">A</span>
          admin
          <ChevronDown className="h-4 w-4 text-[var(--platform-text-tertiary)]" />
        </div>
      </div>
    </header>
  );
}
