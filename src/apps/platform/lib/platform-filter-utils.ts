/** 按日期（YYYY-MM-DD）判断是否在区间内，含起止日 */
export function matchesDateRange(iso: string | null | undefined, since: string, until: string): boolean {
  if (!since && !until) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (since && day < since) return false;
  if (until && day > until) return false;
  return true;
}

export function emptyDateRange() {
  return { since: '', until: '' };
}

/** 文本包含（忽略大小写），needle 为空则放行 */
export function includesText(haystack: string | null | undefined, needle: string): boolean {
  if (!needle.trim()) return true;
  return (haystack ?? '').toLowerCase().includes(needle.trim().toLowerCase());
}

/** 数字串包含，用于手机号等 */
export function includesDigits(haystack: string | number | null | undefined, needle: string): boolean {
  if (!needle.trim()) return true;
  if (haystack == null) return false;
  return String(haystack).includes(needle.trim());
}
