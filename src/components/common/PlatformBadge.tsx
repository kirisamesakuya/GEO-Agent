import { getPlatformVisualByLabel } from '../../lib/media-platform-visual';
import type { PlatformVisual } from '../../lib/media-platform-visual';
import type { MediaPlatformCatalogEntry } from '../../lib/media-platform-catalog';

export function resolvePlatformVisual(
  label: string,
  catalog?: MediaPlatformCatalogEntry[]
): PlatformVisual {
  const entry = catalog?.find((item) => item.label === label || item.accountPlatform === label);
  if (entry) {
    return { abbr: entry.abbr, gradient: entry.gradient };
  }
  return getPlatformVisualByLabel(label);
}

interface PlatformBadgeProps {
  label: string;
  catalog?: MediaPlatformCatalogEntry[];
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export default function PlatformBadge({
  label,
  catalog,
  size = 'sm',
  showLabel = true,
  className = '',
}: PlatformBadgeProps) {
  if (!label?.trim()) {
    return <span className={`text-xs text-[var(--neutral-text-03)] ${className}`.trim()}>—</span>;
  }

  const entry = catalog?.find((item) => item.label === label || item.accountPlatform === label);
  const logoUrl = entry?.logoUrl?.trim();
  const visual = resolvePlatformVisual(label, catalog);
  const dim = size === 'md' ? 'w-6 h-6 text-[11px]' : 'w-5 h-5 text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`.trim()}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className={`shrink-0 rounded object-cover ${dim}`} />
      ) : (
        <span
          className={`inline-flex shrink-0 rounded items-center justify-center font-bold text-white ${dim}`}
          style={{ background: visual.gradient }}
          aria-hidden
        >
          {visual.abbr}
        </span>
      )}
      {showLabel && <span className="truncate text-xs text-[var(--neutral-text-02)]">{label}</span>}
    </span>
  );
}
