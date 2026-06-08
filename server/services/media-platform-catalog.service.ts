import { prisma } from '../db/client.js';
import {
  LOBBY_PLATFORM_CATEGORIES,
  MEDIA_PLATFORM_CATALOG_CONFIG_KEY,
  buildDefaultMediaPlatformCatalog,
  catalogLabels,
  filterCatalogEntries,
  mergeMediaPlatformCatalog,
  parseMediaPlatformCatalog,
  sortCatalogEntries,
  validateMediaPlatformCatalog,
  type MediaPlatformCatalogEntry,
  type MediaPlatformCategory,
} from '../../lib/media-platform-catalog.js';
import { upsertSystemConfig } from './platform.service.js';

let cachedCatalog: MediaPlatformCatalogEntry[] | null = null;

export function invalidateMediaPlatformCatalogCache() {
  cachedCatalog = null;
}

async function readCatalogFromDb(): Promise<MediaPlatformCatalogEntry[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: MEDIA_PLATFORM_CATALOG_CONFIG_KEY },
  });
  return parseMediaPlatformCatalog(row?.value);
}

export async function getMediaPlatformCatalog(): Promise<MediaPlatformCatalogEntry[]> {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = await readCatalogFromDb();
  return cachedCatalog;
}

export async function saveMediaPlatformCatalog(
  entries: MediaPlatformCatalogEntry[],
  reason?: string
): Promise<MediaPlatformCatalogEntry[]> {
  const merged = mergeMediaPlatformCatalog(entries);
  const error = validateMediaPlatformCatalog(merged);
  if (error) throw new Error(error);

  const serialized = JSON.stringify(sortCatalogEntries(merged));
  await upsertSystemConfig(
    MEDIA_PLATFORM_CATALOG_CONFIG_KEY,
    serialized,
    reason ?? '更新媒体平台字典'
  );
  cachedCatalog = merged;
  return merged;
}

export async function listMediaPlatformCatalog(options?: {
  enabledOnly?: boolean;
  categories?: MediaPlatformCategory[];
}): Promise<MediaPlatformCatalogEntry[]> {
  const catalog = await getMediaPlatformCatalog();
  return filterCatalogEntries(catalog, options);
}

export async function getLobbyPlatformLabels(): Promise<string[]> {
  const catalog = await getMediaPlatformCatalog();
  return catalogLabels(catalog, {
    enabledOnly: true,
    categories: LOBBY_PLATFORM_CATEGORIES,
  });
}

export async function getContentPublishPlatformLabels(): Promise<string[]> {
  const catalog = await getMediaPlatformCatalog();
  return catalogLabels(catalog, {
    enabledOnly: true,
    categories: ['content_publish'],
  });
}

export async function resetMediaPlatformCatalog(reason?: string) {
  const defaults = buildDefaultMediaPlatformCatalog();
  return saveMediaPlatformCatalog(defaults, reason ?? '恢复媒体平台默认字典');
}
