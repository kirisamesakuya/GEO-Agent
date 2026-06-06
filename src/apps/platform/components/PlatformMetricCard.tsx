import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  color: string;
  danger?: boolean;
}

export default function PlatformMetricCard({ label, value, delta, icon: Icon, color, danger }: Props) {
  const deltaDown = delta?.startsWith('▼');
  const deltaClass = danger
    ? deltaDown ? 'text-[var(--platform-success)]' : 'text-[var(--platform-danger)]'
    : deltaDown ? 'text-[var(--platform-danger)]' : 'text-[var(--platform-success)]';

  return (
    <section className="platform-card px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-sm sm:h-11 sm:w-11" style={{ background: color }}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--platform-text-primary)] sm:text-sm">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-normal text-[var(--platform-text-title)] sm:mt-2 sm:text-2xl lg:text-[26px]">{value}</p>
          {delta && (
            <p className="mt-1 text-[10px] text-[var(--platform-text-tertiary)] sm:mt-2 sm:text-xs">
              较上期
              <span className={`ml-1.5 font-semibold sm:ml-2 ${deltaClass}`}>
                {delta}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
