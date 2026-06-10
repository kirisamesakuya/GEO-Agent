import type { ViewType } from '../types';
import PublishScheduleView from './PublishScheduleView';

export type SelfAccountPublishTab = 'schedule';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  initialTab?: SelfAccountPublishTab;
}

export default function SelfAccountPublishView({ brandName, onBrandChange }: Props) {
  return (
    <div className="flex min-h-0 flex-col">
      <div
        className="shrink-0 px-6 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
      >
        <h2 className="text-sm font-bold text-[var(--color-title)]">自有账号发布</h2>
      </div>
      <div className="flex flex-col min-w-0">
        <PublishScheduleView brandName={brandName} onBrandChange={onBrandChange} />
      </div>
    </div>
  );
}

export function selfAccountPublishTabFromHint(_hint?: string): SelfAccountPublishTab {
  return 'schedule';
}

export function isSelfAccountPublishView(view: ViewType): boolean {
  return (
    view === 'self_account_publish' ||
    view === 'publish_schedule' ||
    view === 'publish_records'
  );
}
