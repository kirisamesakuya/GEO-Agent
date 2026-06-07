import { PLATFORM_APP_NAME, PROVIDER_APP_NAME, PUBLISHER_APP_NAME } from '../../lib/app-branding';

const MODES = [
  { id: 'publisher', label: PUBLISHER_APP_NAME, href: '/' },
  { id: 'provider', label: PROVIDER_APP_NAME, href: '/?app=provider' },
  { id: 'platform', label: PLATFORM_APP_NAME, href: '/?app=platform' },
] as const;

export default function AppModeLinks({ current }: { current: 'publisher' | 'provider' | 'platform' }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 text-[9px] leading-snug">
      {MODES.map((mode) => (
        <a
          key={mode.id}
          href={mode.href}
          className={`max-w-[7.5rem] truncate rounded px-1.5 py-0.5 ${current === mode.id ? 'geo-nav-active font-semibold' : 'geo-nav-item'}`}
          title={mode.label}
        >
          {mode.label}
        </a>
      ))}
    </div>
  );
}
