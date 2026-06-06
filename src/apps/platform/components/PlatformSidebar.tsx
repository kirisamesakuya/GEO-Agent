import AppModeLinks from '../../../components/common/AppModeLinks';
import { usePlatformRole, type PlatformRole } from '../../../hooks/usePlatformRole';
import { isPlatformViewEnabled } from '../platform-feature-flags';
import { PLATFORM_NAV_GROUPS, PLATFORM_NAV_ICONS } from '../nav';
import type { PlatformView } from '../types';
import PlatformLogo from './PlatformLogo';

const ROLE_LABELS: Record<PlatformRole, string> = {
  admin: '管理员',
  ops: '运营',
  reviewer: '审核',
  support: '客服',
};

interface Props {
  view: PlatformView;
  onNavigate: (view: PlatformView) => void;
}

export default function PlatformSidebar({ view, onNavigate }: Props) {
  const { role, setRole, can } = usePlatformRole();

  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-[var(--platform-border)] bg-white">
      <div className="flex h-[72px] items-center gap-3 border-b border-[var(--platform-border-subtle)] px-5">
        <PlatformLogo />
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-normal text-[var(--platform-text-title)]">GEO 投放助手</div>
          <div className="mt-0.5 text-xs text-[var(--platform-text-tertiary)]">平台端</div>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {PLATFORM_NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => can(item.id) && isPlatformViewEnabled(item.id));
          if (items.length === 0) return null;
          return (
            <div key={group.id}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--platform-text-tertiary)]">
                {group.label}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = PLATFORM_NAV_ICONS[item.id];
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[var(--platform-primary-bg)] text-[var(--platform-primary)]'
                          : 'text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-subtle)] hover:text-[var(--platform-text-primary)]'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-[var(--platform-primary)]' : 'text-[#607089]'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-[var(--platform-border-subtle)] p-4">
        <label className="block text-[10px] text-[var(--platform-text-tertiary)]">平台角色（演示）</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as PlatformRole)}
          className="w-full rounded-lg border border-[var(--platform-border)] px-2 py-1.5 text-xs"
        >
          {(Object.keys(ROLE_LABELS) as PlatformRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <AppModeLinks current="platform" />
      </div>
    </aside>
  );
}
