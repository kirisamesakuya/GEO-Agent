export {
  CONTENT_LIBRARY_PLATFORM_ORDER,
  CONTENT_PUBLISH_PLATFORM_LABELS,
  accountPlatformToContentFilter,
  contentLibraryFilterLabel,
  platformMatches,
} from '../../lib/media-platforms';

import {
  CONTENT_LIBRARY_PLATFORM_ORDER,
  accountPlatformToContentFilter,
  contentLibraryFilterLabel,
} from '../../lib/media-platforms';

export type PlatformFilterOption = { value: string; label: string };

/**
 * 根据本机发布账号（及已有批次）生成侧栏平台筛选，保证含大风网、一点号等配置平台。
 */
export function buildContentLibraryPlatformFilters(input: {
  accounts: Array<{ platform: string }>;
  batches?: Array<{ platform: string }>;
}): PlatformFilterOption[] {
  const values = new Set<string>();
  for (const a of input.accounts) {
    const v = accountPlatformToContentFilter(a.platform);
    if (v && v !== '任务接单端') values.add(v);
  }
  for (const b of input.batches ?? []) {
    if (b.platform) values.add(accountPlatformToContentFilter(b.platform));
  }

  const ordered =
    values.size > 0
      ? CONTENT_LIBRARY_PLATFORM_ORDER.filter((p) => values.has(p))
      : [...CONTENT_LIBRARY_PLATFORM_ORDER];

  return [
    { value: '', label: '全部' },
    ...ordered.map((value) => ({
      value,
      label: contentLibraryFilterLabel(value),
    })),
  ];
}
