import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { findMediaPlatformByLabel } from '../../../lib/media-platforms';
import {
  ARTICLE_PLATFORM_ALL_LABELS,
  ARTICLE_PLATFORM_FEATURED_LABELS,
  getPlatformVisual,
  getPlatformVisualByLabel,
  isFeaturedArticlePlatform,
} from '../../lib/media-platform-visual';

interface Props {
  value: string;
  onChange: (label: string) => void;
}

function PlatformIcon({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  const visual = getPlatformVisualByLabel(label);
  const dim = size === 'md' ? 'w-6 h-6 text-[11px]' : 'w-5 h-5 text-[10px]';
  return (
    <span
      className={`inline-flex shrink-0 rounded items-center justify-center font-bold text-white ${dim}`}
      style={{ background: visual.gradient }}
      aria-hidden
    >
      {visual.abbr}
    </span>
  );
}

function PlatformChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium transition ${
        selected
          ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'bg-white border-[var(--neutral-divider-02)] text-[var(--neutral-text-02)] hover:bg-[var(--neutral-bg-03)]'
      }`}
    >
      <PlatformIcon label={label} />
      {label}
    </button>
  );
}

export default function ArticlePlatformPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const showSelectedExtra = value && !isFeaturedArticlePlatform(value);

  const pick = (label: string) => {
    onChange(label);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {ARTICLE_PLATFORM_FEATURED_LABELS.map((label) => (
          <PlatformChip
            key={label}
            label={label}
            selected={value === label}
            onClick={() => pick(label)}
          />
        ))}

        {showSelectedExtra && (
          <PlatformChip label={value} selected onClick={() => setOpen(true)} />
        )}

        <button
          type="button"
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border font-medium transition ${
            open
              ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'bg-white border-[var(--neutral-divider-02)] text-[var(--neutral-text-02)] hover:bg-[var(--neutral-bg-03)]'
          }`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          更多
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-2 rounded-lg border bg-white shadow-lg p-3"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
          role="listbox"
          aria-label="选择目标平台"
        >
          <p className="text-[10px] font-medium text-[var(--neutral-text-03)] mb-2 px-0.5">
            全部内容平台
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
            {ARTICLE_PLATFORM_ALL_LABELS.map((label) => {
              const platform = findMediaPlatformByLabel(label);
              const visual = platform ? getPlatformVisual(platform) : getPlatformVisualByLabel(label);
              const selected = value === label;
              return (
                <button
                  key={label}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(label)}
                  className={`flex items-center gap-2 text-left text-xs px-2.5 py-2 rounded-md border transition ${
                    selected
                      ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-transparent hover:bg-[var(--neutral-bg-03)] text-[var(--neutral-text-02)]'
                  }`}
                >
                  <span
                    className="inline-flex w-6 h-6 shrink-0 rounded items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: visual.gradient }}
                  >
                    {visual.abbr}
                  </span>
                  <span className="font-medium truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
