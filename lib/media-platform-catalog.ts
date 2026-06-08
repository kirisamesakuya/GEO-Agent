import {
  MEDIA_PLATFORMS,
  type MediaPlatform,
  type MediaPlatformCategory,
} from './media-platforms';
import { getPlatformVisual, getPlatformVisualByLabel, type PlatformVisual } from './media-platform-visual';

export const MEDIA_PLATFORM_CATALOG_CONFIG_KEY = 'media_platform_catalog';

export interface MediaPlatformCatalogEntry {
  id: string;
  label: string;
  category: MediaPlatformCategory;
  accountPlatform?: string;
  sortOrder: number;
  enabled: boolean;
  abbr: string;
  gradient: string;
  /** 上传的平台 LOGO 图片地址 */
  logoUrl?: string;
}

export const MEDIA_PLATFORM_CATEGORY_LABELS: Record<MediaPlatformCategory, string> = {
  content_publish: '内容发布',
  website: '网站',
  official_media: '官媒',
  ai_search: 'AI 搜索',
};

/** 接单端 / 任务大厅默认可选分类 */
export const LOBBY_PLATFORM_CATEGORIES: MediaPlatformCategory[] = [
  'content_publish',
  'website',
  'official_media',
];

function defaultVisual(platform: MediaPlatform): PlatformVisual {
  return getPlatformVisual(platform.id);
}

export function buildDefaultMediaPlatformCatalog(): MediaPlatformCatalogEntry[] {
  return MEDIA_PLATFORMS.map((platform) => {
    const visual = defaultVisual(platform);
    return {
      id: platform.id,
      label: platform.label,
      category: platform.category,
      accountPlatform: platform.accountPlatform,
      sortOrder: platform.sortOrder,
      enabled: true,
      abbr: visual.abbr,
      gradient: visual.gradient,
    };
  });
}

export function parseMediaPlatformCatalog(raw: string | null | undefined): MediaPlatformCatalogEntry[] {
  if (!raw?.trim()) return buildDefaultMediaPlatformCatalog();
  try {
    const parsed = JSON.parse(raw) as MediaPlatformCatalogEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return buildDefaultMediaPlatformCatalog();
    }
    return mergeMediaPlatformCatalog(parsed);
  } catch {
    return buildDefaultMediaPlatformCatalog();
  }
}

export function mergeMediaPlatformCatalog(
  stored: MediaPlatformCatalogEntry[]
): MediaPlatformCatalogEntry[] {
  const defaults = buildDefaultMediaPlatformCatalog();
  const defaultIds = new Set(defaults.map((entry) => entry.id));
  const byId = new Map(stored.map((entry) => [entry.id, entry]));
  const mergedDefaults = defaults.map((base) => {
    const patch = byId.get(base.id);
    if (!patch) return base;
    return {
      ...base,
      ...patch,
      id: base.id,
      abbr: patch.abbr?.trim() || base.abbr,
      gradient: patch.gradient?.trim() || base.gradient,
      label: patch.label?.trim() || base.label,
    };
  });
  const customOnly = stored
    .filter((entry) => entry.id?.trim() && !defaultIds.has(entry.id))
    .map((entry) => ({
      ...entry,
      label: entry.label?.trim() || entry.id,
      abbr: entry.abbr?.trim() || entry.label?.slice(0, 1) || '·',
      gradient: entry.gradient?.trim() || 'linear-gradient(135deg, #94a3b8, #64748b)',
      enabled: entry.enabled !== false,
      sortOrder: entry.sortOrder ?? 500,
      category: entry.category ?? 'content_publish',
    }));
  return sortCatalogEntries([...mergedDefaults, ...customOnly]);
}

export function slugifyMediaPlatformId(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fff-]/g, '');
  return normalized || `custom_${Date.now()}`;
}

export function createMediaPlatformCatalogEntry(
  input: Pick<MediaPlatformCatalogEntry, 'label'> &
    Partial<Omit<MediaPlatformCatalogEntry, 'label' | 'enabled'>> & { enabled?: boolean }
): MediaPlatformCatalogEntry {
  const label = input.label.trim();
  const visual = getPlatformVisualByLabel(label);
  return {
    id: input.id?.trim() || slugifyMediaPlatformId(label),
    label,
    category: input.category ?? 'content_publish',
    accountPlatform: input.accountPlatform,
    sortOrder: input.sortOrder ?? 500,
    enabled: input.enabled !== false,
    abbr: input.abbr?.trim() || visual.abbr,
    gradient: input.gradient?.trim() || visual.gradient,
    logoUrl: input.logoUrl?.trim() || undefined,
  };
}

export function sortCatalogEntries(entries: MediaPlatformCatalogEntry[]): MediaPlatformCatalogEntry[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'zh-CN'));
}

export function filterCatalogEntries(
  entries: MediaPlatformCatalogEntry[],
  options?: {
    enabledOnly?: boolean;
    categories?: MediaPlatformCategory[];
  }
): MediaPlatformCatalogEntry[] {
  let list = sortCatalogEntries(entries);
  if (options?.enabledOnly) {
    list = list.filter((entry) => entry.enabled);
  }
  if (options?.categories?.length) {
    const set = new Set(options.categories);
    list = list.filter((entry) => set.has(entry.category));
  }
  return list;
}

export function catalogLabels(
  entries: MediaPlatformCatalogEntry[],
  options?: Parameters<typeof filterCatalogEntries>[1]
): string[] {
  return filterCatalogEntries(entries, options).map((entry) => entry.label);
}

export function findCatalogEntryByLabel(
  entries: MediaPlatformCatalogEntry[],
  label: string
): MediaPlatformCatalogEntry | undefined {
  return entries.find((entry) => entry.label === label || entry.accountPlatform === label);
}

export function validateMediaPlatformCatalog(entries: MediaPlatformCatalogEntry[]): string | null {
  if (!entries.length) return '平台列表不能为空';
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.id?.trim()) return '平台 id 不能为空';
    if (ids.has(entry.id)) return `平台 id 重复：${entry.id}`;
    ids.add(entry.id);
    if (!entry.label?.trim()) return `平台 ${entry.id} 名称不能为空`;
    if (entry.label.trim().length > 20) return `平台 ${entry.label} 名称不能超过 20 字`;
    if (!entry.abbr?.trim()) return `平台 ${entry.label} 需配置图标缩写`;
    if (entry.abbr.trim().length > 2) return `平台 ${entry.label} 图标缩写最多 2 字`;
    if (!entry.gradient?.trim()) return `平台 ${entry.label} 需配置图标渐变色`;
  }
  return null;
}
