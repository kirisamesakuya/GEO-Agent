import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export default function PlatformFilterField({ label, children, className }: FieldProps) {
  return (
    <div className={`platform-filter-field ${className ?? ''}`.trim()}>
      <span className="platform-filter-label">{label}</span>
      {children}
    </div>
  );
}

interface DateRangeProps {
  since: string;
  until: string;
  onSinceChange: (value: string) => void;
  onUntilChange: (value: string) => void;
}

export function PlatformFilterDateRange({ since, until, onSinceChange, onUntilChange }: DateRangeProps) {
  return (
    <>
      <PlatformFilterField label="开始日期">
        <input
          type="date"
          value={since}
          onChange={(e) => onSinceChange(e.target.value)}
          className="platform-filter-input"
        />
      </PlatformFilterField>
      <PlatformFilterField label="结束日期">
        <input
          type="date"
          value={until}
          onChange={(e) => onUntilChange(e.target.value)}
          className="platform-filter-input"
        />
      </PlatformFilterField>
    </>
  );
}
