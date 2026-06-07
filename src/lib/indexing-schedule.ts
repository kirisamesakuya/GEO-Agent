export type ScheduleFrequency = '' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export const SCHEDULE_FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: '', label: '不自动重复（手动执行）' },
  { value: 'hourly', label: '每小时' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export interface IndexPlanScheduleFields {
  scheduleFrequency?: string | null;
  scheduleRunTime?: string | null;
  scheduleWeekday?: number | null;
  scheduleMonthDay?: number | null;
}

export function formatIndexSchedule(plan: IndexPlanScheduleFields): string {
  const freq = (plan.scheduleFrequency ?? '') as ScheduleFrequency;
  if (!freq) return '手动';
  const time = plan.scheduleRunTime?.trim() || '—';
  if (freq === 'hourly') {
    const minute = time.includes(':') ? time.split(':')[1] : time;
    return `每小时 · ${minute} 分`;
  }
  if (freq === 'daily') return `每天 · ${time}`;
  if (freq === 'weekly') {
    const wd = WEEKDAY_OPTIONS.find((w) => w.value === plan.scheduleWeekday)?.label ?? '—';
    return `每周${wd} · ${time}`;
  }
  if (freq === 'monthly') {
    const day = plan.scheduleMonthDay ?? '—';
    return `每月 ${day} 日 · ${time}`;
  }
  return '—';
}

export function defaultScheduleRunTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 收录查询计划状态（存储值 → 展示文案） */
export const INDEX_PLAN_STATUS_LABELS: Record<string, string> = {
  draft: '待执行',
  running: '执行中',
  done: '已完成',
  failed: '失败',
};

export function formatIndexPlanStatus(status: string): string {
  return INDEX_PLAN_STATUS_LABELS[status] ?? status;
}
