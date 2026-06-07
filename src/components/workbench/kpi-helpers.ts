export interface TrendPoint {
  date: string;
  count: number;
}

export interface WeekCompare {
  current: number;
  previous: number;
  delta: number;
  pct: number | null;
}

export function sumRange(points: TrendPoint[], start: number, end: number): number {
  return points.slice(start, end).reduce((s, p) => s + p.count, 0);
}

/** 近 7 天 vs 再前 7 天 */
export function weekOverWeek(points: TrendPoint[]): WeekCompare | null {
  if (points.length < 14) return null;
  const current = sumRange(points, points.length - 7, points.length);
  const previous = sumRange(points, points.length - 14, points.length - 7);
  const delta = current - previous;
  const pct = previous === 0 ? (current > 0 ? 100 : current === 0 ? 0 : null) : Math.round((delta / previous) * 100);
  return { current, previous, delta, pct };
}

export function formatWeekDelta(compare: WeekCompare | null): string | null {
  if (!compare) return null;
  if (compare.pct === null) return null;
  const sign = compare.delta >= 0 ? '+' : '';
  if (compare.previous === 0 && compare.current > 0) return `近7天 ${sign}${compare.current}`;
  return `近7天 ${sign}${compare.pct}%`;
}

export function formatDayDelta(today: number, yesterday: number): string | null {
  if (yesterday === 0 && today === 0) return null;
  if (yesterday === 0) return `较昨日 +${today}`;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `较昨日 ${sign}${pct}%`;
}
