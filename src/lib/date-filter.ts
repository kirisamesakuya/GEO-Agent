/** 按日期（YYYY-MM-DD）判断是否在区间内，含起止日 */
export function matchesDateRange(iso: string | null | undefined, since: string, until: string): boolean {
  if (!since && !until) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (since && day < since) return false;
  if (until && day > until) return false;
  return true;
}
